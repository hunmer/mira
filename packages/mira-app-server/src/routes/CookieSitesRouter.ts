import { Router, Request, Response } from 'express';
import { AuthRouter } from './AuthRouter';

/**
 * 下载站点 Cookie 管理路由（用户私有）
 *
 * 存储：users.db 的 cookie_sites 表（见 UserStorage.createTables）。
 * 鉴权：全部走 authMiddleware，按 (req as any).user.id 隔离用户数据。
 */
export class CookieSitesRouter {
    private router: Router;
    private authRouter: AuthRouter;

    constructor(authRouter: AuthRouter) {
        this.authRouter = authRouter;
        this.router = Router();
        this.setupRoutes();
    }

    private getUserStorage() {
        return this.authRouter.getAuthService().getUserStorage();
    }

    private setupRoutes(): void {
        // 列表
        this.router.get('/', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            try {
                const userId = (req as any).user?.id;
                if (!userId) return res.status(401).json({ code: 401, message: '未登录' });
                const data = await this.getUserStorage().listCookieSites(userId);
                res.json({ code: 0, data });
            } catch (error) {
                res.status(500).json({ code: 500, message: (error as Error).message });
            }
        });

        // 新增
        this.router.post('/', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            try {
                const userId = (req as any).user?.id;
                if (!userId) return res.status(401).json({ code: 401, message: '未登录' });
                const { name, url, remark, cookies, label, isDefault } = req.body || {};
                if (!name || !url) {
                    return res.status(400).json({ code: 400, message: 'name 和 url 必填' });
                }
                const data = await this.getUserStorage().createCookieSite(userId, { name, url, remark, cookies, label, isDefault });
                res.json({ code: 0, data });
            } catch (error) {
                res.status(500).json({ code: 500, message: (error as Error).message });
            }
        });

        // 更新
        this.router.put('/:id', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            try {
                const userId = (req as any).user?.id;
                if (!userId) return res.status(401).json({ code: 401, message: '未登录' });
                const id = parseInt(req.params.id, 10);
                if (!Number.isFinite(id)) return res.status(400).json({ code: 400, message: 'id 非法' });
                const { name, url, remark, cookies, label, isDefault } = req.body || {};
                const data = await this.getUserStorage().updateCookieSite(userId, id, { name, url, remark, cookies, label, isDefault });
                if (!data) return res.status(404).json({ code: 404, message: '站点不存在或无权访问' });
                res.json({ code: 0, data });
            } catch (error) {
                res.status(500).json({ code: 500, message: (error as Error).message });
            }
        });

        // 设为默认（同 url 其他组自动取消）
        this.router.put('/:id/default', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            try {
                const userId = (req as any).user?.id;
                if (!userId) return res.status(401).json({ code: 401, message: '未登录' });
                const id = parseInt(req.params.id, 10);
                if (!Number.isFinite(id)) return res.status(400).json({ code: 400, message: 'id 非法' });
                const data = await this.getUserStorage().setDefaultCookieSite(userId, id);
                if (!data) return res.status(404).json({ code: 404, message: '站点不存在或无权访问' });
                res.json({ code: 0, data });
            } catch (error) {
                res.status(500).json({ code: 500, message: (error as Error).message });
            }
        });

        // 删除
        this.router.delete('/:id', this.authRouter.authMiddleware(), async (req: Request, res: Response) => {
            try {
                const userId = (req as any).user?.id;
                if (!userId) return res.status(401).json({ code: 401, message: '未登录' });
                const id = parseInt(req.params.id, 10);
                if (!Number.isFinite(id)) return res.status(400).json({ code: 400, message: 'id 非法' });
                const ok = await this.getUserStorage().deleteCookieSite(userId, id);
                if (!ok) return res.status(404).json({ code: 404, message: '站点不存在或无权访问' });
                res.json({ code: 0, data: { id } });
            } catch (error) {
                res.status(500).json({ code: 500, message: (error as Error).message });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
