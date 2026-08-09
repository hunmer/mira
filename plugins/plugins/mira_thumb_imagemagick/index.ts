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

interface FileFormatManager {
  registerFileFormat(pluginName: string, handler: {
    id: string;
    extensions: string[];
    mimeTypes?: string[];
    viewers: Array<{
      viewerId: string;
      title: string;
      icon?: string;
      entry: string;
      priority?: number;
      getQuery: (context: any) => Record<string, unknown>;
    }>;
  }): () => void;
  getPluginDir(name: string): string;
  server: any;
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
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FileFormatManager;

    this.pluginDataDir = path.join(pluginManager.getPluginDir(this.pluginName), 'data');
    if (!fs.existsSync(this.pluginDataDir)) {
      fs.mkdirSync(this.pluginDataDir, { recursive: true });
    }

    this.loadConfig({ enableExts: ['psd'], magickPath: '' });

    this.unregisterFormat = pluginManager.registerFileFormat(this.pluginName, {
      id: 'mira-psd',
      extensions: ['psd', 'psb'],
      mimeTypes: ['image/vnd.adobe.photoshop'],
      viewers: [{
        viewerId: 'mira-psd',
        title: 'PSD 分层预览',
        icon: 'layers',
        entry: 'dist/index.html',
        priority: 10,
        getQuery: ({ file, fileId, fileUrl }) => ({
          fileId,
          psdUrl: fileUrl,
          fileName: file.name || 'PSD',
        }),
      }],
    });

    const backend = pluginManager.server.backend;
    this.thumbnailService = backend.thumbnailService || null;
    if (!this.thumbnailService) {
      console.warn('ThumbImageMagickPlugin: ThumbnailService not found');
      return;
    }

    // 优先级：配置文件 > 环境变量 > PATH 查找
    let magickPath: string = this.configs.magickPath || process.env.MAGICK_PATH || '';

    if (!magickPath) {
      try { magickPath = which.sync('magick'); } catch {
        try {
          const p = which.sync('convert');
          if (process.platform === 'win32' && p.toLowerCase().includes('system32')) {
            console.warn('ThumbImageMagickPlugin: found Windows system convert.exe, not ImageMagick. Set magickPath in config.');
          } else {
            magickPath = p;
          }
        } catch { }
      }
    }
    if (!magickPath || (path.isAbsolute(magickPath) && !fs.existsSync(magickPath))) {
      console.warn('ThumbImageMagickPlugin: ImageMagick not found. Set magickPath in plugin config.json or MAGICK_PATH env.');
      return;
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

  cleanup(): void {
    this.unregisterFormat?.();
    this.unregisterFormat = undefined;
    if (this.generator && this.thumbnailService) {
      this.thumbnailService.unregisterGenerator(this.generator.name);
    }
  }
}

export function init(inst: any) {
  return new ThumbImageMagickPlugin(inst);
}
