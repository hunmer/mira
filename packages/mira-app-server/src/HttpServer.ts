import { Express, Router } from 'express';
import http from 'http';
import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from "axios";
import { AuthRouter } from "./routes/AuthRouter";
import { UserRouter } from "./routes/UserRouter";
import { LibraryRoutes } from './routes/LibraryRoutes';

import { AdminsRouter } from "./routes/AdminsRouter";
import { MiraServer } from '.';
import { HttpRouter } from './routes/HttpRouter';
import { PluginRoutes } from './routes/PluginRoutes';
import { DatabaseRoutes } from './routes/DatabaseRoutes';
import { FileRoutes } from './routes/FileRoutes';
import { DeviceRoutes } from './routes/DeviceRoutes';
import { TagRouter } from './routes/TagRouter';
import { FolderRouter } from './routes/FolderRouter';
import { FsRouter } from './routes/FsRouter';
import { SettingsRouter } from './routes/SettingsRouter'
import { CookieSitesRouter } from './routes/CookieSitesRouter';
import { DownloadRoutes } from './routes/DownloadRoutes';
import { StatisticsRouter } from './routes/StatisticsRouter';
import { ThumbRouter } from './routes/ThumbRouter';
import { createHttpPermissionMiddleware } from './middleware/permission';
import { logRingBuffer } from './services/LogRingBuffer';

// HTTP请求日志中间件
interface RequestLogData {
    method: string;
    url: string;
    headers: any;
    query: any;
    params: any;
    body: any;
    ip: string;
    userAgent: string;
    timestamp: string;
}

interface ResponseLogData {
    statusCode: number;
    statusMessage: string;
    headers: any;
    body: any;
    responseTime: number;
}

// 日志忽略列表：匹配这些前缀的路径完全不输出日志
const HTTP_LOG_IGNORE_PREFIXES = [
    '/api/health',
    '/api/logs/stream',
];

// 日志数据截断：序列化后超 MAX_LOG_CHARS 字符则截断并标注原始长度
const MAX_LOG_CHARS = 500;
function truncateLogData(data: any): any {
    let text: string;
    try {
        text = typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
        text = String(data);
    }
    if (text.length > MAX_LOG_CHARS) {
        return `${text.slice(0, MAX_LOG_CHARS)}... (${text.length} chars, truncated)`;
    }
    return data;
}

function createHttpLoggerMiddleware() {
    // 记录上一次请求的地址，用于抑制无 body 的重复请求刷屏
    let lastUrl = '';
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        // 记录请求信息（body 延迟到 res.finish 时读取，避免在 express.json 解析前快照到空值）
        const requestData: RequestLogData = {
            method: req.method,
            url: req.originalUrl || req.url,
            headers: req.headers,
            query: req.query,
            params: req.params,
            body: undefined as any,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            timestamp
        };

        // 命中忽略列表：直接跳过日志
        const ignored = HTTP_LOG_IGNORE_PREFIXES.some(prefix => requestData.url.startsWith(prefix));

        // 仅在未被忽略时拦截响应体（避免无谓的开销）
        const originalSend = ignored ? null : res.send;
        const originalJson = ignored ? null : res.json;
        let responseBody: any = null;

        if (!ignored) {
            // 重写 send 方法
            res.send = function (data: any) {
                responseBody = data;
                return originalSend!.call(this, data);
            };

            // 重写 json 方法
            res.json = function (data: any) {
                responseBody = data;
                return originalJson!.call(this, data);
            };
        }

        // 监听响应完成
        res.on('finish', () => {
            if (ignored) return;

            const responseTime = Date.now() - startTime;
            const statusCode = res.statusCode;
            // 此时 express.json 已执行，req.body 是解析后的对象；保持引用同步
            requestData.body = req.body;
            const hasBody = !!(requestData.body && typeof requestData.body === 'object' && Object.keys(requestData.body).length > 0);

            if (hasBody) {
                // 有 body：输出较完整的信息
                console.log(`🔗 ${requestData.method.toUpperCase()} ${requestData.url}`);
                if (Object.keys(requestData.query).length > 0) {
                    console.log(`❓ Query Parameters:`, requestData.query);
                }
                if (Object.keys(requestData.params).length > 0) {
                    console.log(`📍 Route Parameters:`, requestData.params);
                }
                console.log(`📦 Request Body:`, truncateLogData(requestData.body));
            } else if (requestData.url !== lastUrl) {
                // 无 body 且地址与上次不同：仅输出合并的一行（请求行 + 状态 + 耗时）
                console.log(`🔗 ${requestData.method.toUpperCase()} ${requestData.url} [${statusCode}] ${responseTime}ms`);
            }
            // 无 body 且地址与上次一致：不输出任何请求信息
            lastUrl = requestData.url;

            // 有 body 的请求额外输出响应体（超长截断）
            if (hasBody && responseBody != null) {
                const truncated = truncateLogData(responseBody);
                if (typeof truncated === 'string') {
                    console.log(`📤 Response: ${truncated}`);
                } else {
                    console.log(`📤 Response:`, truncated);
                }
            }
        });

        next();
    };
}

