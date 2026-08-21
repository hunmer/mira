/**
 * 格式转换插件 - 服务端部分
 *
 * 职责：
 *   1. GET  /api/format-converter/capabilities
 *      探测服务器本地 ImageMagick / FFmpeg 可用性，返回支持的目标格式。
 *   2. POST /api/format-converter/convert
 *      创建异步转换任务（多文件），立即返回 taskId。
 *   3. GET  /api/format-converter/status?taskId=
 *      轮询任务进度（每文件状态/百分比/错误）。
 *
 * 转换产物经 createFileFromPath 以 copy 方式入库为新文件（原文件不动），
 * 可选继承原文件所在文件夹与标签。任务在内存中串行执行，完成 30 分钟后回收。
 *
 * 二进制定位：FFMPEG_PATH / IMAGEMAGICK_PATH 环境变量优先，
 * ffmpeg 回退宿主 thumbnailService.ffmpegPath，最后尝试 PATH 中的 magick / convert / ffmpeg。
 * 不依赖 mira 包，全部能力经 inst 注入（见 docs/server-plugin-development.md）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFile, spawn } from 'child_process';

const PLUGIN_NAME = 'mira_format_converter';
const ROUTE_BASE = '/format-converter';
const TASK_TTL_MS = 30 * 60 * 1000; // 完成任务保留 30 分钟
const TASK_GC_INTERVAL_MS = 10 * 60 * 1000;

type Quality = 'high' | 'medium' | 'low';

/** 源文件分类（按扩展名）与各类可用的目标格式 */
const SOURCE_EXTS: Record<'image' | 'video' | 'audio', string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'avif', 'heic', 'heif', 'svg', 'ico', 'psd'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'ts', 'mpg', 'mpeg', '3gp', 'ogv'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'opus', 'aiff', 'amr'],
};
const IMAGE_TARGETS = ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'heic'];
const VIDEO_TARGETS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const AUDIO_TARGETS = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];

const QUALITY_LABELS: Record<Quality, string> = { high: '高', medium: '中', low: '低' };
const IMAGE_QUALITY: Record<Quality, number> = { high: 95, medium: 80, low: 60 };
const X264_CRF: Record<Quality, number> = { high: 18, medium: 23, low: 28 };
const VP9_CRF: Record<Quality, number> = { high: 24, medium: 31, low: 40 };
const MPEG4_QV: Record<Quality, number> = { high: 2, medium: 5, low: 10 };
const AUDIO_BITRATE: Record<Quality, string> = { high: '256k', medium: '192k', low: '128k' };
const VORBIS_Q: Record<Quality, number> = { high: 7, medium: 5, low: 3 };

type Scale = { kind: 'none' } | { kind: 'percent'; value: number } | { kind: 'width'; value: number };

type ItemStatus = 'pending' | 'running' | 'importing' | 'done' | 'error';

interface TaskItem {
  fileId: number;
  name: string;
  srcExt: string;
  category: 'image' | 'video' | 'audio' | 'unknown';
  status: ItemStatus;
  progress: number; // 0-100，仅视频/音频转码有中间百分比
  error?: string;
  duplicate?: boolean;
  newFileId?: number;
  newFileName?: string;
}

interface Task {
  id: string;
  createdAt: number;
  finishedAt?: number;
  params: { target: string; quality: Quality; scale: Scale; inheritMeta: boolean };
  items: TaskItem[];
}

function classifyExt(ext: string): 'image' | 'video' | 'audio' | 'unknown' {
  const e = ext.toLowerCase();
  for (const key of ['image', 'video', 'audio'] as const) {
    if (SOURCE_EXTS[key].includes(e)) return key;
  }
  return 'unknown';
}

/** 源类别允许的目标格式：图片→图片格式；视频→视频格式+gif；音频→音频格式 */
function allowedTargets(category: 'image' | 'video' | 'audio'): string[] {
  if (category === 'image') return [...IMAGE_TARGETS];
  if (category === 'video') return [...VIDEO_TARGETS, 'gif'];
  return [...AUDIO_TARGETS];
}

