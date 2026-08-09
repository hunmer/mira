import fs from 'fs';
import path from 'path';
import { renderIdleFrame } from './renderIdle';
import { SpineBundleCache, SpineBundleContents } from './spineBundle';

const FORMAT_ID = 'mira_spine_format';
const FORMAT_EXTENSIONS = ['skel', 'spine'];
const THUMBNAIL_EXTENSIONS = ['skel', 'spine'];

interface ServerFileFormatHandler {
  id: string;
  extensions?: string[];
  mimeTypes?: string[];
  thumbnailExtensions?: string[];
  process?: (filePath: string, context?: Record<string, any>) => Promise<any>;
  thumbnail?: (srcPath: string, destPath: string) => Promise<void>;
  getExtraFileList?: (filePath: string, context?: Record<string, any>) => Promise<string[]>;
  getExtraFile?: (filePath: string, fileName: string, context?: Record<string, any>) => Promise<string>;
  viewers?: Array<{
    viewerId: string;
    title: string;
    entry: string;
    priority?: number;
    extensions?: string[];
    getQuery?: (context: any) => Record<string, unknown> | Promise<Record<string, unknown>>;
  }>;
}

interface FileFormatManager {
  registerFileFormat(pluginName: string, handler: ServerFileFormatHandler): () => void;
  getPluginDir(name: string): string;
}

interface PluginConfig {
  /** 优先渲染的动画名（找不到则回退首个动画） */
  animation: string;
  /** 渲染超时（ms） */
  timeoutMs: number;
  /** 缩略图宽高 */
  width: number;
  height: number;
  /** 缩略图背景色（十六进制） */
  background: string;
}

class MiraSpineFormatPlugin {
  private readonly pluginName = FORMAT_ID;
  private readonly pluginDataDir: string;
  private readonly config: PluginConfig;
  private readonly bundles: SpineBundleCache;
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FileFormatManager;
    this.pluginDataDir = path.join(pluginManager.getPluginDir(this.pluginName), 'data');
    fs.mkdirSync(this.pluginDataDir, { recursive: true });
    this.config = this.loadConfig();
    this.bundles = new SpineBundleCache(path.join(inst.server.backend.dataPath, 'temp', 'spine'));

    this.unregisterFormat = pluginManager.registerFileFormat(this.pluginName, {
      id: this.pluginName,
      extensions: FORMAT_EXTENSIONS,
      mimeTypes: ['application/x-spine'],
      thumbnailExtensions: THUMBNAIL_EXTENSIONS,
      viewers: [{
        viewerId: 'mira-spine',
        title: 'Spine 格式预览',
        entry: 'dist/index.html',
        priority: 10,
        extensions: ['spine'],
        getQuery: (context) => this.getPreviewQuery(context),
      }],
      process: (filePath, context) => this.processFile(filePath, context),
      thumbnail: (srcPath, destPath) => this.generateThumbnail(srcPath, destPath),
      getExtraFileList: (filePath) => this.getExtraFileList(filePath),
      getExtraFile: (filePath, fileName) => this.bundles.resolve(filePath, fileName),
    });