export class MiraHttpServer {
    // 开放所有属性
    app: Express;
    httpServer: http.Server;
    authRouter: AuthRouter;
    userRouter: UserRouter;
    backend: MiraServer;

    // Routers
    libraryRoutes: LibraryRoutes;
    pluginRoutes: PluginRoutes;
    databaseRoutes: DatabaseRoutes;
    fileRoutes: FileRoutes;
    deviceRoutes: DeviceRoutes;
    tagRouter: TagRouter;
    folderRouter: FolderRouter;
    fsRouter: FsRouter;
    adminsRouter: AdminsRouter;
    httpRouter: HttpRouter;
    settingsRouter: SettingsRouter;
    cookieSitesRouter: CookieSitesRouter;
    downloadRoutes: DownloadRoutes;
    statisticsRouter: StatisticsRouter;
    thumbRouter: ThumbRouter;

    constructor(backend: MiraServer, dataDir: string = './data') {
        this.backend = backend;
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.authRouter = new AuthRouter(dataDir);
        this.userRouter = new UserRouter(this.authRouter, dataDir);
        this.adminsRouter = new AdminsRouter(this.authRouter);
        this.libraryRoutes = new LibraryRoutes(backend);
        this.pluginRoutes = new PluginRoutes(backend);
        this.databaseRoutes = new DatabaseRoutes(backend);
        this.fileRoutes = new FileRoutes(backend);
        this.deviceRoutes = new DeviceRoutes(backend);
        this.tagRouter = new TagRouter(backend);
        this.folderRouter = new FolderRouter(backend);
        this.fsRouter = new FsRouter(backend);
        this.httpRouter = new HttpRouter(backend);
        this.settingsRouter = new SettingsRouter(backend, this.authRouter);
        this.cookieSitesRouter = new CookieSitesRouter(this.authRouter);
        this.downloadRoutes = new DownloadRoutes(backend, this.authRouter);
        this.statisticsRouter = new StatisticsRouter(backend);
        this.thumbRouter = new ThumbRouter(backend, backend.thumbnailService, backend.metadataService);

        this.setupMiddleware();
    }

    public async initialize(): Promise<void> {
        await this.authRouter.initialize();
        this.setupRoutes();
    }

