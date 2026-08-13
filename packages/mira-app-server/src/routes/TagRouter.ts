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
                successMessage: 'Tag created successfully',
                onSuccess: (result, libraryId) => {
                    this.broadcastTagEvent('tag::created', libraryId, { result, libraryId });
                }
            });
        });

        // 更新标签
        this.router.put('/update', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'update', 'updateTag', {
                requiresId: true,
                successMessage: 'Tag updated successfully',
                onSuccess: (_result, libraryId) => {
                    this.broadcastTagEvent('tag::updated', libraryId, { id: req.body.id, title: req.body.title, libraryId });
                }
            });
        });

        // 批量设置标签排序 index
        this.router.put('/sort-index', async (req: Request, res: Response) => {
            try {
                const libraryId = req.body.libraryId || req.query.libraryId as string;
                const validation = await this.validateLibrary(libraryId);
                if (!validation.success) { res.status(validation.error!.code).json(validation.error); return; }

                const items: { id: number; sort_index: number }[] = req.body.items;
                if (!Array.isArray(items)) { this.sendError(res, 400, 'items must be an array'); return; }

                const db = validation.library!.libraryService;
                for (const item of items) {
                    await db.updateTag(item.id, { sort_index: item.sort_index });
                }
                this.broadcastTagEvent('tag::updated', libraryId, { items, libraryId });
                this.sendSuccess(res, { updated: items.length }, 'Sort index updated');
            } catch (error) {
                console.error('Update tag sort-index error:', error);
                this.sendError(res, 500, 'Internal server error');
            }
        });

        // 删除标签
        this.router.delete('/delete', async (req: Request, res: Response) => {
            await this.handleCrudOperation(req, res, 'delete', 'deleteTag', {
                requiresId: true,
                successMessage: 'Tag deleted successfully',
                onSuccess: (_, libraryId) => {
                    const id = req.body.id;
                    this.broadcastTagEvent('tag::deleted', libraryId, { id, libraryId });
                }
            });
        });

        // 为文件设置标签
        this.router.post('/file/set', async (req: Request, res: Response) => {
            try {
                const libraryId = req.body.libraryId || req.query.libraryId as string;
                const fileId = req.body.fileId;
                const tags: string[] = req.body.tags;

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
                const tagIds: string[] = [];

                for (const tag of tags) {
                    // 已经是纯数字（标签ID），直接用
                    if (/^\d+$/.test(tag)) {
                        tagIds.push(tag);
                        continue;
                    }
                    // 按名称查找
                    const found = await db.queryTag({ title: tag });
                    if (found.length > 0) {
                        tagIds.push(String(found[0].id));
                    } else {
                        const newId = await db.createTag({ title: tag });
                        tagIds.push(String(newId));
                    }
                }

                const result = await db.setFileTags(fileId, tagIds);
                if (result.success) {
                    const updatedFile = await db.getFile(parseInt(fileId));
                    this.broadcastTagEvent('file::updated', libraryId, {
                        ...updatedFile, libraryId, fileId: parseInt(fileId), old_data: result.oldData,
                    });
                }
                this.sendSuccess(res, { fileId, tags: tagIds, success: result.success, old_data: result.oldData }, 'File tags set successfully');
            } catch (error) {
                console.error('Set file tags error:', error);
                this.sendError(res, 500, 'Internal server error');
            }
        });

        // 获取文件的标签
        this.router.get('/file/:fileId', async (req: Request, res: Response) => {
            await this.handleFileAssociation(req, res, 'get', 'getFileTags', 'tags');
        });
    }

    private broadcastTagEvent(eventName: string, libraryId: string, data: any) {
        if (!this.backend.webSocketServer) return;
        this.backend.webSocketServer.broadcastPluginEvent(eventName, data);
        this.backend.webSocketServer.broadcastLibraryEvent(libraryId, eventName, data);
    }

    public getRouter(): Router {
        return this.router;
    }
}
