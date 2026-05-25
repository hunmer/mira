import { Router, Request, Response } from 'express';
import { MiraServer } from '../server';

export class StatisticsRouter {
    private router: Router;
    private backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 上传统计（按用户）
        this.router.get('/:libraryId/upload', async (req: Request, res: Response) => {
            try {
                const { libraryId } = req.params;
                const obj = this.backend.libraries?.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({ code: 404, message: 'Library not found', data: null });
                }

                const stats = await obj.libraryService.getUploadStatistics();

                // 把 uploader ID 映射为用户名
                const userStorage = this.backend.httpServer?.authRouter.getUserStorage();
                const allUsers = userStorage ? await userStorage.getAllUsers() : [];
                const userMap = new Map(allUsers.map(u => [u.id, u.username]));

                const data = stats.map((row: any) => ({
                    uploader: row.uploader,
                    uploaderName: row.uploader ? (userMap.get(row.uploader) || `User#${row.uploader}`) : '未知',
                    fileCount: row.file_count,
                    totalSize: row.total_size,
                }));

                res.json({ code: 0, message: 'Success', data });
            } catch (error) {
                console.error('Error getting upload statistics:', error);
                res.status(500).json({ code: 500, message: 'Internal server error', data: null });
            }
        });

        // 每日上传统计（按日期分组）
        this.router.get('/:libraryId/upload/daily', async (req: Request, res: Response) => {
            try {
                const { libraryId } = req.params;
                const obj = this.backend.libraries?.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({ code: 404, message: 'Library not found', data: null });
                }

                const stats = await obj.libraryService.getDailyUploadStats();
                res.json({ code: 0, message: 'Success', data: stats });
            } catch (error) {
                console.error('Error getting daily upload stats:', error);
                res.status(500).json({ code: 500, message: 'Internal server error', data: null });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