    // 开放功能
    public async request(options: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        data?: any;
    }): Promise<any> {
        try {
            const response = await axios.request({
                method: options.method,
                url: options.url,
                headers: options.headers,
                data: options.data
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Request failed: ${error.message}`);
            }
            throw error;
        }
    }

    private setupMiddleware() {
        // 添加HTTP请求日志中间件
        this.app.use(createHttpLoggerMiddleware());

        // CORS 中间件
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // JSON 解析中间件 - 增加文件上传限制
        this.app.use(express.json({ limit: '2048mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // 静态文件中间件
        // 注意：路径必须基于编译产物所在目录（__dirname），而不是 process.cwd()。
        // 否则通过 npm 安装后在任意目录启动时，会找不到 public/dashboard 资源。
        const publicDir = path.resolve(__dirname, '..', 'public');
        this.app.use('/static', express.static(publicDir));

        // Dashboard 静态托管：构建产物位于与本文件同级的 dist/dashboard 下。
        // dev 模式下用 ts-node 直接跑 src/，__dirname 指向 src/，此时回退到项目根的 dist/dashboard
        // （该目录由 pnpm build:dashboard 生成的构建产物）。
        let dashboardDir = path.resolve(__dirname, 'dashboard');
        if (!fs.existsSync(dashboardDir)) {
            dashboardDir = path.resolve(__dirname, '..', 'dist', 'dashboard');
        }
        this.app.use(
            '/dashboard',
            express.static(dashboardDir, {
                // SPA 回退：未命中的静态资源回落到 index.html，保证前端路由可刷新
                setHeaders: (res, filePath) => {
                    if (path.extname(filePath) === '.html') {
                        res.setHeader('Cache-Control', 'no-cache');
                    }
                },
            }),
        );
        // 前端路由（如 /dashboard/foo）刷新时回落到 dashboard 的 index.html
        this.app.get(/^\/dashboard(?:\/.*)?$/, (req, res, next) => {
            const indexFile = path.join(dashboardDir, 'index.html');
            res.sendFile(indexFile, (err) => {
                if (err && !res.headersSent) next();
            });
        });
        // 根路径重定向到 dashboard
        this.app.get('/', (req, res) => res.redirect('/dashboard/'));

        // 服务端插件的前端构建产物是公开代码资源。放在鉴权中间件之前，确保
        // iframe 内的 JS/CSS/wasm 等相对资源无需重复传递 token。
        this.app.get('/server-plugins/:libraryId/:pluginName/*', (req, res) => {
            const { libraryId, pluginName } = req.params;
            const library = this.backend.libraries?.getLibrary(libraryId);
            const pluginManager = library?.pluginManager;
            if (!pluginManager || !pluginManager.isPluginLoaded(pluginName)) {
                return res.status(404).json({ error: 'Server plugin not found' });
            }

            const webDir = path.resolve(pluginManager.getPluginWebDir(pluginName));
            const assetPath = path.resolve(webDir, (req.params as Record<string, string>)[0] || '');
            const relativePath = path.relative(webDir, assetPath);
            if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.sendFile(assetPath);
        });

        // 统一权限中间件（CORS + body parser 之后、路由注册之前）
        this.app.use('/api', createHttpPermissionMiddleware(
            this.authRouter.getAuthService(),
            this.backend.settingsManager,
            () => this.backend.libraries
        ));
    }

    private setupRoutes() {
        this.app.use('/api', this.httpRouter.getRouter()); // 插件注册服务
        this.app.use('/api/auth', this.authRouter.getRouter());
        this.app.use('/api/admins', this.adminsRouter.getRouter());

        // 注册符合vben标准的用户信息路由
        this.app.use('/api/user', this.userRouter.getRouter());

        // 注册 RESTful 路由
        this.app.use('/api/libraries', this.libraryRoutes.getRouter());
        this.app.use('/api/plugins', this.pluginRoutes.getRouter());
        this.app.use('/api/database', this.databaseRoutes.getRouter());
        this.app.use('/api/files', this.fileRoutes.getRouter());
        this.app.use('/api/devices', this.deviceRoutes.getRouter());
        this.app.use('/api/tags', this.tagRouter.getRouter());
        this.app.use('/api/folders', this.folderRouter.getRouter());
        this.app.use('/api/fs', this.fsRouter.getRouter());
        this.app.use('/api/settings', this.settingsRouter.getRouter());
        this.app.use('/api/cookie-sites', this.cookieSitesRouter.getRouter());
        this.app.use('/api/download', this.downloadRoutes.getRouter());
        this.app.use('/api/statistics', this.statisticsRouter.getRouter());
        this.app.use('/api/thumb', this.thumbRouter.getRouter());

        // 获取所有素材库的插件路由定义
        this.app.get('/api/plugin-routes', (req, res) => {
            try {
                const allRoutes: any[] = [];
                const libraries = this.backend.libraries?.getLibraries() || {};

                for (const [libraryId, libraryData] of Object.entries(libraries)) {
                    if (libraryData.pluginManager) {
                        const routes = libraryData.pluginManager.getAllPluginRoutes();
                        // 为每个路由添加素材库信息
                        const routesWithLibrary = routes.map(route => ({
                            ...route,
                            libraryId,
                            libraryName: libraryData.libraryService?.config?.name || libraryId,
                            // 保留原始路径，同时提供带素材库ID的完整路径
                            originalPath: route.path,
                            path: `/mira/library/${libraryId}${route.path}`
                        }));
                        allRoutes.push(...routesWithLibrary);
                    }
                }

                res.json({
                    code: 0,
                    data: allRoutes,
                    total: allRoutes.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error getting all plugin routes:', error);
                res.status(500).json({
                    code: 500,
                    error: 'Failed to get plugin routes',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 插件路由API - 获取指定素材库的路由定义
        this.app.get('/api/plugin-routes/:libraryId', (req, res) => {
            try {
                const { libraryId } = req.params;
                if (libraryId != null) {
                    const obj = this.backend.libraries?.getLibrary(libraryId as string);
                    if (obj == null) {
                        return res.status(404).json({
                            code: 404,
                            error: 'Library not found',
                            message: `No library found with id: ${libraryId}`,
                            timestamp: new Date().toISOString()
                        });
                    }
                    const routes = obj.pluginManager.getAllPluginRoutes();
                    res.json({
                        code: 0,
                        data: routes,
                        total: routes.length,
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                console.error('Error getting plugin routes:', error);
                res.status(500).json({
                    code: 500,
                    error: 'Failed to get plugin routes',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 健康检查端点
        this.app.get('/api/health', (req, res) => {
            const settings = this.backend.settingsManager.getSettings();
            const isDocker = fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv');
            res.json({
                code: 0,
                data: {
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    version: process.env.npm_package_version || '1.0.0',
                    nodeVersion: process.version,
                    environment: process.env.NODE_ENV || 'development',
                    isDocker,
                    authRequired: settings.authRequired,
                    allowRegistration: settings.allowRegistration,
                }
            });
        });
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // 服务端日志流（SSE）—— 供本地控制台订阅后端运行日志。
        // 与 /health 同级、不挂权限中间件：仅本地 127.0.0.1 控制台使用。
        // 连接建立后先回放环形缓冲中「最近 100 条」历史，再实时推送新日志。
        this.app.get('/api/logs/stream', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
            });
            res.write(': connected\n\n');

            // 1) 回放历史
            const history = logRingBuffer.recent();
            res.write(`event: history\ndata: ${JSON.stringify(history)}\n\n`);

            // 2) 订阅实时日志
            const unsubscribe = logRingBuffer.subscribe(entry => {
                res.write(`data: ${JSON.stringify(entry)}\n\n`);
            });

            // 周期性心跳，防止中间代理因空闲关闭连接
            const heartbeat = setInterval(() => {
                res.write(': ping\n\n');
            }, 15000);

            // 客户端断开时清理订阅与定时器，避免内存泄漏
            req.on('close', () => {
                unsubscribe();
                clearInterval(heartbeat);
            });
        });

        // 错误处理中间件
        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('HTTP Server Error:', err);
            res.status(err.status || 500).json({
                error: err.name || 'Internal Server Error',
                message: err.message || 'An unexpected error occurred',
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        });
    }

    public start(port: number = 8081): Promise<void> {
        return new Promise((resolve, reject) => {
            this.httpServer.listen(port, (err?: Error) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🚀 HTTP Server started on port ${port}`);
                    console.log(`📍 Health check: http://localhost:${port}/health`);
                    console.log(`🔗 API base URL: http://localhost:${port}/api`);
                    resolve();
                }
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            this.httpServer.close(() => {
                console.log('📴 HTTP Server stopped');
                resolve();
            });
        });
    }

    public getApp(): Express {
        return this.app;
    }

    public getHttpServer(): http.Server {
        return this.httpServer;
    }

    public getAuthRouter(): AuthRouter {
        return this.authRouter;
    }
}
