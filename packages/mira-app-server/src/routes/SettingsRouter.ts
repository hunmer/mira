import { Router, Request, Response } from 'express';
import { MiraServer } from '..';
import { AuthRouter } from './AuthRouter';

export class SettingsRouter {
    private router: Router;
    private backend: MiraServer;
    private authRouter: AuthRouter;

    constructor(backend: MiraServer, authRouter: AuthRouter) {
        this.backend = backend;
        this.authRouter = authRouter;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取服务器设置
        this.router.get('/', (req: Request, res: Response) => {
            const settings = this.backend.settingsManager.getSettings();
            res.json({ code: 0, data: settings });
        });

        // 更新服务器设置（需要 admin 权限）
        this.router.put('/', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            const user = (req as any).user;
            if (!user || (user.role !== 'super' && user.role !== 'admin')) {
                return res.status(403).json({ code: 403, message: 'Admin access required' });
            }

            try {
                const { authRequired, allowRegistration } = req.body;
                const updated = await this.backend.settingsManager.updateSettings({
                    ...(authRequired !== undefined && { authRequired: !!authRequired }),
                    ...(allowRegistration !== undefined && { allowRegistration: !!allowRegistration }),
                });
                res.json({ code: 0, data: updated });
            } catch (error) {
                res.status(500).json({ code: 500, message: 'Failed to update settings' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
