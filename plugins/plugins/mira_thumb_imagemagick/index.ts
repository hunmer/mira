import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import which from 'which';

const SUPPORTED_EXTS = ['psd', 'ai', 'eps', 'svg', 'tiff', 'tif', 'dng', 'raw', 'heic', 'heif'];

interface ThumbnailGenerator {
  name: string;
  supportedExtensions: string[];
  generate(srcPath: string, destPath: string): Promise<void>;
}

interface ThumbnailService {
  registerGenerator(generator: ThumbnailGenerator): void;
  unregisterGenerator(name: string): void;
}

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
      execFile(this.magickPath, [srcPath + '[0]', '-resize', '200x200>', destPath], (err) => {
        if (err) console.error('ImageMagick thumbnail error:', srcPath, err.message);
        resolve();
      });
    });
  }
}

class ThumbImageMagickPlugin {
  private generator: ImageMagickGenerator | null = null;
  private thumbnailService: ThumbnailService | null = null;
  private configs: Record<string, any> = {};
  private pluginDataDir: string;
  private pluginName = 'mira_thumb_imagemagick';

  constructor(inst: any) {
    const { pluginManager } = inst;

    this.pluginDataDir = path.join(pluginManager.getPluginDir(this.pluginName), 'data');
    if (!fs.existsSync(this.pluginDataDir)) {
      fs.mkdirSync(this.pluginDataDir, { recursive: true });
    }

    this.loadConfig({ enableExts: ['psd'] });

    const backend = pluginManager.server.backend;
    this.thumbnailService = backend.thumbnailService || null;
    if (!this.thumbnailService) {
      console.warn('ThumbImageMagickPlugin: ThumbnailService not found');
      return;
    }

    let magickPath = process.env.MAGICK_PATH || '';
    if (!magickPath) {
      try { magickPath = which.sync('magick'); } catch {
        try { magickPath = which.sync('convert'); } catch {
          console.warn('ThumbImageMagickPlugin: ImageMagick not found. Set MAGICK_PATH or install ImageMagick.');
          return;
        }
      }
    }

    const enabledExts = (this.configs.enableExts as string[]).filter(ext => SUPPORTED_EXTS.includes(ext));
    if (!enabledExts.length) {
      console.warn('ThumbImageMagickPlugin: no valid extensions enabled');
      return;
    }

    console.log(`ThumbImageMagickPlugin: ${magickPath}, extensions: [${enabledExts.join(', ')}]`);
    this.generator = new ImageMagickGenerator(magickPath, enabledExts);
    this.thumbnailService.registerGenerator(this.generator);
  }

  private loadConfig(defaults: Record<string, any>) {
    const file = path.join(this.pluginDataDir, 'config.json');
    let saved: any = null;
    try {
      if (fs.existsSync(file)) saved = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {}
    this.configs = { ...defaults, ...saved };
    if (!saved) this.saveConfig();
  }

  private saveConfig() {
    fs.writeFileSync(path.join(this.pluginDataDir, 'config.json'), JSON.stringify(this.configs, null, 2));
  }
}

export function init(inst: any) {
  return new ThumbImageMagickPlugin(inst);
}
