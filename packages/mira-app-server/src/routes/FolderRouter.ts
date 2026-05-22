import { Router, Request, Response } from 'express';
import { MiraServer } from '../server';
import { BaseRouter } from './BaseRouter';

export class FolderRouter extends BaseRouter {
    private router: Router;

    constructor(backend: MiraServer) {
        super(backend);
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取所有文件夹
        this.router.get('/all', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'getAll', 'getAllFolders');
        });

        // 查询文件夹
        this.router.post('/query', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'query', 'queryFolder');
        });

        // 创建文件夹
        this.router.post('/create', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'create', 'createFolder', {
                successMessage: 'Folder created successfully',
                onSuccess: (result, libraryId) => {
                    this.broadcastFolderEvent('folder::created', libraryId, { result, libraryId });
                }
            });
        });

        // 更新文件夹
        this.router.put('/update', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'update', 'updateFolder', {
                requiresId: true,
                successMessage: 'Folder updated successfully',
                onSuccess: (result, libraryId) => {
                    this.broadcastFolderEvent('folder::updated', libraryId, { result, libraryId });
                }
            });
        });

        // 删除文件夹
        this.router.delete('/delete', async (req: Request, res: Response) => {
            const libraryId = req.body.libraryId || req.query.libraryId as string;
            const folderId = req.body.id;
            await this.handleCrudOperation(req, res, 'delete', 'deleteFolder', {
                requiresId: true,
                successMessage: 'Folder deleted successfully',
                onSuccess: (_, libId) => {
                    this.broadcastFolderEvent('folder::deleted', libId, { id: folderId, libraryId: libId });
                }
            });
        });

        // 为文件设置文件夹
        this.router.post('/file/set', async (req: Request, res: Response) => {
            await this.handleFileAssociation(req, res, 'set', 'setFileFolder', 'folder', {
                successMessage: 'File folder set successfully'
            });
        });

        // 获取文件的文件夹
        this.router.get('/file/:fileId', async (req: Request, res: Response) => {
            await this.handleFileAssociation(req, res, 'get', 'getFileFolder', 'folder');
        });
    }

    private broadcastFolderEvent(eventName: string, libraryId: string, data: any) {
        if (!this.backend.webSocketServer) return;
        this.backend.webSocketServer.broadcastPluginEvent(eventName, data);
        this.backend.webSocketServer.broadcastLibraryEvent(libraryId, eventName, data);
    }

    public getRouter(): Router {
        return this.router;
    }
}