    console.log(`[${this.pluginName}] registered .skel/.spine parser and thumbnail generator (spine-canvaskit 4.2+, animation=${this.config.animation})`);
  }

  private loadConfig(): PluginConfig {
    const defaults: PluginConfig = {
      animation: 'idle',
      timeoutMs: 60000,
      width: 512,
      height: 512,
      background: '#eef0f3',
    };
    const configPath = path.join(this.pluginDataDir, 'config.json');
    try {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        ...defaults,
        ...saved,
        animation: String(saved.animation || defaults.animation),
        timeoutMs: Math.max(5000, Math.min(180000, Number(saved.timeoutMs) || defaults.timeoutMs)),
        width: Math.max(64, Math.min(2048, Number(saved.width) || defaults.width)),
        height: Math.max(64, Math.min(2048, Number(saved.height) || defaults.height)),
        background: String(saved.background || defaults.background),
      };
    } catch {
      fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
      return defaults;
    }
  }

  /** 解析 .skel 元数据：版本探测 + 配套文件检查 */
  private async processFile(filePath: string, context: Record<string, any> = {}) {
    const stat = await fs.promises.stat(filePath);
    if (path.extname(filePath).toLowerCase() === '.spine') {
      const bundle = await this.bundles.prepare(filePath);
      return {
        format: 'spine',
        size: stat.size,
        extraFiles: bundle.files,
        hasAtlas: bundle.files.some(file => file.toLowerCase().endsWith('.atlas')),
        hasPng: bundle.files.some(file => file.toLowerCase().endsWith('.png')),
        ...context,
      };
    }
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const atlasPath = path.join(dir, `${base}.atlas`);
    const pngPath = path.join(dir, `${base}.png`);

    const exists = async (p: string) => {
      try {
        await fs.promises.access(p);
        return true;
      } catch {
        return false;
      }
    };

    return {
      format: path.extname(filePath).slice(1).toLowerCase(),
      size: stat.size,
      hasAtlas: await exists(atlasPath),
      hasPng: await exists(pngPath),
      ...context,
    };
  }

  /**
   * 用 spine-canvaskit 渲染 idle 动作首帧 PNG 缩略图。
   *
   * spine-canvaskit 仅支持 Spine 4.2+；3.8 资源会抛错并被 catch（仅记日志，不阻断）。
   * 3.8 资源仍可在客户端 hovercard 实时预览，只是无服务端缩略图。
   *
   * atlas 命名不一定与 .skel 同名（如 spineboy-pro.skel 配 spineboy.atlas），
   * 故在同目录查找：优先同名 .atlas，否则取首个 .atlas。png 由 atlas 内容引用自动加载。
   */
  private async generateThumbnail(srcPath: string, destPath: string): Promise<void> {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    let skeletonPath = srcPath;
    let atlasPath: string | null;
    if (path.extname(srcPath).toLowerCase() === '.spine') {
      try {
        const bundle = await this.bundles.prepare(srcPath);
        skeletonPath = this.findResource(bundle, ['.json', '.skel']) || srcPath;
        atlasPath = this.findResource(bundle, ['.atlas']);
      } catch (error: any) {
        console.error(`[${this.pluginName}] extract bundle failed:`, error?.message || error);
        return;
      }
    } else {
      atlasPath = this.resolveAtlas(srcPath);
    }
    if (!atlasPath) {
      console.warn(`[${this.pluginName}] no .atlas found for ${srcPath}, skip thumbnail`);
      return;
    }

    try {
      await renderIdleFrame(skeletonPath, atlasPath, destPath, {
        animation: this.config.animation,
        width: this.config.width,
        height: this.config.height,
        background: this.config.background,
        timeoutMs: this.config.timeoutMs,
      });
      console.log(`[${this.pluginName}] thumbnail generated: ${destPath} (animation=${this.config.animation})`);
    } catch (error: any) {
      // 失败不阻断（与 mira_3d_format 一致）。3.8 资源会在此报版本不匹配。
      console.error(`[${this.pluginName}] generateThumbnail failed:`, error?.message || error);
    }
  }

  private async getExtraFileList(filePath: string): Promise<string[]> {
    if (path.extname(filePath).toLowerCase() !== '.spine') return [];
    return (await this.bundles.prepare(filePath)).files;
  }

  private async getPreviewQuery(context: any): Promise<Record<string, string>> {
    const files = await this.getExtraFileList(context.filePath);
    const preferredBase = String(context.file.name || '').replace(/\.spine$/i, '').toLowerCase();
    const pick = (extensions: string[]) => {
      const matches = files.filter(name => extensions.some(ext => name.toLowerCase().endsWith(ext)));
      return matches.find(name => path.basename(name, path.extname(name)).toLowerCase() === preferredBase) || matches[0] || '';
    };
    const skeleton = pick(['.json', '.skel']);
    const atlas = pick(['.atlas']);
    const png = pick(['.png']);
    if (!skeleton || !atlas || !png) {
      throw new Error('Spine bundle is missing skeleton, atlas, or PNG resources');
    }
    return {
      skelUrl: context.getExtraFileUrl(skeleton),
      atlasUrl: context.getExtraFileUrl(atlas),
      pngUrl: context.getExtraFileUrl(png),
      fileName: context.file.name || 'Spine',
    };
  }

  private findResource(bundle: SpineBundleContents, extensions: string[]): string | null {
    const file = bundle.files.find(name => extensions.includes(path.extname(name).toLowerCase()));
    return file ? path.join(bundle.root, ...file.split('/')) : null;
  }

  /** 查找 atlas：同名优先，否则同目录首个 .atlas */
  private resolveAtlas(srcPath: string): string | null {
    const dir = path.dirname(srcPath);
    const base = path.basename(srcPath, path.extname(srcPath));
    const sameName = path.join(dir, `${base}.atlas`);
    if (fs.existsSync(sameName)) return sameName;
    try {
      const entries = fs.readdirSync(dir);
      const atlas = entries.find((f) => f.toLowerCase().endsWith('.atlas'));
      return atlas ? path.join(dir, atlas) : null;
    } catch {
      return null;
    }
  }

  cleanup(): void {
    this.unregisterFormat?.();
    this.unregisterFormat = undefined;
    console.log(`[${this.pluginName}] cleaned up`);
  }
}

export function init(inst: any) {
  return new MiraSpineFormatPlugin(inst);
}
