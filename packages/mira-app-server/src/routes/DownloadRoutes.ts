import { Router, Request, Response } from 'express';
import { AuthRouter } from './AuthRouter';
import { MiraServer } from '..';
import { resolveFolderId, resolveTagIds } from './FileAssociationResolver';

/**
 * 下载执行器路由
 *
 *   POST /api/download/start     body: { libraryId, urls: string[], folderId?, tagIds?, clientId? }  → { batchId }
 *   GET  /api/download/progress/:batchId                                                      → BatchProgress
 *
 * 全挂 authMiddleware，按 req.user.id。库权限校验沿用全局 permission 中间件。
 */
export class DownloadRoutes {
    private router: Router;
    private authRouter: AuthRouter;
    private backend: MiraServer;

    constructor(backend: MiraServer, authRouter: AuthRouter) {
        this.backend = backend;
        this.authRouter = authRouter;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.router.post('/start', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            try {
                if (!this.backend.downloadExecutor) {
                    return res.status(503).json({ code: 503, message: '下载执行器尚未就绪' });
                }
                const userId = (req as any).user?.id;
                if (!userId) return res.status(401).json({ code: 401, message: '未登录' });
                const { libraryId, urls, folderId, tagIds, clientId } = req.body || {};
                if (!libraryId) return res.status(400).json({ code: 400, message: 'libraryId 必填' });
                const urlList: string[] = Array.isArray(urls) ? urls.filter((u) => typeof u === 'string' && u.trim()) : [];
                if (urlList.length === 0) return res.status(400).json({ code: 400, message: 'urls 为空' });
                const library = this.backend.libraries?.getLibrary(libraryId);
                if (!library) return res.status(404).json({ code: 404, message: 'Library not found' });
                const normalizedTagIds = await resolveTagIds(
                    library.libraryService,
                    Array.isArray(tagIds) ? tagIds : [],
                );
                const normalizedFolderId = await resolveFolderId(library.libraryService, folderId);

                const batchId = await this.backend.downloadExecutor.enqueueBatch(
                    urlList.map((u) => ({
                        url: u.trim(),
                        libraryId,
                        userId,
                        folderId: normalizedFolderId ?? null,
                        tagIds: normalizedTagIds,
                        clientId: clientId ?? null,
                    })),
                );
                res.json({ code: 0, data: { batchId, total: urlList.length } });
            } catch (error) {
                res.status(500).json({ code: 500, message: (error as Error).message });
            }
        });

        this.router.get('/progress/:batchId', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            try {
                if (!this.backend.downloadExecutor) {
                    return res.status(503).json({ code: 503, message: '下载执行器尚未就绪' });
                }
                const userId = (req as any).user?.id;
                if (!userId) return res.status(401).json({ code: 401, message: '未登录' });
                const progress = this.backend.downloadExecutor.getProgress(req.params.batchId);
                if (!progress) return res.status(404).json({ code: 404, message: '批次不存在或已过期' });
                res.json({ code: 0, data: progress });
            } catch (error) {
                res.status(500).json({ code: 500, message: (error as Error).message });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
