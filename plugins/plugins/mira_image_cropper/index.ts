/**
 * 多选区图片裁切工具 - 服务端部分
 *
 * 职责：
 *   1. 注册 HTTP 路由 POST /api/image-cropper/save：
 *      接收裁切结果（base64 dataUrl）写入素材库，供插件窗口「导出到素材库」。
 *   2. web/ 目录下的客户端插件（plugin.json + index.js + dist SPA）
 *      由宿主 ServerPluginManager 自动发现并分发给客户端（见 docs/client-plugin-architecture.md）。
 *
 * 不依赖 mira 包，全部能力经 inst 注入（见 docs/server-plugin-development.md）。
 */
import * as fs from 'fs';
import * as path from 'path';

const PLUGIN_NAME = 'mira_image_cropper';
const ROUTE_PATH = '/image-cropper/save';
const MAX_DATA_URL_SIZE = 64 * 1024 * 1024; // 64MB base64 上限
const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

class MiraImageCropperPlugin {
  private libraryId: string;
  private dbService: any;
  private router: any;
  private handler: (req: any, res: any) => void;
  private tempDir: string;

  constructor(inst: any) {
    const { pluginManager } = inst;
    this.dbService = inst.dbService;
    this.libraryId = this.dbService.getLibraryId();
    this.router = pluginManager.server.backend.getHttpServer().httpRouter;
    this.tempDir = path.join(pluginManager.server.backend.dataPath, 'temp', 'image-cropper');
    fs.mkdirSync(this.tempDir, { recursive: true });

    this.handler = (req: any, res: any) => this.saveCrop(req, res);
    this.router.registerRounter(this.libraryId, ROUTE_PATH, 'post', this.handler);
    console.log(`[${PLUGIN_NAME}] registered POST /api${ROUTE_PATH} (library: ${this.libraryId})`);
  }

  /**
   * body: { libraryId, fileName, dataUrl, folderId? }
   * 返回: { success, file } —— file 为入库后的文件记录（重复入库时含 duplicate 标记）
   */
  private async saveCrop(req: any, res: any): Promise<void> {
    let tempPath = '';
    try {
      const { fileName, dataUrl, folderId } = req.body || {};
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return res.status(400).json({ success: false, error: 'dataUrl 必须是 data:image/* base64 字符串' });
      }
      if (dataUrl.length > MAX_DATA_URL_SIZE) {
        return res.status(413).json({ success: false, error: '图片过大（超过 64MB）' });
      }

      const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
      if (!match) {
        return res.status(400).json({ success: false, error: 'dataUrl 格式无效' });
      }
      const ext = ALLOWED_MIME[match[1].toLowerCase()];
      if (!ext) {
        return res.status(400).json({ success: false, error: `不支持的图片类型: ${match[1]}（仅 png/jpeg/webp）` });
      }

      const buffer = Buffer.from(match[2], 'base64');
      if (!buffer.length) {
        return res.status(400).json({ success: false, error: '图片内容为空' });
      }

      // 文件名：清洗用户输入，仅保留安全字符，缺省用时间戳。
      // 注意：temp 文件名即入库后的最终文件名（createFileFromPath 以 name 为磁盘文件名，
      // 事后 updateFile 改名不会改磁盘文件），因此不得加时间戳/随机前缀；
      // 用户名自带同类扩展名时先去掉，避免 "xx.png.png"。
      const rawName = String(fileName || '').replace(/[\\/:*?"<>|\r\n]/g, '_').trim();
      const safeName = rawName.replace(/\.(png|jpe?g|webp)$/i, '') || `crop_${Date.now()}`;
      tempPath = path.join(this.tempDir, `${safeName}.${ext}`);
      await fs.promises.writeFile(tempPath, buffer);

      const file = await this.dbService.createFileFromPath(tempPath, {
        folder_id: folderId ?? null,
      }, { importType: 'move' });
      if (file) tempPath = ''; // move 成功后文件已被库接管

      res.json({ success: Boolean(file), file: file ?? null });
    } catch (error) {
      console.error(`[${PLUGIN_NAME}] save failed:`, error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    } finally {
      if (tempPath) {
        try { await fs.promises.unlink(tempPath); } catch { /* 忽略清理失败 */ }
      }
    }
  }

  cleanup(): void {
    try {
      this.router.unregisterRounter(ROUTE_PATH, this.libraryId, this.handler);
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] cleanup warn:`, error);
    }
    console.log(`[${PLUGIN_NAME}] cleaned up`);
  }
}

export function init(inst: any) {
  return new MiraImageCropperPlugin(inst);
}
