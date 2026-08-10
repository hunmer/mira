import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const FORMAT_ID = 'mira_swf_format';
const SIGNATURES: Record<string, string> = {
  FWS: 'none',
  CWS: 'zlib',
  ZWS: 'lzma',
};
const execFileAsync = promisify(execFile);

interface SwfHeader {
  signature: string;
  compression: string;
  version: number;
  declaredSize: number;
}

async function readSwfHeader(filePath: string): Promise<SwfHeader> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead !== header.length) throw new Error('SWF file is too small');
    const signature = header.subarray(0, 3).toString('ascii');
    const compression = SIGNATURES[signature];
    if (!compression) throw new Error(`Invalid SWF signature: ${signature}`);
    return {
      signature,
      compression,
      version: header[3],
      declaredSize: header.readUInt32LE(4),
    };
  } finally {
    await handle.close();
  }
}

async function renderThumbnail(ffmpegPath: string, srcPath: string, destPath: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  try {
    await execFileAsync(ffmpegPath, [
      '-nostdin', '-y', '-i', srcPath,
      '-frames:v', '1',
      '-vf', 'scale=200:200:force_original_aspect_ratio=decrease',
      '-q:v', '2', destPath,
    ], { windowsHide: true, maxBuffer: 1024 * 1024 * 4 });
  } catch (error: any) {
    await fs.promises.unlink(destPath).catch(() => undefined);
    console.warn(`[${FORMAT_ID}] FFmpeg thumbnail failed:`, error?.message || error);
  }
}

class MiraSwfFormatPlugin {
  private unregister?: () => void;
  private readonly ffmpegPath: string;

  constructor(inst: any) {
    this.ffmpegPath = process.env.FFMPEG_PATH
      || inst.server?.backend?.thumbnailService?.ffmpegPath
      || 'ffmpeg';
    this.unregister = inst.pluginManager.registerFileFormat(FORMAT_ID, {
      id: FORMAT_ID,
      extensions: ['swf'],
      mimeTypes: ['application/x-shockwave-flash', 'application/vnd.adobe.flash.movie'],
      thumbnailExtensions: ['swf'],
      process: (filePath: string, context: Record<string, any> = {}) => this.process(filePath, context),
      thumbnail: (srcPath: string, destPath: string) => renderThumbnail(this.ffmpegPath, srcPath, destPath),
      viewers: [{
        viewerId: 'mira-swf-player',
        title: 'SWF Player',
        icon: 'movie',
        entry: 'viewer.html',
        priority: 10,
        getQuery: ({ file, fileId, fileUrl }: any) => ({
          fileUrl,
          fileName: file.name || 'SWF',
          fileId,
        }),
      }],
    });
    console.log(`[${FORMAT_ID}] registered SWF metadata, FFmpeg thumbnail, and Ruffle viewer`);
  }

  private async process(filePath: string, context: Record<string, any>) {
    const [stat, header] = await Promise.all([
      fs.promises.stat(filePath),
      readSwfHeader(filePath),
    ]);
    return { format: 'swf', size: stat.size, ...header, ...context };
  }

  cleanup(): void {
    this.unregister?.();
    this.unregister = undefined;
  }
}

export function init(inst: any) {
  return new MiraSwfFormatPlugin(inst);
}

export const testables = { readSwfHeader };
