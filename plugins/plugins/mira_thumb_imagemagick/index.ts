import { ServerPlugin, ServerPluginManager, ThumbnailService, ThumbnailGenerator } from 'mira-app-server';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import which from 'which';

const SUPPORTED_EXTS = ['psd', 'ai', 'eps', 'svg', 'tiff', 'tif', 'dng', 'raw', 'heic', 'heif'];

class ImageMagickGenerator implements ThumbnailGenerator {
  name = 'imagemagick';
  supportedExtensions: string[];
  private magickPath: string;

  constructor(magickPath: string, enabledExts: string[]) {
    this.magickPath = magickPath;
    this.supportedExtensions = enabledExts;
  }

  async generate(srcPath: string, destPath: string): Promise<void> {
    const thumbDir = path.dirname(destPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    return new Promise<void>((resolve) => {
      const args = [srcPath + '[0]', '-resize', '200x200>', destPath];
      execFile(this.magickPath, args, (err) => {
        if (err) {
          console.error('ImageMagick thumbnail error:', srcPath, err.message);
        }
        resolve();
      });
    });
  }
}

class ThumbImageMagickPlugin extends ServerPlugin {
  private thumbnailService: ThumbnailService | null = null;
  private generator: ImageMagickGenerator | null = null;

  constructor({ pluginManager, server, dbService }: { pluginManager: ServerPluginManager, server: any, dbService: ILibraryServerData }) {
    super('mira_thumb_imagemagick', pluginManager, dbService);

    this.loadConfig({
      enableExts: ['psd'],
    });

    const backend = pluginManager.server.backend;

    // 获取 ThumbnailService
    this.thumbnailService = backend.thumbnailService || null;
    if (!this.thumbnailService) {
      console.warn('ThumbImageMagickPlugin: ThumbnailService not found, skipping');
      return;
    }

    // 检查 ImageMagick
    let magickPath = process.env.MAGICK_PATH || '';
    if (!magickPath) {
      try {
        magickPath = which.sync('magick');
      } catch {
        // fallback to convert (older ImageMagick)
        try {
          magickPath = which.sync('convert');
        } catch {
          console.warn('ThumbImageMagickPlugin: ImageMagick not found. Set MAGICK_PATH or install ImageMagick.');
          return;
        }
      }
    }

    const enabledExts = (this.configs.enableExts as string[]).filter(ext => SUPPORTED_EXTS.includes(ext));
    if (enabledExts.length === 0) {
      console.warn('ThumbImageMagickPlugin: no valid extensions enabled');
      return;
    }

    console.log(`ThumbImageMagickPlugin: ImageMagick at ${magickPath}, extensions: [${enabledExts.join(', ')}]`);
    this.generator = new ImageMagickGenerator(magickPath, enabledExts);
    this.thumbnailService.registerGenerator(this.generator);
  }
}

export function init(inst: any): ThumbImageMagickPlugin {
  return new ThumbImageMagickPlugin(inst);
}
