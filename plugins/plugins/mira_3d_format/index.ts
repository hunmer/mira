import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { NodeIO } from '@gltf-transform/core';

const execFileAsync = promisify(execFile);
const FORMAT_ID = 'mira_3d_format';
const FORMAT_EXTENSIONS = ['glb', 'gltf'];
const THUMBNAIL_EXTENSIONS = ['glb'];

interface ServerFileFormatHandler {
  id: string;
  extensions?: string[];
  mimeTypes?: string[];
  thumbnailExtensions?: string[];
  process?: (filePath: string, context?: Record<string, any>) => Promise<any>;
  thumbnail?: (srcPath: string, destPath: string) => Promise<void>;
}

interface FileFormatManager {
  registerFileFormat(pluginName: string, handler: ServerFileFormatHandler): () => void;
}

interface PluginConfig {
  width: number;
  height: number;
  timeoutMs: number;
  renderCommand?: string;
}

class Mira3DFormatPlugin {
  private readonly pluginName = FORMAT_ID;
  private readonly pluginDataDir: string;
  private readonly config: PluginConfig;
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FileFormatManager & { getPluginDir(name: string): string };
    this.pluginDataDir = path.join(pluginManager.getPluginDir(this.pluginName), 'data');
    fs.mkdirSync(this.pluginDataDir, { recursive: true });
    this.config = this.loadConfig();

    this.unregisterFormat = pluginManager.registerFileFormat(this.pluginName, {
      id: this.pluginName,
      extensions: FORMAT_EXTENSIONS,
      mimeTypes: ['model/gltf-binary', 'model/gltf+json'],
      thumbnailExtensions: THUMBNAIL_EXTENSIONS,
      process: (filePath, context) => this.processFile(filePath, context),
      thumbnail: (srcPath, destPath) => this.generateThumbnail(srcPath, destPath),
    });

    console.log(`[${this.pluginName}] registered GLB/GLTF parser and GLB thumbnail generator`);
  }

  private loadConfig(): PluginConfig {
    const defaults: PluginConfig = { width: 512, height: 512, timeoutMs: 120000 };
    const configPath = path.join(this.pluginDataDir, 'config.json');
    try {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        ...defaults,
        ...saved,
        width: Math.max(64, Math.min(2048, Number(saved.width) || defaults.width)),
        height: Math.max(64, Math.min(2048, Number(saved.height) || defaults.height)),
        timeoutMs: Math.max(5000, Math.min(300000, Number(saved.timeoutMs) || defaults.timeoutMs)),
      };
    } catch {
      fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
      return defaults;
    }
  }

  private async processFile(filePath: string, context: Record<string, any> = {}) {
    const stat = await fs.promises.stat(filePath);
    const io = new NodeIO();
    const document = await io.read(filePath);
    const root: any = document.getRoot();
    const list = (method: string): any[] => typeof root[method] === 'function' ? root[method]() : [];
    const meshes = list('listMeshes');
    const nodes = list('listNodes');
    const materials = list('listMaterials');
    const textures = list('listTextures');
    const animations = list('listAnimations');
    const scenes = list('listScenes');
    const extensionsUsed = list('listExtensionsUsed').map((extension: any) => extension.extensionName || extension.getName?.()).filter(Boolean);

    return {
      format: path.extname(filePath).slice(1).toLowerCase(),
      size: stat.size,
      meshCount: meshes.length,
      nodeCount: nodes.length,
      materialCount: materials.length,
      textureCount: textures.length,
      animationCount: animations.length,
      sceneCount: scenes.length,
      extensionsUsed,
      ...context,
    };
  }

  private async generateThumbnail(srcPath: string, destPath: string): Promise<void> {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const renderer = this.config.renderCommand || this.resolveRenderCommand();
    try {
      await execFileAsync(process.execPath, [renderer, srcPath, destPath, '--width', String(this.config.width), '--height', String(this.config.height)], {
        timeout: this.config.timeoutMs,
        windowsHide: true,
      });
    } catch (error: any) {
      console.error(`[${this.pluginName}] render-glb failed:`, error?.stderr || error?.message || error);
    }
  }

  private resolveRenderCommand(): string {
    try {
      return require.resolve('render-glb');
    } catch (error) {
      throw new Error('render-glb is not installed; run pnpm install in the plugin directory');
    }
  }

  cleanup(): void {
    this.unregisterFormat?.();
    this.unregisterFormat = undefined;
    console.log(`[${this.pluginName}] cleaned up`);
  }
}

export function init(inst: any) {
  return new Mira3DFormatPlugin(inst);
}
