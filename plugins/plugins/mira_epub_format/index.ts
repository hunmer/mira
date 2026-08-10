import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import yauzl from 'yauzl';

const FORMAT_ID = 'mira_epub_format';
const EXTRA_FILE = 'book.epub';
const MAX_ENTRIES = 5000;
const MAX_ENTRY_SIZE = 64 * 1024 * 1024;
const MAX_TOTAL_SIZE = 512 * 1024 * 1024;

type Handler = {
  id: string;
  extensions: string[];
  mimeTypes: string[];
  thumbnailExtensions: string[];
  process: (filePath: string, context?: Record<string, any>) => Promise<any>;
  thumbnail: (srcPath: string, destPath: string) => Promise<void>;
  getExtraFileList: (filePath: string) => Promise<string[]>;
  getExtraFile: (filePath: string, fileName: string) => Promise<string>;
  viewers: Array<Record<string, any>>;
};

interface EpubPackage {
  title: string;
  author: string;
  coverPath: string;
}

function safeEntryName(value: string): string {
  if (!value || value.includes('\0')) throw new Error('EPUB contains an invalid ZIP entry name');
  const name = value.replace(/\\/g, '/');
  const normalized = path.posix.normalize(name);
  if (path.posix.isAbsolute(name) || /^[a-z]:/i.test(name) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('EPUB contains an unsafe ZIP entry path');
  }
  return normalized.replace(/^\.\//, '');
}

function readZipEntry(filePath: string, target: string): Promise<Buffer> {
  const wanted = safeEntryName(target);
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true, autoClose: true }, (openError, zip) => {
      if (openError || !zip) return reject(openError || new Error('Unable to open EPUB'));
      let entries = 0;
      let totalSize = 0;
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        zip.close();
        reject(error);
      };
      zip.on('error', fail);
      zip.on('end', () => fail(new Error(`EPUB entry not found: ${wanted}`)));
      zip.on('entry', (entry) => {
        let name: string;
        try {
          name = safeEntryName(entry.fileName);
          entries += 1;
          totalSize += entry.uncompressedSize;
          if (entries > MAX_ENTRIES || entry.uncompressedSize > MAX_ENTRY_SIZE || totalSize > MAX_TOTAL_SIZE) {
            throw new Error('EPUB archive exceeds safety limits');
          }
        } catch (error: any) {
          fail(error);
          return;
        }
        if (name !== wanted) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail(streamError || new Error('Unable to read EPUB entry'));
          const chunks: Buffer[] = [];
          let size = 0;
          stream.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_ENTRY_SIZE) stream.destroy(new Error('EPUB entry exceeds safety limit'));
            else chunks.push(chunk);
          });
          stream.on('error', fail);
          stream.on('end', () => {
            if (settled) return;
            settled = true;
            resolve(Buffer.concat(chunks));
          });
        });
      });
      zip.readEntry();
    });
  });
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tag))) result[match[1].toLowerCase()] = decodeXml(match[3]);
  return result;
}

function decodeXml(value: string): string {
  return value.replace(/&#(x?[0-9a-f]+);|&(amp|lt|gt|quot|apos);/gi, (_all, numeric, named) => {
    if (numeric) return String.fromCodePoint(parseInt(numeric.replace(/^x/i, ''), /^x/i.test(numeric) ? 16 : 10));
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[named.toLowerCase()];
  });
}

function textElement(xml: string, localName: string): string {
  const match = xml.match(new RegExp(`<(?:[\\w-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${localName}>`, 'i'));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, '').trim()) : '';
}

function resolveArchivePath(baseFile: string, href: string): string {
  const value = decodeURIComponent(href.split('#')[0]);
  return safeEntryName(path.posix.join(path.posix.dirname(baseFile), value));
}

