import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const FORMAT_ID = 'mira_spine_format';
const FORMAT_EXTENSIONS = ['skel'];
const THUMBNAIL_EXTENSIONS = ['skel'];

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
  getPluginDir(name: string): string;
}

interface PluginConfig {
  /** 优先渲染的动画名（找不到则回退首个动画） */
  animation: string;
  /** 回退时是否渲染默认动画（不传 -s） */
  fallbackToDefault: boolean;
  /** 渲染超时（ms） */
  timeoutMs: number;
  /** 自定义 CLI 可执行文件路径（覆盖自动探测） */
  cliCommand?: string;
  /** spine-exporter 包根目录（覆盖自动探测，用于 require.resolve） */
  exporterPath?: string;
}

class MiraSpineFormatPlugin {
  private readonly pluginName = FORMAT_ID;
  private readonly pluginDataDir: string;
  private readonly config: PluginConfig;
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FileFormatManager;
    this.pluginDataDir = path.join(pluginManager.getPluginDir(this.pluginName), 'data');
    fs.mkdirSync(this.pluginDataDir, { recursive: true });
    this.config = this.loadConfig();

    this.unregisterFormat = pluginManager.registerFileFormat(this.pluginName, {
      id: this.pluginName,
      extensions: FORMAT_EXTENSIONS,
      mimeTypes: ['application/x-spine'],
      thumbnailExtensions: THUMBNAIL_EXTENSIONS,
      process: (filePath, context) => this.processFile(filePath, context),
      thumbnail: (srcPath, destPath) => this.generateThumbnail(srcPath, destPath),
    });

