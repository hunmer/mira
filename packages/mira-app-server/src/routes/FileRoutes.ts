import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { MiraServer } from '../server';
import { FileService } from '../lib/FileService';
import { FileRouteContext, FileRouteDef, registerFileRoutes } from './FileRouteRegistry';
import { fileImportRoutes } from './FileImportRoutes';
import { fileQueryRoutes } from './FileQueryRoutes';
import { fileMutationRoutes } from './FileMutationRoutes';

export class FileRoutes {
    private router: Router;
    private backend: MiraServer;
    private upload!: multer.Multer;
    private coverUpload!: multer.Multer;
    private readonly files: FileService;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.files = new FileService(backend);
        this.setupUpload();
        this.setupRoutes();
    }

    private setupUpload(): void {
        // 配置multer文件上传
        this.upload = multer({
            storage: multer.diskStorage({
                destination: (req, file, cb) => {
                    const tempDir = path.join(this.backend.dataPath, 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    cb(null, tempDir);
                },
                filename: (req, file, cb) => {
                    // 处理中文名，确保文件名为utf8编码
                    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, uniqueSuffix + path.extname(originalName));
                }
            }),
            limits: {
                fileSize: 2048 * 1024 * 1024, // 2GB per file
            }
        });
        this.coverUpload = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 },
        });
    }

    private setupRoutes(): void {
        // 注册表驱动装配：端点定义在资源模块（导入/查询/变更），这里只负责注册。
        // 模块间无同形状路径遮蔽；顺序敏感的组合（/:libraryId/trash 先于 /:libraryId/:id、
        // preview 三连、extra 通配）都保留在同一模块内的原始相对顺序。
        const defs: FileRouteDef[] = [
            ...fileImportRoutes,
            ...fileQueryRoutes,
            ...fileMutationRoutes,
        ];
        const ctx: FileRouteContext = { backend: this.backend, files: this.files };
        registerFileRoutes(this.router, defs, ctx, { files: this.upload, cover: this.coverUpload });
    }

    public getRouter(): Router {
        return this.router;
    }
}
