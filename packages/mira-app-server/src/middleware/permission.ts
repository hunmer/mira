import { Request, Response, NextFunction } from 'express';
import { SettingsManager } from '../SettingsManager';

// ============================================================
// 权限配置表 — 集中管理，避免逐路由修改
// ============================================================

// 无需认证的公开路由（method + path，相对于 /api mount point）
const PUBLIC_ROUTES: Set<string> = new Set([
    'GET /health',
    'POST /auth/login',
    'POST /auth/register',
    'GET /settings',
]);

// 不需要鉴权的路由前缀（支持动态路径参数）
const PUBLIC_PREFIXES = [
    '/user/avatar/',
];

// 需要做素材库 allowedRoles 校验的路由前缀
const LIBRARY_SCOPED_PREFIXES = [
    '/files/',
    '/tags/',
    '/folders/',
    '/database/',
    '/devices/',
    '/fs/',
    '/statistics/',
];

// ============================================================
// 工具函数
// ============================================================

export function canAccessLibrary(config: any, userRole?: string): boolean {
    if (!userRole) return true;
    if (!config?.allowedRoles || config.allowedRoles.length === 0) return true;
    return config.allowedRoles.includes(userRole);
}

function extractLibraryId(req: Request): string | undefined {
    return req.params?.id || req.params?.libraryId || req.query?.libraryId as string || req.body?.libraryId;
}

function isPublicRoute(method: string, path: string): boolean {
    if (PUBLIC_ROUTES.has(`${method} ${path}`)) return true;
    if (method === 'GET' && PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) return true;
    return false;
}

function isLibraryScoped(path: string): boolean {
    return LIBRARY_SCOPED_PREFIXES.some(prefix => path.startsWith(prefix));
}

// ============================================================
// HTTP 权限中间件
// ============================================================

interface AuthServiceLike {
    validateToken(token: string): Promise<any>;
    getUserInfo(user: any): any;
}

interface LibraryStorageLike {
    getLibraryConfig(libraryId: string): Record<string, any> | null;
}

/**
 * 创建统一权限中间件
 *
 * @param authService   认证服务（来自 AuthRouter.getAuthService()）
 * @param settingsManager  设置管理器
 * @param getLibraryStorage  延迟获取 LibraryStorage（因为 HttpServer 构造时 libraries 尚未初始化）
 */
export function createHttpPermissionMiddleware(
    authService: AuthServiceLike,
    settingsManager: SettingsManager,
    getLibraryStorage: () => LibraryStorageLike | undefined,
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const method = req.method.toUpperCase();
        const path = req.path; // mount 在 /api 下，所以是相对路径

        // 1. 公开路由直接放行
        if (isPublicRoute(method, path)) {
            return next();
        }

        // 2. authRequired=false 时放行
        const settings = settingsManager.getSettings();
        if (!settings.authRequired) {
            return next();
        }

        // 3. 提取并校验 token（支持 Authorization header 和 query 参数）
        const token = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);
        if (!token) {
            return res.status(401).json({ code: 401, message: '未提供认证令牌', data: null });
        }

        let user: any;
        try {
            user = await authService.validateToken(token);
        } catch {
            return res.status(500).json({ code: 500, message: '认证服务错误', data: null });
        }

        if (!user) {
            return res.status(401).json({ code: 401, message: '无效或过期的认证令牌', data: null });
        }

        (req as any).user = authService.getUserInfo(user);

        // 4. 库级别权限检查
        const libraryStorage = getLibraryStorage();
        if (!libraryStorage) return next(); // libraries 尚未初始化，放行

        if (isLibraryScoped(path)) {
            const libraryId = extractLibraryId(req);
            if (libraryId) {
                const libConfig = libraryStorage.getLibraryConfig(libraryId);
                if (!canAccessLibrary(libConfig, (req as any).user?.role)) {
                    return res.status(403).json({ code: 403, message: '权限不足，无法访问该素材库', data: null });
                }
            }
        }

        // 5. PUT/DELETE /libraries/:id 也需要库级别检查
        if ((method === 'PUT' || method === 'DELETE') && path.match(/^\/libraries\/[^/]+/)) {
            const libraryId = req.params?.id;
            if (libraryId) {
                const libConfig = libraryStorage.getLibraryConfig(libraryId);
                if (!canAccessLibrary(libConfig, (req as any).user?.role)) {
                    return res.status(403).json({ code: 403, message: '权限不足，无法访问该素材库', data: null });
                }
            }
        }

        next();
    };
}
