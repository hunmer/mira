import { Router, Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import { FileService } from '../lib/FileService';
import { MiraServer } from '../server';

export type FileRouteMethod = 'get' | 'post' | 'put' | 'delete';

/** 资源路由 handler 共享的运行时依赖 */
export interface FileRouteContext {
    backend: MiraServer;
    files: FileService;
}

/** 单个文件路由端点的声明式定义 */
export interface FileRouteDef {
    method: FileRouteMethod;
    path: string;
    /** 需要在 handler 前挂载的 multer 中间件 */
    multer?: 'files' | 'cover';
    handler: (ctx: FileRouteContext, req: Request, res: Response) => void | Promise<unknown>;
}

/** 上传中间件实例（由 FileRoutes.setupUpload 构造） */
export interface FileUploads {
    files: multer.Multer;
    cover: multer.Multer;
}

/**
 * 按注册表把端点挂到 router 上。
 * 刻意不包 try/catch：与原先逐个 this.router.post(...) 的异步错误行为保持一致。
 */
export function registerFileRoutes(router: Router, defs: FileRouteDef[], ctx: FileRouteContext, uploads: FileUploads): void {
    for (const def of defs) {
        const middleware: RequestHandler[] = [];
        if (def.multer === 'files') middleware.push(uploads.files.array('files'));
        if (def.multer === 'cover') middleware.push(uploads.cover.single('cover'));

        const register = router[def.method].bind(router) as (path: string, ...handlers: RequestHandler[]) => Router;
        register(def.path, ...middleware, (req: Request, res: Response) => def.handler(ctx, req, res));
    }
}
