import { Router, Request, Response } from 'express';
import { MiraServer } from '../server';
import { BaseRouter } from './BaseRouter';

export class TagRouter extends BaseRouter {
    private router: Router;

    constructor(backend: MiraServer) {
        super(backend);
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取所有标签
        this.router.get('/all', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'getAll', 'getAllTags');
        });

        // 查询标签
        this.router.post('/query', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'query', 'queryTag');
        });

        // 创建标签
        this.router.post('/create', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'create', 'createTag', {
                successMessage: 'Tag created successfully'
            });
        });

        // 更新标签
        this.router.put('/update', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'update', 'updateTag', {
                requiresId: true,
                successMessage: 'Tag updated successfully'
            });
        });

        // 删除标签
        this.router.delete('/delete', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'delete', 'deleteTag', {
                requiresId: true,
                successMessage: 'Tag deleted successfully'
            });
        });

        // 为文件设置标签
        this.router.post('/file/set', async (req: Request, res: Response) => {
            await this.handleFileAssociation(req, res, 'set', 'setFileTags', 'tags', {
                successMessage: 'File tags set successfully'
            });
        });

        // 获取文件的标签
        this.router.get('/file/:fileId', async (req: Request, res: Response) => {
            await this.handleFileAssociation(req, res, 'get', 'getFileTags', 'tags');
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
