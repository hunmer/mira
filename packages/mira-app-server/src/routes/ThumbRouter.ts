import { Router, Request, Response } from 'express';
import { BaseRouter } from './BaseRouter';
import { ThumbnailService } from '../services/ThumbnailService';

export class ThumbRouter extends BaseRouter {
  private router: Router;
  private thumbnailService: ThumbnailService;

  constructor(backend: any, thumbnailService: ThumbnailService) {
    super(backend);
    this.thumbnailService = thumbnailService;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/scan', async (req: Request, res: Response) => {
      const libraryId = req.query.libraryId as string;
      const validation = await this.validateLibrary(libraryId);
      if (!validation.success) return res.status(validation.error!.code).json(validation.error);

      this.thumbnailService.scanPending(libraryId, validation.library.libraryService);
      res.json({ success: true, message: '开始扫描缩略图' });
    });

    this.router.get('/progress', async (req: Request, res: Response) => {
      const libraryId = req.query.libraryId as string;
      const validation = await this.validateLibrary(libraryId);
      if (!validation.success) return res.status(validation.error!.code).json(validation.error);

      const data = await this.thumbnailService.getProgressData(libraryId, validation.library.libraryService);
      res.json({ success: true, data });
    });

    this.router.get('/cancel', (_req: Request, res: Response) => {
      this.thumbnailService.cancelScan();
      res.json({ success: true, message: '已取消缩略图生成任务' });
    });

    this.router.get('/stats', async (req: Request, res: Response) => {
      const libraryId = req.query.libraryId as string;
      const validation = await this.validateLibrary(libraryId);
      if (!validation.success) return res.status(validation.error!.code).json(validation.error);

      const data = await this.thumbnailService.getStats(libraryId, validation.library.libraryService);
      res.json({ success: true, data });
    });

    this.router.get('/generators', (_req: Request, res: Response) => {
      const generators = this.thumbnailService.getGenerators().map(g => ({
        name: g.name,
        supportedExtensions: g.supportedExtensions,
      }));
      res.json({ success: true, data: generators });
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
