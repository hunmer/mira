import { Router, Request, Response } from 'express';
import { AuthRouter } from './AuthRouter';

export class AdminsRouter {
    private router: Router;
    private authRouter: AuthRouter;

    constructor(authRouter: AuthRouter) {
        this.authRouter = authRouter;
        this.router = Router();
        this.setupRoutes();
        this.setupTokenRoutes();
    }

    private setupRoutes(): void {
        // 管理员管理路由
        this.router.get('/', async (req, res) => {
            try {
                const userStorage = this.authRouter.getAuthService().getUserStorage();
                // 获取所有用户（管理员）
                const users = await userStorage.getAllUsers();
                const tokenCounts = await userStorage.getUserTokenCounts();
                const admins = users.map((user: any) => ({
                    id: user.id.toString(),
                    username: user.username,
                    email: user.email || '',
                    role: user.role,
                    tokenCount: tokenCounts.get(user.id) || 0,
                    createdAt: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: user.updated_at ? new Date(user.updated_at).toISOString() : new Date().toISOString()
                }));
                res.json(admins);
            } catch (error) {
                console.error('Error getting admins:', error);
                res.status(500).json({ error: 'Failed to get admins' });
            }
        });

        // 创建管理员
        this.router.post('/', async (req, res) => {
            try {
                const { username, email, password } = req.body;

                if (!username || !password) {
                    return res.status(400).json({
                        success: false,
                        message: '用户名和密码不能为空'
                    });
                }

                const userStorage = this.authRouter.getAuthService().getUserStorage();

                // 检查用户名是否已存在（包括已删除的用户）
                const existingUser = await userStorage.findUserByUsernameIncludeInactive(username);
                if (existingUser) {
                    if (existingUser.is_active) {
                        return res.status(400).json({
                            success: false,
                            message: '用户名已存在'
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: '该用户名已被使用（已删除的账户），请使用其他用户名'
                        });
                    }
                }

                // 创建新管理员
                const now = Date.now();
                const hashedPassword = userStorage.hashPassword(password);
                const newAdmin = {
                    username,
                    email: email || '',
                    password: hashedPassword,
                    role: 'admin',
                    permissions: ['admin'],
                    created_at: now,
                    updated_at: now,
                    is_active: true
                };

                const adminId = await userStorage.createUser(newAdmin);

                res.json({
                    success: true,
                    message: '管理员创建成功',
                    data: { id: adminId.toString() }
                });

            } catch (error: any) {
                console.error('Error creating admin:', error);

                // 处理数据库约束错误
                if (error?.code === 'SQLITE_CONSTRAINT' && error?.message?.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(400).json({
                        success: false,
                        message: '用户名已存在，请使用其他用户名'
                    });
                }

                res.status(500).json({
                    success: false,
                    message: '创建管理员失败',
                    error: error?.message || '未知错误'
                });
            }
        });

        // 更新管理员
        this.router.put('/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { email, username, password, role } = req.body;

                const userStorage = this.authRouter.getAuthService().getUserStorage();
                const updateData: any = {};

                if (email !== undefined) {
                    updateData.email = email;
                }
                if (username !== undefined) {
                    updateData.username = username;
                }
                if (password !== undefined && password.trim() !== '') {
                    updateData.password = password; // UserStorage.updateUser 会自动hash密码
                }
                if (role !== undefined) {
                    updateData.role = role;
                }

                const success = await userStorage.updateUser(parseInt(id), updateData);

                if (success) {
                    res.json({
                        success: true,
                        message: '管理员信息更新成功'
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        message: '管理员不存在或更新失败'
                    });
                }
            } catch (error: any) {
                console.error('Error updating admin:', error);
                res.status(500).json({
                    success: false,
                    message: '更新管理员失败',
                    error: error?.message || '未知错误'
                });
            }
        });

        // 删除管理员
        this.router.delete('/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const currentUser = (req as any).user;

                // 防止删除自己
                if (currentUser && currentUser.id.toString() === id) {
                    return res.status(400).json({
                        success: false,
                        message: '不能删除自己的账户'
                    });
                }

                const userStorage = this.authRouter.getAuthService().getUserStorage();
                const success = await userStorage.softDeleteUser(parseInt(id));

                if (success) {
                    res.json({
                        success: true,
                        message: '管理员删除成功'
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        message: '管理员不存在或删除失败'
                    });
                }
            } catch (error: any) {
                console.error('Error deleting admin:', error);
                res.status(500).json({
                    success: false,
                    message: '删除管理员失败',
                    error: error?.message || '未知错误'
                });
            }
        });
    }

    // ==================== API Token 管理 ====================

    private setupTokenRoutes(): void {
        const getUserStorage = () => this.authRouter.getAuthService().getUserStorage();

        // 列出用户的所有 token
        this.router.get('/:id/tokens', async (req, res) => {
            try {
                const tokens = await getUserStorage().listUserTokens(parseInt(req.params.id));
                res.json(tokens);
            } catch (error: any) {
                console.error('Error listing tokens:', error);
                res.status(500).json({ success: false, message: '获取 Token 列表失败', error: error?.message });
            }
        });

        // 创建 token（expiresInDays 为空时永不过期）
        this.router.post('/:id/tokens', async (req, res) => {
            try {
                const { name, expiresInDays } = req.body || {};
                const userId = parseInt(req.params.id);
                const userStorage = getUserStorage();

                const user = await userStorage.findUserById(userId);
                if (!user) {
                    return res.status(404).json({ success: false, message: '用户不存在' });
                }

                const days = typeof expiresInDays === 'number' && expiresInDays > 0 ? expiresInDays : null;
                const token = await userStorage.createUserToken(userId, { name: name || '', expiresInDays: days });
                res.json({ success: true, message: 'Token 创建成功', data: token });
            } catch (error: any) {
                console.error('Error creating token:', error);
                res.status(500).json({ success: false, message: '创建 Token 失败', error: error?.message });
            }
        });

        // 更新 token（名称 / 过期时间）
        this.router.put('/:id/tokens/:tokenId', async (req, res) => {
            try {
                const { name, expiresInDays } = req.body || {};
                const data: { name?: string; expiresInDays?: number | null } = {};
                if (name !== undefined) data.name = name;
                if (expiresInDays !== undefined) {
                    data.expiresInDays = typeof expiresInDays === 'number' && expiresInDays > 0 ? expiresInDays : null;
                }

                const updated = await getUserStorage().updateUserToken(parseInt(req.params.id), parseInt(req.params.tokenId), data);
                if (!updated) {
                    return res.status(404).json({ success: false, message: 'Token 不存在' });
                }
                res.json({ success: true, message: 'Token 更新成功', data: updated });
            } catch (error: any) {
                console.error('Error updating token:', error);
                res.status(500).json({ success: false, message: '更新 Token 失败', error: error?.message });
            }
        });

        // 删除 token
        this.router.delete('/:id/tokens/:tokenId', async (req, res) => {
            try {
                const success = await getUserStorage().deleteUserToken(parseInt(req.params.id), parseInt(req.params.tokenId));
                if (!success) {
                    return res.status(404).json({ success: false, message: 'Token 不存在' });
                }
                res.json({ success: true, message: 'Token 删除成功' });
            } catch (error: any) {
                console.error('Error deleting token:', error);
                res.status(500).json({ success: false, message: '删除 Token 失败', error: error?.message });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
