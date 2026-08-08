import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yauzl, { Entry, ZipFile } from 'yauzl';

const ALLOWED_EXTENSIONS = new Set(['.atlas', '.json', '.skel', '.png']);
const MAX_ENTRIES = 1000;
const MAX_FILE_SIZE = 256 * 1024 * 1024;
const MAX_TOTAL_SIZE = 512 * 1024 * 1024;

interface BundleManifest {
  fingerprint: string;
  files: string[];
}

export interface SpineBundleContents {
  root: string;
  files: string[];
}

export class SpineBundleCache {
  private readonly pending = new Map<string, Promise<SpineBundleContents>>();

  constructor(private readonly cacheRoot: string) {}

  async prepare(sourcePath: string): Promise<SpineBundleContents> {
    const stat = await fs.promises.stat(sourcePath);
    const fingerprint = `${stat.size}:${stat.mtimeMs}`;
    const key = crypto.createHash('sha256').update(path.resolve(sourcePath)).digest('hex').slice(0, 32);
    const cacheDir = path.join(this.cacheRoot, key);
    const pendingKey = `${key}:${fingerprint}`;
    const active = this.pending.get(pendingKey);
    if (active) return active;

    const task = this.prepareCache(sourcePath, cacheDir, fingerprint).finally(() => {
      this.pending.delete(pendingKey);
    });
    this.pending.set(pendingKey, task);
    return task;
  }

  async resolve(sourcePath: string, fileName: string): Promise<string> {
    const bundle = await this.prepare(sourcePath);
    const normalized = normalizeEntryName(fileName);
    if (!bundle.files.includes(normalized)) throw new Error('Extra file not found');
    const resolved = path.resolve(bundle.root, ...normalized.split('/'));
    if (!isInside(bundle.root, resolved)) throw new Error('Invalid extra file path');
    return resolved;
  }

  private async prepareCache(sourcePath: string, cacheDir: string, fingerprint: string): Promise<SpineBundleContents> {
    const manifestPath = path.join(cacheDir, 'manifest.json');
    try {
      const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8')) as BundleManifest;
      if (manifest.fingerprint === fingerprint && manifest.files.every(file => fs.existsSync(path.join(cacheDir, ...file.split('/'))))) {
        return { root: cacheDir, files: manifest.files };
      }
    } catch {
      // Cache miss or stale manifest.
    }

    await fs.promises.rm(cacheDir, { recursive: true, force: true });
    await fs.promises.mkdir(cacheDir, { recursive: true });
    try {
      const files = await extractZip(sourcePath, cacheDir);
      if (!files.some(file => path.extname(file).toLowerCase() === '.atlas')) throw new Error('Spine bundle has no .atlas file');
      if (!files.some(file => ['.json', '.skel'].includes(path.extname(file).toLowerCase()))) throw new Error('Spine bundle has no .json or .skel file');
      if (!files.some(file => path.extname(file).toLowerCase() === '.png')) throw new Error('Spine bundle has no .png file');
      const manifest: BundleManifest = { fingerprint, files: files.sort() };
      await fs.promises.writeFile(manifestPath, JSON.stringify(manifest), 'utf8');
      return { root: cacheDir, files: manifest.files };
    } catch (error) {
      await fs.promises.rm(cacheDir, { recursive: true, force: true });
      throw error;
    }
  }
}

function extractZip(sourcePath: string, outputDir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(sourcePath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) return reject(openError || new Error('Unable to open Spine bundle'));
      const files: string[] = [];
      let entries = 0;
      let totalSize = 0;
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        zipFile.close();
        reject(error);
      };

      zipFile.on('error', fail);
      zipFile.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(files);
      });
      zipFile.on('entry', (entry: Entry) => {
        try {
          entries += 1;
          if (entries > MAX_ENTRIES) throw new Error(`Spine bundle exceeds ${MAX_ENTRIES} entries`);
          const name = normalizeEntryName(entry.fileName);
          if (/\/$/.test(entry.fileName)) return zipFile.readEntry();
          if (!ALLOWED_EXTENSIONS.has(path.posix.extname(name).toLowerCase())) return zipFile.readEntry();
          if (entry.uncompressedSize > MAX_FILE_SIZE) throw new Error(`Spine bundle entry is too large: ${name}`);
          totalSize += entry.uncompressedSize;
          if (totalSize > MAX_TOTAL_SIZE) throw new Error('Spine bundle extracted size is too large');

          const target = path.resolve(outputDir, ...name.split('/'));
          if (!isInside(outputDir, target)) throw new Error(`Invalid Spine bundle path: ${name}`);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          zipFile.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail(streamError || new Error(`Unable to read ${name}`));
            const output = fs.createWriteStream(target, { flags: 'wx' });
            stream.on('error', fail);
            output.on('error', fail);
            output.on('finish', () => {
              files.push(name);
              zipFile.readEntry();
            });
            stream.pipe(output);
          });
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      });
      zipFile.readEntry();
    });
  });
}

function normalizeEntryName(fileName: string): string {
  if (!fileName || fileName.includes('\0') || /^[a-zA-Z]:/.test(fileName)) throw new Error('Invalid Spine bundle path');
  const normalized = path.posix.normalize(fileName.replace(/\\/g, '/')).replace(/^\.\//, '');
  if (!normalized || normalized === '..' || normalized.startsWith('../') || normalized.startsWith('/')) {
    throw new Error(`Invalid Spine bundle path: ${fileName}`);
  }
  return normalized;
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
