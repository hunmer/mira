import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { LivpBundleCache } from './livpBundle';

const PLUGIN_NAME = 'mira_livp_format';

class MiraLivpFormatPlugin {
  private readonly bundles: LivpBundleCache;
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.bundles = new LivpBundleCache(path.join(inst.server.backend.dataPath, 'temp', 'livp'));
    this.unregisterFormat = pluginManager.registerFileFormat(PLUGIN_NAME, {
      id: PLUGIN_NAME,
      extensions: ['livp'],
      mimeTypes: ['application/x-livp'],
      thumbnailExtensions: ['livp'],
      process: (filePath: string, context: Record<string, any> = {}) => this.processFile(filePath, context),
      thumbnail: (srcPath: string, destPath: string) => this.generateThumbnail(srcPath, destPath),
      getExtraFileList: (filePath: string) => this.getExtraFileList(filePath),
      getExtraFile: (filePath: string, fileName: string) => this.bundles.resolve(filePath, fileName),
      viewers: [{
        viewerId: 'mira-livp',
        title: 'Live Photo 预览',
        icon: 'live_photo',
        entry: 'viewer.html',
        priority: 20,
        getQuery: async (context: any) => ({
          imageUrl: context.getExtraFileUrl('photo.png'),
          videoUrl: context.getExtraFileUrl('video.mp4'),
          fileName: context.file.name || 'Live Photo',
          fileId: context.fileId,
        }),
      }],
    });
    console.log(`[${PLUGIN_NAME}] registered .livp thumbnail and Live Photo viewer`);
  }

  private async processFile(filePath: string, context: Record<string, any>) {
    const bundle = await this.bundles.prepare(filePath);
    const stat = await fs.promises.stat(filePath);
    return {
      format: 'livp',
      size: stat.size,
      width: bundle.width,
      height: bundle.height,
      imageFormat: bundle.imageFormat,
      videoFormat: bundle.videoFormat,
      extraFiles: bundle.files,
      ...context,
    };
  }

  private async generateThumbnail(srcPath: string, destPath: string): Promise<void> {
    const bundle = await this.bundles.prepare(srcPath);
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await sharp(path.join(bundle.root, 'photo.png'))
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(destPath);
  }

  private async getExtraFileList(filePath: string): Promise<string[]> {
    return [...(await this.bundles.prepare(filePath)).files];
  }

  cleanup(): void {
    this.unregisterFormat?.();
    this.unregisterFormat = undefined;
    console.log(`[${PLUGIN_NAME}] cleaned up`);
  }
}

export function init(inst: any) {
  return new MiraLivpFormatPlugin(inst);
}
