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

        // 批量获取文件夹封面，避免客户端逐文件夹请求文件列表
        this.router.post('/covers', async (req: Request, res: Response) => {
            try {
                const libraryId = req.body.libraryId as string;
                const folderIds = req.body.folderIds;
                if (!Array.isArray(folderIds) || folderIds.some(id => !Number.isInteger(id) || id <= 0)) {
                    this.sendError(res, 400, 'folderIds must be an array of positive integers');
                    return;
                }

                const validation = await this.validateLibrary(libraryId);
                if (!validation.success) {
                    res.status(validation.error!.code).json(validation.error);
                    return;
                }

                const uniqueFolderIds = [...new Set<number>(folderIds)];
                const db = validation.library!.libraryService;
                const covers = await Promise.all(uniqueFolderIds.map(async folderId => {
                    const { result } = await db.getFiles({
                        filters: { folder: folderId, limit: 1, recycled: 0 },
                        isUrlFile: true,
                    });
                    const file = result[0];
                    return {
                        folderId,
                        coverUrl: file?.thumb || file?.path || null,
                    };
                }));

                this.sendSuccess(res, covers);
            } catch (error) {
                console.error('Get folder covers error:', error);
                this.sendError(res, 500, 'Internal server error');
            }
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
                onSuccess: (_result, libraryId) => {
                    this.broadcastFolderEvent('folder::updated', libraryId, { id: req.body.id, title: req.body.title, libraryId });
                }
            });
        });

        // 批量设置文件夹排序 index
        this.router.put('/sort-index', async (req: Request, res: Response) => {
            try {
                const libraryId = req.body.libraryId || req.query.libraryId as string;
                const validation = await this.validateLibrary(libraryId);
                if (!validation.success) { res.status(validation.error!.code).json(validation.error); return; }

                const items: { id: number; sort_index: number }[] = req.body.items;
                if (!Array.isArray(items)) { this.sendError(res, 400, 'items must be an array'); return; }

                const db = validation.library!.libraryService;
                for (const item of items) {
                    await db.updateFolder(item.id, { sort_index: item.sort_index });
                }
                this.broadcastFolderEvent('folder::updated', libraryId, { items, libraryId });
                this.sendSuccess(res, { updated: items.length }, 'Sort index updated');
            } catch (error) {
                console.error('Update folder sort-index error:', error);
                this.sendError(res, 500, 'Internal server error');
            }
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
            try {
                const libraryId = req.body.libraryId || req.query.libraryId as string;
                const fileId = req.body.fileId;
                const folderId = req.body.folder;

                if (!fileId) {
                    res.status(400).json({ code: 400, message: 'File ID is required', data: null });
                    return;
                }

                const validation = await this.validateLibrary(libraryId);
                if (!validation.success) {
                    res.status(validation.error!.code).json(validation.error);
                    return;
                }

                const { library } = validation;
                const db = library.libraryService;

                // 移动前注册忽略路径，避免 Watcher 重复处理
                const oldFile = await db.getFile(parseInt(fileId));
                const watcher = this.backend.libraries!.getLibrary(libraryId)?.watcher;
                if (oldFile && watcher) {
                    const oldPath = await db.getItemFilePath(oldFile);
                    if (oldPath) watcher.ignorePath(oldPath);
                }

                const result = await db.setFileFolder(parseInt(fileId), folderId);
                if (result.success) {
                    const newFile = await db.getFile(parseInt(fileId));
                    if (newFile) {
                        const newPath = await db.getItemFilePath(newFile);
                        if (newPath && watcher) watcher.ignorePath(newPath);
                    }
                    this.broadcastFolderEvent('file::updated', libraryId, {
                        ...newFile, libraryId, fileId: parseInt(fileId), old_data: result.oldData,
                    });
                }

                this.sendSuccess(res, { fileId, folder: folderId, success: result.success }, 'File folder set successfully');
            } catch (error) {
                console.error('Set file folder error:', error);
                this.sendError(res, 500, 'Internal server error');
            }
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
