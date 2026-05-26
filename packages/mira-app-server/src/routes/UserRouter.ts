import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AuthRouter } from './AuthRouter';

export class UserRouter {
    private router: Router;
    private authRouter: AuthRouter;
    private dataDir: string;

    constructor(authRouter: AuthRouter, dataDir: string = './data') {
        this.router = Router();
        this.authRouter = authRouter;
        this.dataDir = dataDir;
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取用户信息路由 - 符合vben框架标准 (/api/user/info)
        this.router.get('/info', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        code: 401,
                        message: '未提供认证令牌',
                        data: null
                    });
                }

                const authService = this.authRouter.getAuthService();
                const user = await authService.validateToken(token);

                if (user) {
                    const userInfo = authService.getUserInfo(user);

                    // 根据用户角色生成权限码
                    let permissions: string[] = [];
                    let userGroup = '';

                    switch (userInfo.role) {
                        case 'super':
                            permissions = ['*']; // 超级管理员拥有所有权限
                            userGroup = '超级管理员';
                            break;
                        case 'admin':
                            permissions = [
                                'AC_100100', // 系统管理权限
                                'AC_100010', // 资源库管理权限
                                'AC_100020', // 用户管理权限
                                'AC_200000', // 数据库访问权限
                                'AC_300000'  // 设备管理权限
                            ];
                            userGroup = '管理员';
                            break;
                        default:
                            permissions = ['AC_000100']; // 基础权限
                            userGroup = '普通用户';
                    }

                    // 符合vben标准的用户信息格式
                    const vbenUserInfo = {
                        ...userInfo,
                        realName: userInfo.username, // vben期望的真实姓名字段
                        roles: [userInfo.role], // vben期望的角色数组
                        permissions: permissions, // 权限码数组
                        userGroup: userGroup, // 用户组信息
                        registrationDate: new Date(userInfo.created_at).toISOString().split('T')[0], // 注册日期
                        // 添加更多用户信息字段以符合vben标准
                        avatar: `/api/user/avatar/${user.id}`,
                        desc: userGroup, // 用户描述使用用户组
                        homePath: '/mira/overview', // 默认首页路径
                    };

                    res.json({
                        code: 0,
                        message: '获取用户信息成功',
                        data: vbenUserInfo
                    });
                } else {
                    res.status(401).json({
                        code: 401,
                        message: '无效或过期的认证令牌',
                        data: null
                    });
                }
            } catch (error) {
                console.error('Get user info error:', error);
                res.status(500).json({
                    code: 500,
                    message: '服务器内部错误',
                    data: null
                });
            }
        });


        // 修改密码
        this.router.put('/change-password', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return res.status(401).json({ code: 401, message: '未提供认证令牌', data: null });
                }

                const { oldPassword, newPassword } = req.body;
                if (!oldPassword || !newPassword) {
                    return res.status(400).json({ code: 400, message: '旧密码和新密码不能为空', data: null });
                }
                if (newPassword.length < 6) {
                    return res.status(400).json({ code: 400, message: '新密码长度至少6个字符', data: null });
                }

                const authService = this.authRouter.getAuthService();
                const user = await authService.validateToken(token);
                if (!user) {
                    return res.status(401).json({ code: 401, message: '无效或过期的认证令牌', data: null });
                }

                const userStorage = this.authRouter.getUserStorage();
                const fullUser = await userStorage.findUserByUsername(user.username);
                if (!fullUser || !userStorage.verifyPasswordDirect(oldPassword, fullUser.password)) {
                    return res.status(400).json({ code: 400, message: '旧密码不正确', data: null });
                }

                await userStorage.updateUser(user.id, { password: newPassword });
                res.json({ code: 0, message: '密码修改成功', data: null });
            } catch (error) {
                console.error('Change password error:', error);
                res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
            }
        });

        // 更新用户信息路由
        this.router.put('/info', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        code: 401,
                        message: '未提供认证令牌',
                        data: null
                    });
                }

                const authService = this.authRouter.getAuthService();
                const user = await authService.validateToken(token);

                if (user) {
                    // 这里可以添加更新用户信息的逻辑
                    // 目前返回成功消息
                    res.json({
                        code: 0,
                        message: '用户信息更新成功',
                        data: null
                    });
                } else {
                    res.status(401).json({
                        code: 401,
                        message: '无效或过期的认证令牌',
                        data: null
                    });
                }
            } catch (error) {
                console.error('Update user info error:', error);
                res.status(500).json({
                    code: 500,
                    message: '服务器内部错误',
                    data: null
                });
            }
        });

        // 上传头像
        this.router.post('/avatar', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return res.status(401).json({ code: 401, message: '未提供认证令牌', data: null });
                }

                const authService = this.authRouter.getAuthService();
                const user = await authService.validateToken(token);
                if (!user) {
                    return res.status(401).json({ code: 401, message: '无效或过期的认证令牌', data: null });
                }

                const { image } = req.body;
                if (!image) {
                    return res.status(400).json({ code: 400, message: '请提供图片数据', data: null });
                }

                const userDir = path.join(this.dataDir, 'users', user.id.toString());
                await fs.promises.mkdir(userDir, { recursive: true });

                const avatarPath = path.join(userDir, 'avatar.jpg');
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                await fs.promises.writeFile(avatarPath, Buffer.from(base64Data, 'base64'));

                res.json({
                    code: 0,
                    message: '头像上传成功',
                    data: { avatar: `/api/user/avatar/${user.id}` }
                });
            } catch (error) {
                console.error('Upload avatar error:', error);
                res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
            }
        });

        // 获取头像
        this.router.get('/avatar/:userId', async (req: Request, res: Response) => {
            try {
                const { userId } = req.params;
                const avatarPath = path.join(this.dataDir, 'users', userId, 'avatar.jpg');

                if (fs.existsSync(avatarPath)) {
                    return res.sendFile(path.resolve(avatarPath));
                }

                // 默认头像：生成 SVG
                const userStorage = this.authRouter.getUserStorage();
                const user = await userStorage.findUserById(parseInt(userId));
                const initial = (user?.username || '?')[0].toUpperCase();
                const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'];
                const color = colors[parseInt(userId) % colors.length];

                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="64" y="64" dy=".35em" text-anchor="middle" fill="white" font-size="48" font-family="sans-serif">${initial}</text></svg>`;

                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.send(svg);
            } catch (error) {
                console.error('Get avatar error:', error);
                res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
