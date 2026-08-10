import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import yauzl, { Entry } from 'yauzl';

const ALLOWED_EXTENSIONS = new Set(['.heic', '.heif', '.jpeg', '.jpg', '.mov', '.mp4']);
const IMAGE_EXTENSIONS = new Set(['.heic', '.heif', '.jpeg', '.jpg']);
const VIDEO_EXTENSIONS = new Set(['.mov', '.mp4']);
const MAX_ENTRIES = 100;
const MAX_FILE_SIZE = 1024 * 1024 * 1024;
const MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024;
const OUTPUT_FILES = ['photo.png', 'video.mp4'];

interface CacheManifest {
  fingerprint: string;
  width: number;
  height: number;
  imageFormat: string;
  videoFormat: string;
}

export interface LivpBundleContents extends CacheManifest {
  root: string;
  files: string[];
}

export class LivpBundleCache {
  private readonly pending = new Map<string, Promise<LivpBundleContents>>();

  constructor(private readonly cacheRoot: string) {}

  async prepare(sourcePath: string): Promise<LivpBundleContents> {
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
    if (!OUTPUT_FILES.includes(fileName)) throw new Error('Extra file not found');
    const bundle = await this.prepare(sourcePath);
    return path.join(bundle.root, fileName);
  }

  private async prepareCache(sourcePath: string, cacheDir: string, fingerprint: string): Promise<LivpBundleContents> {
    const manifestPath = path.join(cacheDir, 'manifest.json');
    try {
      const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8')) as CacheManifest;
      if (manifest.fingerprint === fingerprint && OUTPUT_FILES.every(file => fs.existsSync(path.join(cacheDir, file)))) {
        return { ...manifest, root: cacheDir, files: [...OUTPUT_FILES] };
      }
    } catch {
      // Cache miss or stale manifest.
    }

    await fs.promises.rm(cacheDir, { recursive: true, force: true });
    await fs.promises.mkdir(cacheDir, { recursive: true });
    const extractedDir = path.join(cacheDir, 'source');
    await fs.promises.mkdir(extractedDir);

    try {
      const files = await extractLivp(sourcePath, extractedDir);
      const image = files.find(file => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
      const video = files.find(file => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()));
      if (!image) throw new Error('LIVP archive has no HEIC or JPEG photo');
      if (!video) throw new Error('LIVP archive has no MOV or MP4 video');

      const imagePath = path.join(extractedDir, image);
      const videoPath = path.join(extractedDir, video);
      const photoPath = path.join(cacheDir, OUTPUT_FILES[0]);
      const metadata = await sharp(imagePath, { limitInputPixels: 268402689 })
        .rotate()
        .png()
        .toFile(photoPath);
      await fs.promises.copyFile(videoPath, path.join(cacheDir, OUTPUT_FILES[1]));

      const manifest: CacheManifest = {
        fingerprint,
        width: metadata.width,
        height: metadata.height,
        imageFormat: path.extname(image).slice(1).toLowerCase(),
        videoFormat: path.extname(video).slice(1).toLowerCase(),
      };
      await fs.promises.writeFile(manifestPath, JSON.stringify(manifest), 'utf8');
      await fs.promises.rm(extractedDir, { recursive: true, force: true });
      return { ...manifest, root: cacheDir, files: [...OUTPUT_FILES] };
    } catch (error) {
      await fs.promises.rm(cacheDir, { recursive: true, force: true });
      throw error;
    }
  }
}

function extractLivp(sourcePath: string, outputDir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(sourcePath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) return reject(openError || new Error('Unable to open LIVP archive'));
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
          if (entries > MAX_ENTRIES) throw new Error(`LIVP archive exceeds ${MAX_ENTRIES} entries`);
          if (/\/$/.test(entry.fileName)) return zipFile.readEntry();
          const extension = path.posix.extname(entry.fileName).toLowerCase();
          if (!ALLOWED_EXTENSIONS.has(extension)) return zipFile.readEntry();
          if (entry.uncompressedSize > MAX_FILE_SIZE) throw new Error(`LIVP entry is too large: ${entry.fileName}`);
          totalSize += entry.uncompressedSize;
          if (totalSize > MAX_TOTAL_SIZE) throw new Error('LIVP extracted size is too large');

          const outputName = `${files.length}${extension}`;
          const target = path.join(outputDir, outputName);
          zipFile.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail(streamError || new Error(`Unable to read ${entry.fileName}`));
            const output = fs.createWriteStream(target, { flags: 'wx' });
            stream.on('error', fail);
            output.on('error', fail);
            output.on('finish', () => {
              files.push(outputName);
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