async function readPackage(filePath: string): Promise<EpubPackage> {
  const container = (await readZipEntry(filePath, 'META-INF/container.xml')).toString('utf8');
  const rootTag = container.match(/<(?:[\w-]+:)?rootfile\b[^>]*>/i)?.[0];
  const opfPath = rootTag ? attributes(rootTag)['full-path'] : '';
  if (!opfPath) throw new Error('EPUB container has no rootfile');
  const safeOpfPath = safeEntryName(opfPath);
  const opf = (await readZipEntry(filePath, safeOpfPath)).toString('utf8');
  const items = Array.from(opf.matchAll(/<(?:[\w-]+:)?item\b[^>]*>/gi)).map((match) => attributes(match[0]));
  const coverMeta = Array.from(opf.matchAll(/<(?:[\w-]+:)?meta\b[^>]*>/gi))
    .map((match) => attributes(match[0]))
    .find((attrs) => attrs.name?.toLowerCase() === 'cover');
  const cover = items.find((item) => item.properties?.split(/\s+/).includes('cover-image'))
    || items.find((item) => coverMeta?.content && item.id === coverMeta.content);
  return {
    title: textElement(opf, 'title') || 'Untitled',
    author: textElement(opf, 'creator'),
    coverPath: cover?.href ? resolveArchivePath(safeOpfPath, cover.href) : '',
  };
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
}

async function fallbackCover(title: string, author: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><rect width="360" height="480" fill="#f1ede4"/><rect x="24" y="24" width="312" height="432" rx="4" fill="#fff" stroke="#c9c2b6"/><text x="48" y="110" font-family="serif" font-size="30" font-weight="600" fill="#282828">${escapeXml(title.slice(0, 18))}</text><text x="48" y="405" font-family="sans-serif" font-size="20" fill="#666">${escapeXml(author.slice(0, 28))}</text></svg>`;
  return Buffer.from(svg);
}

class MiraEpubFormatPlugin {
  private unregister?: () => void;

  constructor(inst: any) {
    this.unregister = inst.pluginManager.registerFileFormat(FORMAT_ID, {
      id: FORMAT_ID,
      extensions: ['epub'],
      mimeTypes: ['application/epub+zip'],
      thumbnailExtensions: ['epub'],
      process: (filePath: string, context: Record<string, any> = {}) => this.process(filePath, context),
      thumbnail: (srcPath: string, destPath: string) => this.thumbnail(srcPath, destPath),
      getExtraFileList: async () => [EXTRA_FILE],
      getExtraFile: async (filePath: string, fileName: string) => {
        if (fileName !== EXTRA_FILE) throw new Error('Unknown EPUB extra file');
        return filePath;
      },
      viewers: [{
        viewerId: 'mira-epub-reader',
        title: 'EPUB Reader',
        icon: 'menu_book',
        entry: 'viewer.html',
        priority: 10,
        getQuery: (context: any) => ({
          path: context.getExtraFileUrl(EXTRA_FILE),
          fileName: context.file.name || 'EPUB',
          theme: 'LIGHT',
        }),
      }],
    } satisfies Handler);
    console.log(`[${FORMAT_ID}] registered EPUB metadata, thumbnail, and reader`);
  }

  private async process(filePath: string, context: Record<string, any>) {
    const [stat, book] = await Promise.all([fs.promises.stat(filePath), readPackage(filePath)]);
    return { format: 'epub', size: stat.size, title: book.title, author: book.author, hasCover: Boolean(book.coverPath), ...context };
  }

  private async thumbnail(srcPath: string, destPath: string): Promise<void> {
    const book = await readPackage(srcPath);
    let input: Buffer;
    try {
      input = book.coverPath ? await readZipEntry(srcPath, book.coverPath) : await fallbackCover(book.title, book.author);
    } catch {
      input = await fallbackCover(book.title, book.author);
    }
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await sharp(input).rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png().toFile(destPath);
  }

  cleanup() {
    this.unregister?.();
    this.unregister = undefined;
  }
}

export function init(inst: any) {
  return new MiraEpubFormatPlugin(inst);
}
