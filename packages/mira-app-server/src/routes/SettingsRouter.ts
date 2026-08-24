import { Router, Request, Response } from 'express';
import { MiraServer } from '..';
import { AuthRouter } from './AuthRouter';
import { ServerSettings } from '../SettingsManager';

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
                const { authRequired, allowRegistration, pluginSources, pluginSourceActive } = req.body;
                const patch: Partial<ServerSettings> = {
                    ...(authRequired !== undefined && { authRequired: !!authRequired }),
                    ...(allowRegistration !== undefined && { allowRegistration: !!allowRegistration }),
                };
                if (pluginSources !== undefined) {
                    if (!Array.isArray(pluginSources)) {
                        return res.status(400).json({ code: 400, message: 'pluginSources must be an array' });
                    }
                    patch.pluginSources = pluginSources
                        .filter((s: any) => s && typeof s.url === 'string' && s.url.trim())
                        .map((s: any, i: number) => ({
                            id: typeof s.id === 'string' && s.id ? s.id : `src_${Date.now().toString(36)}_${i}`,
                            name: (typeof s.name === 'string' && s.name.trim()) || s.url.trim(),
                            url: s.url.trim(),
                        }));
                }
                if (typeof pluginSourceActive === 'string') {
                    patch.pluginSourceActive = pluginSourceActive;
                }
                const updated = await this.backend.settingsManager.updateSettings(patch);
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