    console.log(`[${this.pluginName}] registered .skel parser and thumbnail generator (animation=${this.config.animation})`);
  }

  private loadConfig(): PluginConfig {
    const defaults: PluginConfig = {
      animation: 'idle',
      fallbackToDefault: true,
      timeoutMs: 120000,
    };
    const configPath = path.join(this.pluginDataDir, 'config.json');
    try {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        ...defaults,
        ...saved,
        animation: String(saved.animation || defaults.animation),
        fallbackToDefault: saved.fallbackToDefault !== false,
        timeoutMs: Math.max(5000, Math.min(300000, Number(saved.timeoutMs) || defaults.timeoutMs)),
      };
    } catch {
      fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
      return defaults;
    }
  }

  /**
   * 解析 .skel 元数据。
   * 简易实现：读取文件头判定二进制/JSON，统计同目录配套文件存在性。
   * 不依赖 spine 运行时，避免重量级解析。
   */
  private async processFile(filePath: string, context: Record<string, any> = {}) {
    const stat = await fs.promises.stat(filePath);
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const atlasPath = path.join(dir, `${base}.atlas`);
    const jsonPath = path.join(dir, `${base}.json`);
    const pngPath = path.join(dir, `${base}.png`);

    // 判定骨架格式：.skel 二进制 or .json 文本（这里 filePath 一定是 .skel）
    const head = Buffer.alloc(1);
    const fd = await fs.promises.open(filePath, 'r');
    try {
      await fd.read(head, 0, 1, 0);
    } finally {
      await fd.close();
    }
    const firstByte = head[0];
    const isJson = firstByte === 0x7b || firstByte === 0x5b; // '{' or '['

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
      skeletonFormat: isJson ? 'json' : 'binary',
      size: stat.size,
      hasAtlas: await exists(atlasPath),
      hasPng: await exists(pngPath),
      hasJsonSibling: await exists(jsonPath),
      ...context,
    };
  }

  /**
   * 生成 idle 动作首帧缩略图。
   *
   * spine-exporter CLI 以「目录」为输入（递归查找同名 .skel+.atlas+.png），
   * 因此用 srcPath 所在目录作为 --inputDir，渲染到临时目录后取首个 PNG 移到 destPath。
   */
  private async generateThumbnail(srcPath: string, destPath: string): Promise<void> {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const dir = path.dirname(srcPath);
    const base = path.basename(srcPath, path.extname(srcPath));
    const atlasPath = path.join(dir, `${base}.atlas`);
    const pngPath = path.join(dir, `${base}.png`);

    // 校验三件套（缺一不可渲染）
    if (!fs.existsSync(atlasPath) || !fs.existsSync(pngPath)) {
      console.warn(`[${this.pluginName}] missing atlas/png sibling for ${srcPath}, skip thumbnail`);
      return;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-thumb-'));
    try {
      const cli = this.resolveCli();
      // 第一遍：尝试指定动画（idle）
      let usedAnimation = this.config.animation;
      try {
        await this.runExporter(cli, dir, tmpDir, this.config.animation);
      } catch (err) {
        // 回退：不指定动画，渲染默认/首个
        if (this.config.fallbackToDefault) {
          console.warn(`[${this.pluginName}] animation "${this.config.animation}" failed, fallback to default:`, (err as any)?.message || err);
          await this.runExporter(cli, dir, tmpDir);
          usedAnimation = 'default';
        } else {
          throw err;
        }
      }

      // 找输出 PNG：优先匹配 *<animation>*，否则取首个 .png
      const png = await this.pickOutputPng(tmpDir, base, usedAnimation);
      if (!png) {
        console.warn(`[${this.pluginName}] no PNG produced in ${tmpDir}`);
        return;
      }
      await fs.promises.copyFile(png, destPath);
      console.log(`[${this.pluginName}] thumbnail generated: ${destPath} (animation=${usedAnimation})`);
    } catch (error: any) {
      // 与 mira_3d_format 一致：失败不阻断，仅记日志
      console.error(`[${this.pluginName}] generateThumbnail failed:`, error?.stderr || error?.message || error);
    } finally {
      // 清理临时目录
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  /** 调用 spine-export-cli，渲染到 outDir */
  private async runExporter(cli: string, inputDir: string, outDir: string, animation?: string): Promise<void> {
    const args = [
      cli,
      '--inputDir', inputDir,
      '-e', 'png',
      '-o', path.join(outDir, '{assetName}_{animationName}'),
    ];
    if (animation) {
      args.push('-s', animation);
    }
    await execFileAsync(process.execPath, args, {
      timeout: this.config.timeoutMs,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
    });
  }

  /** 在输出目录挑选结果 PNG：优先匹配动画名，否则首个 */
  private async pickOutputPng(outDir: string, assetName: string, animation: string): Promise<string | null> {
    const entries = await fs.promises.readdir(outDir);
    const pngs = entries.filter((f) => f.toLowerCase().endsWith('.png')).map((f) => path.join(outDir, f));
    if (!pngs.length) return null;
    // 优先：包含动画名
    const byAnim = pngs.find((p) => path.basename(p).toLowerCase().includes(animation.toLowerCase()));
    if (byAnim) return byAnim;
    // 次选：包含 assetName
    const byAsset = pngs.find((p) => path.basename(p).toLowerCase().includes(assetName.toLowerCase()));
    if (byAsset) return byAsset;
    // 兜底：首个
    return pngs[0];
  }

  /** 解析 spine-exporter CLI 路径：自定义 > 包内 dist/cli/index.js */
  private resolveCli(): string {
    if (this.config.cliCommand) return this.config.cliCommand;
    try {
      // bin 字段指向 dist/cli/index.js
      const exporterPath = this.config.exporterPath
        ? require.resolve(this.config.exporterPath)
        : require.resolve('spine-exporter');
      const cliEntry = path.join(path.dirname(exporterPath), 'cli', 'index.js');
      if (fs.existsSync(cliEntry)) return cliEntry;
      // 兜底：返回包根目录的 dist/cli/index.js
      const guess = path.join(path.dirname(require.resolve('spine-exporter/package.json')), 'dist', 'cli', 'index.js');
      if (fs.existsSync(guess)) return guess;
      throw new Error(`spine-exporter CLI entry not found near ${exporterPath}`);
    } catch (error) {
      throw new Error('spine-exporter is not installed; run pnpm install in the plugin directory');
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
