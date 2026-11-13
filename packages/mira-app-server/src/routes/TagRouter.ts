import { Router, Request, Response } from 'express';
import { MiraServer } from '../server';
import { BaseRouter } from './BaseRouter';
import { resolveTagIds } from './FileAssociationResolver';

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
                const file = await db.getFile(parseInt(fileId));
                if (!file) {
                    this.sendError(res, 404, 'File not found');
                    return;
                }
                if (Number(file.recycled) === 1) {
                    this.sendError(res, 409, 'Cannot update a recycled file');
                    return;
                }
                const tagIds = await resolveTagIds(db, tags);

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

        // 批量为多个文件设置标签（一个请求，替代客户端逐文件调用 /file/set）
        this.router.post('/file/set-batch', async (req: Request, res: Response) => {
            try {
                const libraryId = req.body.libraryId || req.query.libraryId as string;
                const rawFileIds: unknown[] = Array.isArray(req.body.fileIds) ? req.body.fileIds : [];
                const fileIds = [...new Set(rawFileIds.map((id: unknown) => parseInt(String(id))).filter((id: number) => Number.isInteger(id)))];
                const tags: string[] = req.body.tags;

                if (fileIds.length === 0) {
                    res.status(400).json({ code: 400, message: 'fileIds must be a non-empty array', data: null });
                    return;
                }

                const validation = await this.validateLibrary(libraryId);
                if (!validation.success) {
                    res.status(validation.error!.code).json(validation.error);
                    return;
                }

                const { library } = validation;
                const db = library.libraryService;
                // 标签名只需解析/创建一次，所有文件共享同一份 tagIds
                const tagIds = await resolveTagIds(db, Array.isArray(tags) ? tags : []);

                const results: Array<{ fileId: number; success: boolean; error?: string }> = [];
                for (const fileId of fileIds) {
                    try {
                        const file = await db.getFile(fileId);
                        if (!file) {
                            results.push({ fileId, success: false, error: 'File not found' });
                            continue;
                        }
                        if (Number(file.recycled) === 1) {
                            results.push({ fileId, success: false, error: 'Cannot update a recycled file' });
                            continue;
                        }
                        const result = await db.setFileTags(fileId, tagIds);
                        if (result.success) {
                            const updatedFile = await db.getFile(fileId);
                            this.broadcastTagEvent('file::updated', libraryId, {
                                ...updatedFile, libraryId, fileId, old_data: result.oldData,
                            });
                        }
                        results.push({ fileId, success: result.success });
                    } catch (err) {
                        results.push({ fileId, success: false, error: err instanceof Error ? err.message : String(err) });
                    }
                }

                const updated = results.filter(r => r.success).length;
                this.sendSuccess(res, { updated, failed: results.length - updated, results, tags: tagIds }, 'Batch file tags set successfully');
            } catch (error) {
                console.error('Batch set file tags error:', error);
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