function safeBaseName(name: string): string {
  const raw = String(name || '').replace(/[\\/:*?"<>|\r\n]/g, '_').trim();
  const ext = path.extname(raw);
  return (raw.slice(0, raw.length - ext.length) || `convert_${Date.now()}`).trim();
}

class MiraFormatConverterPlugin {
  private libraryId: string;
  private dbService: any;
  private router: any;
  private backend: any;
  private tempRoot: string;
  private tasks = new Map<string, Task>();
  private queueTail: Promise<void> = Promise.resolve();
  private gcTimer: NodeJS.Timeout;
  private probeCache: Record<'ffmpeg' | 'imagemagick', { path: string; available: boolean; version: string } | null> = {
    ffmpeg: null,
    imagemagick: null,
  };
  private routes: Array<{ path: string; method: string; handler: any }> = [];

  constructor(inst: any) {
    const { pluginManager } = inst;
    this.dbService = inst.dbService;
    this.libraryId = this.dbService.getLibraryId();
    this.router = pluginManager.server.backend.getHttpServer().httpRouter;
    this.backend = pluginManager.server.backend;
    this.tempRoot = path.join(this.backend.dataPath, 'temp', 'format-converter');
    fs.mkdirSync(this.tempRoot, { recursive: true });

    this.register('/capabilities', 'get', (req, res) => this.capabilities(req, res));
    this.register('/convert', 'post', (req, res) => this.startConvert(req, res));
    this.register('/status', 'get', (req, res) => this.status(req, res));

    this.gcTimer = setInterval(() => this.gcTasks(), TASK_GC_INTERVAL_MS);
    this.gcTimer.unref?.();
    console.log(`[${PLUGIN_NAME}] registered /api${ROUTE_BASE}/{capabilities,convert,status} (library: ${this.libraryId})`);
  }

  private register(subPath: string, method: string, handler: (req: any, res: any) => void): void {
    const full = `${ROUTE_BASE}${subPath}`;
    this.router.registerRounter(this.libraryId, full, method, handler);
    this.routes.push({ path: full, method, handler });
  }

  // ── 二进制探测 ──────────────────────────────────────────────

  private probeBinary(candidates: string[], args: string[]): Promise<{ path: string; available: boolean; version: string }> {
    const tryOne = (bin: string): Promise<{ path: string; available: boolean; version: string }> =>
      new Promise((resolve) => {
        execFile(bin, args, { windowsHide: true, timeout: 8000, maxBuffer: 1024 * 256 }, (error, stdout) => {
          resolve({ path: bin, available: !error, version: error ? '' : String(stdout).split('\n')[0].trim() });
        });
      });
    return candidates.reduce<Promise<{ path: string; available: boolean; version: string } | null>>(
      async (acc, bin) => {
        const prev = await acc;
        if (prev?.available) return prev;
        const result = await tryOne(bin);
        return result.available ? result : (prev ?? result);
      },
      Promise.resolve(null),
    ).then((r) => r ?? { path: candidates[candidates.length - 1], available: false, version: '' });
  }

  private async resolveBinaries(): Promise<Record<'ffmpeg' | 'imagemagick', { path: string; available: boolean; version: string }>> {
    if (!this.probeCache.ffmpeg?.available) {
      const ffmpegCandidates = [
        process.env.FFMPEG_PATH,
        this.backend?.thumbnailService?.ffmpegPath,
        'ffmpeg',
      ].filter(Boolean) as string[];
      this.probeCache.ffmpeg = await this.probeBinary(ffmpegCandidates, ['-version']);
    }
    if (!this.probeCache.imagemagick?.available) {
      const magickCandidates = [process.env.IMAGEMAGICK_PATH, 'magick', 'convert'].filter(Boolean) as string[];
      this.probeCache.imagemagick = await this.probeBinary(magickCandidates, ['-version']);
    }
    return {
      ffmpeg: this.probeCache.ffmpeg!,
      imagemagick: this.probeCache.imagemagick!,
    };
  }

  // ── HTTP 处理器 ──────────────────────────────────────────────

  /** GET capabilities → { success, data: { ffmpeg, imagemagick, targets: { image, video, audio } } } */
  private async capabilities(_req: any, res: any): Promise<void> {
    try {
      const bins = await this.resolveBinaries();
      res.json({
        success: true,
        data: {
          ffmpeg: bins.ffmpeg,
          imagemagick: bins.imagemagick,
          targets: { image: IMAGE_TARGETS, video: [...VIDEO_TARGETS, 'gif'], audio: AUDIO_TARGETS },
          qualities: QUALITY_LABELS,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * POST convert
   * body: { files: [{ fileId }], target, quality?, scale?, inheritMeta? }
   * scale: 'none' | { percent: 50 } | { width: 1920 }
   */
  private async startConvert(req: any, res: any): Promise<void> {
    try {
      const { files, target, quality, scale, inheritMeta } = req.body || {};
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, error: 'files 不能为空' });
      }
      if (typeof target !== 'string' || !/^[a-z0-9]{2,5}$/.test(target)) {
        return res.status(400).json({ success: false, error: 'target 格式非法' });
      }
      const q: Quality = quality === 'high' || quality === 'low' ? quality : 'medium';
      let parsedScale: Scale = { kind: 'none' };
      if (scale && typeof scale === 'object') {
        if (scale.percent && Number(scale.percent) > 0 && Number(scale.percent) < 100) {
          parsedScale = { kind: 'percent', value: Math.round(Number(scale.percent)) };
        } else if (scale.width && Number(scale.width) >= 16) {
          parsedScale = { kind: 'width', value: Math.min(8192, Math.round(Number(scale.width))) };
        }
      }

      const bins = await this.resolveBinaries();
      if (!bins.ffmpeg.available && !bins.imagemagick.available) {
        return res.status(503).json({ success: false, error: '服务器未安装 FFmpeg / ImageMagick，无法转换' });
      }

      const task: Task = {
        id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        params: { target, quality: q, scale: parsedScale, inheritMeta: inheritMeta !== false },
        items: files.map((f: any) => {
          const fileId = Number(f?.fileId ?? f?.id);
          const name = String(f?.name || `file_${fileId}`);
          return {
            fileId,
            name,
            srcExt: path.extname(name).slice(1).toLowerCase(),
            category: classifyExt(path.extname(name).slice(1)),
            status: 'pending',
            progress: 0,
          } as TaskItem;
        }),
      };
      this.tasks.set(task.id, task);

      // 串行队列执行，避免并发转码抢占 CPU
      this.queueTail = this.queueTail.then(() => this.runTask(task)).catch((error) => {
        console.error(`[${PLUGIN_NAME}] task ${task.id} crashed:`, error);
        task.finishedAt = Date.now();
        for (const item of task.items) {
          if (item.status === 'pending' || item.status === 'running') {
            item.status = 'error';
            item.error = '任务异常中断';
          }
        }
      });

      res.json({ success: true, data: { taskId: task.id } });
    } catch (error) {
      console.error(`[${PLUGIN_NAME}] convert failed to start:`, error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** GET status?taskId= → 任务快照 */
  private async status(req: any, res: any): Promise<void> {
    try {
      const taskId = String(req.query?.taskId || '');
      const task = this.tasks.get(taskId);
      if (!task) return res.status(404).json({ success: false, error: '任务不存在或已过期' });
      const done = task.items.every((i) => i.status === 'done' || i.status === 'error');
      res.json({
        success: true,
        data: {
          taskId: task.id,
          createdAt: task.createdAt,
          finishedAt: task.finishedAt ?? null,
          status: done ? 'done' : 'running',
          params: { target: task.params.target, quality: task.params.quality, inheritMeta: task.params.inheritMeta },
          items: task.items.map((i) => ({ ...i })),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // ── 任务执行 ──────────────────────────────────────────────

  private gcTasks(): void {
    const now = Date.now();
    for (const [id, task] of this.tasks) {
      if (task.finishedAt && now - task.finishedAt > TASK_TTL_MS) this.tasks.delete(id);
    }
  }

  private async runTask(task: Task): Promise<void> {
    const bins = await this.resolveBinaries();
    const taskDir = path.join(this.tempRoot, task.id);
    await fs.promises.mkdir(taskDir, { recursive: true });
    try {
      for (const item of task.items) {
        if (item.status !== 'pending') continue; // 已被判错的直接跳过
        await this.convertItem(task, item, taskDir, bins);
      }
    } finally {
      task.finishedAt = Date.now();
      fs.promises.rm(taskDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async convertItem(
    task: Task,
    item: TaskItem,
    taskDir: string,
    bins: Record<'ffmpeg' | 'imagemagick', { path: string; available: boolean; version: string }>,
  ): Promise<void> {
    let tempPath = '';
    try {
      item.status = 'running';

      // 校验源类别与目标格式匹配
      if (item.category === 'unknown') throw new Error(`不支持的源格式 .${item.srcExt || '(无扩展名)'}`);
      const targets = allowedTargets(item.category);
      if (!targets.includes(task.params.target)) {
        throw new Error(`${item.category === 'image' ? '图片' : item.category === 'video' ? '视频' : '音频'}源不能转换为 .${task.params.target}`);
      }

      // 取库内文件的服务器本地路径
      const file = await this.dbService.getFile(item.fileId);
      if (!file) throw new Error(`素材不存在 (id=${item.fileId})`);
      if (String(file.url || '').startsWith('http')) throw new Error('URL 引用素材没有服务器本地文件');
      const srcPath = await this.dbService.getItemFilePath(file);
      if (!srcPath || !fs.existsSync(srcPath)) throw new Error('源文件不在服务器本地磁盘上');

      // 继承元数据：原文件夹 + 原标签
      let folderId: number | null = null;
      let tagIds: string[] = [];
      if (task.params.inheritMeta) {
        const [folders, tags] = await Promise.all([
          this.dbService.getFileFolder(item.fileId).catch(() => []),
          this.dbService.getFileTags(item.fileId).catch(() => []),
        ]);
        if (Array.isArray(folders) && folders.length > 0) folderId = Number(folders[0].id);
        if (Array.isArray(tags)) {
          tagIds = tags.map((t: any) => String(t.id)).filter(Boolean);
        }
      }

      // 执行转换
      tempPath = path.join(taskDir, `${safeBaseName(item.name)}.${task.params.target}`);
      const onProgress = (pct: number) => {
        item.progress = Math.max(item.progress, Math.min(99, Math.round(pct)));
      };
      if (item.category === 'image') {
        if (!bins.imagemagick.available) throw new Error(`服务器无 ImageMagick (${bins.imagemagick.path})`);
        await this.runMagick(bins.imagemagick.path, srcPath, tempPath, task.params.quality, task.params.scale);
        item.progress = 100;
      } else {
        if (!bins.ffmpeg.available) throw new Error(`服务器无 FFmpeg (${bins.ffmpeg.path})`);
        if (item.category === 'video') {
          await this.runFFmpeg(
            this.buildVideoArgs(srcPath, tempPath, task.params.target, task.params.quality, task.params.scale),
            onProgress,
          );
        } else {
          await this.runFFmpeg(
            this.buildAudioArgs(srcPath, tempPath, task.params.target, task.params.quality),
            onProgress,
          );
        }
        item.progress = 100;
      }

      // 入库（copy：原文件不动）
      item.status = 'importing';
      const imported = await this.dbService.createFileFromPath(tempPath, { folder_id: folderId }, { importType: 'copy' });
      if (!imported || !imported.id) throw new Error('转换产物入库失败');
      item.duplicate = Boolean(imported.duplicate);
      item.newFileId = Number(imported.id);
      item.newFileName = String(imported.name || path.basename(tempPath));
      if (tagIds.length > 0 && !item.duplicate) {
        await this.dbService.setFileTags(item.newFileId, tagIds).catch(() => undefined);
      }
      tempPath = ''; // 已被库接管（copy 模式下库会复制，temp 在任务结束时统一清理）
      item.status = 'done';
    } catch (error) {
      item.status = 'error';
      item.error = error instanceof Error ? error.message : String(error);
      console.warn(`[${PLUGIN_NAME}] convert file ${item.fileId} (${item.name}) failed:`, item.error);
      if (tempPath) fs.promises.unlink(tempPath).catch(() => undefined);
    }
  }

  // ── 命令构造与执行 ──────────────────────────────────────────

  private magickResizeArgs(scale: Scale): string[] {
    if (scale.kind === 'percent') return ['-resize', `${scale.value}%`];
    if (scale.kind === 'width') return ['-resize', `${scale.value}x>`]; // 只缩不放
    return [];
  }

  /**
   * ImageMagick：图片 → 图片格式
   * 便携版/绿色版 ImageMagick（如 Mira runtime-deps）没有注册表项，
   * 需显式指定 coder 模块路径，否则报 RegistryKeyLookupFailed `CoderModulesPath`。
   */
  private magickEnv(bin: string): Record<string, string> {
    const env: Record<string, string> = { ...process.env } as Record<string, string>;
    try {
      const root = path.dirname(path.resolve(bin));
      const coders = path.join(root, 'modules', 'coders');
      if (fs.existsSync(coders)) {
        if (!env.MAGICK_CODER_MODULE_PATH) env.MAGICK_CODER_MODULE_PATH = coders;
        const filters = path.join(root, 'modules', 'filters');
        if (fs.existsSync(filters) && !env.MAGICK_FILTER_MODULE_PATH) env.MAGICK_FILTER_MODULE_PATH = filters;
        if (!env.MAGICK_HOME) env.MAGICK_HOME = root;
      }
    } catch { /* 保持原样，交由二进制自行解析 */ }
    return env;
  }

  private runMagick(bin: string, srcPath: string, destPath: string, quality: Quality, scale: Scale): Promise<void> {
    const args = [srcPath, ...this.magickResizeArgs(scale), '-quality', String(IMAGE_QUALITY[quality]), destPath];
    return new Promise((resolve, reject) => {
      execFile(bin, args, { windowsHide: true, timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024, env: this.magickEnv(bin) }, (error, _stdout, stderr) => {
        if (error) reject(new Error(String(stderr || error.message).slice(0, 500)));
        else resolve();
      });
    });
  }

  /** ffmpeg scale 滤镜表达式（偶数对齐，只缩不放；min() 内的逗号需转义，否则被滤镜图解析器当作分隔符） */
  private ffmpegScaleFilter(scale: Scale, fallbackWidth = 0): string {
    if (scale.kind === 'percent') {
      const f = (scale.value / 100).toFixed(3);
      return `scale=trunc(iw*${f}/2)*2:-2`;
    }
    const width = scale.kind === 'width' ? scale.value : fallbackWidth;
    return width > 0 ? `scale=w=min(${width}\\,iw):h=-2` : '';
  }

  /** FFmpeg：视频 → 视频格式（mp4/mov/mkv/webm/avi/gif） */
  private buildVideoArgs(srcPath: string, destPath: string, target: string, quality: Quality, scale: Scale): string[] {
    const args = ['-nostdin', '-y', '-i', srcPath];
    if (target === 'gif') {
      // 单遍 palettegen/paletteuse，fps 12；未指定缩放时默认限宽 640 控制体积
      const vf = ['fps=12', this.ffmpegScaleFilter(scale, 640)].filter(Boolean).join(',');
      args.push('-vf', `${vf},split[a][b];[a]palettegen[p];[b][p]paletteuse`, '-loop', '0', '-an');
    } else if (target === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-crf', String(VP9_CRF[quality]), '-b:v', '0', '-row-mt', '1', '-c:a', 'libopus');
      const vf = this.ffmpegScaleFilter(scale);
      if (vf) args.push('-vf', vf);
    } else if (target === 'avi') {
      args.push('-c:v', 'mpeg4', '-q:v', String(MPEG4_QV[quality]), '-c:a', 'libmp3lame');
      const vf = this.ffmpegScaleFilter(scale);
      if (vf) args.push('-vf', vf);
    } else {
      // mp4 / mov / mkv
      args.push('-c:v', 'libx264', '-crf', String(X264_CRF[quality]), '-preset', 'medium', '-c:a', 'aac');
      if (target === 'mp4') args.push('-movflags', '+faststart');
      const vf = this.ffmpegScaleFilter(scale);
      if (vf) args.push('-vf', vf);
    }
    args.push(destPath);
    return args;
  }

  /** FFmpeg：音频 → 音频格式 */
  private buildAudioArgs(srcPath: string, destPath: string, target: string, quality: Quality): string[] {
    const args = ['-nostdin', '-y', '-i', srcPath, '-vn'];
    if (target === 'mp3') args.push('-c:a', 'libmp3lame', '-b:a', AUDIO_BITRATE[quality]);
    else if (target === 'wav') args.push('-c:a', 'pcm_s16le');
    else if (target === 'flac') args.push('-c:a', 'flac');
    else if (target === 'ogg') args.push('-c:a', 'libvorbis', '-q:a', String(VORBIS_Q[quality]));
    else args.push('-c:a', 'aac', '-b:a', AUDIO_BITRATE[quality]); // aac / m4a
    args.push(destPath);
    return args;
  }

  /** 执行 ffmpeg，通过 -progress pipe:1 解析实时百分比（时长取自 stderr 的 Duration 行） */
  private runFFmpeg(args: string[], onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.probeCache.ffmpeg!.path, ['-progress', 'pipe:1', '-nostats', ...args], { windowsHide: true });
      let durationUs = 0;
      let stderrTail = '';
      const durationRe = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/;
      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const m = /out_time_ms=(\d+)/.exec(text);
        if (m && durationUs > 0) onProgress((Number(m[1]) / durationUs) * 100);
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-2000);
        if (durationUs === 0) {
          const m = durationRe.exec(stderrTail);
          if (m) durationUs = (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1e6;
        }
      });
      child.on('error', (error) => reject(error));
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg 退出码 ${code}: ${stderrTail.split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 500)}`));
      });
    });
  }

  cleanup(): void {
    for (const route of this.routes) {
      try {
        this.router.unregisterRounter(route.path, this.libraryId, route.handler);
      } catch (error) {
        console.warn(`[${PLUGIN_NAME}] cleanup warn:`, error);
      }
    }
    clearInterval(this.gcTimer);
    this.tasks.clear();
    console.log(`[${PLUGIN_NAME}] cleaned up`);
  }
}

export function init(inst: any) {
  return new MiraFormatConverterPlugin(inst);
}
