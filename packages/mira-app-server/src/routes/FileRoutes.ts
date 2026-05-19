import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { MiraServer } from '../server';

export class FileRoutes {
    private router: Router;
    private backend: MiraServer;
    private upload!: multer.Multer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
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
    }

    private setupRoutes(): void {
        // 上传文件到资源库
        this.router.post('/upload', this.upload.array('files'), async (req: Request, res: Response) => {
            const { libraryId, sourcePath, fileId } = req.body; // sourcePath是用户的本地文件位置，用来验证是否上传成功
            const clientId = req.body.clientId || null;
            const fields = req.body.fields ? JSON.parse(req.body.fields) : null;
            const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
            const obj = this.backend.libraries!.getLibrary(libraryId);
            if (!obj) return res.status(404).send('Library not found');

            // 检查是否为更新操作
            const isUpdateOperation = fileId && fileId.trim();
            let existingFile = null;

            if (isUpdateOperation) {
                try {
                    existingFile = await obj.libraryService.getFile(parseInt(fileId));
                    if (!existingFile) {
                        return res.status(404).send('File to update not found');
                    }
                } catch (error) {
                    return res.status(400).send('Invalid file ID for update operation');
                }
            }

            // 解析上传的文件
            const files = req.files as Express.Multer.File[];

            // 如果是更新操作且没有文件，则只更新元数据
            if (isUpdateOperation && (!files || !files.length)) {
                try {
                    const { tags, folder_id } = payload?.data || {};
                    const updateData: Record<string, any> = {
                        tags: JSON.stringify(tags || []),
                        folder_id: folder_id || existingFile.folder_id,
                        imported_at: Date.now(),
                    };

                    const updateSuccess = await obj.libraryService.updateFile(parseInt(fileId), updateData);

                    let result = null;
                    if (updateSuccess) {
                        result = await obj.libraryService.getFile(parseInt(fileId));
                    }

                    const response = {
                        results: [{
                            success: updateSuccess,
                            file: null,
                            result,
                            operation: 'metadata_update'
                        }]
                    };

                    // 发送WebSocket事件
                    if (this.backend.webSocketServer && updateSuccess) {
                        this.backend.webSocketServer.broadcastPluginEvent('file::updated', {
                            message: {
                                type: 'file',
                                action: 'metadata_update',
                                fields,
                                payload
                            },
                            result,
                            libraryId,
                            fileId: parseInt(fileId)
                        });
                        this.backend.webSocketServer?.broadcastLibraryEvent(libraryId, 'file::updated', {
                            ...result,
                            libraryId,
                            fileId: parseInt(fileId)
                        });

                        if (clientId) {
                            const ws = this.backend.webSocketServer?.getWsClientById(libraryId, clientId);
                            ws && this.backend.webSocketServer?.sendToWebsocket(ws, {
                                eventName: 'file::updated',
                                data: { fileId: parseInt(fileId) }
                            });
                        }

                    }

                    return res.send(response);
                } catch (error) {
                    console.error('Error updating file metadata:', error);
                    return res.status(500).send('Internal server error while updating file metadata.');
                }
            }

            // 如果不是更新操作，或者是更新操作但有文件，则需要文件
            if (!files || !files.length) return res.status(400).send('No files uploaded.');

            try {
                const results = [];
                for (const file of files) {
                    try {
                        // 生成唯一文件名并保存文件
                        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                        const { tags, folder_id } = payload?.data || {}

                        let result;

                        if (isUpdateOperation) {
                            // 更新操作：更新文件内容和元数据
                            const updateData: Record<string, any> = {
                                name: req.body.name || originalName,
                                tags: JSON.stringify(tags || []),
                                folder_id: folder_id || existingFile.folder_id,
                                size: file.size,
                                imported_at: Date.now(),
                            };

                            // 处理物理文件替换
                            try {
                                const existingFilePath = await obj.libraryService.getItemFilePath(existingFile);
                                if (existingFilePath && require('fs').existsSync(existingFilePath)) {
                                    // 删除旧文件
                                    require('fs').unlinkSync(existingFilePath);
                                }

                                // 计算新文件的目标路径
                                const targetDir = await obj.libraryService.getItemPath({ ...existingFile, ...updateData });
                                const targetPath = require('path').join(targetDir, updateData.name);

                                // 确保目标目录存在
                                if (!require('fs').existsSync(targetDir)) {
                                    require('fs').mkdirSync(targetDir, { recursive: true });
                                }

                                // 移动新文件到正确位置
                                require('fs').renameSync(file.path, targetPath);

                                // 更新数据库中的path字段
                                updateData.path = targetPath;
                            } catch (fileError) {
                                console.error('File handling error during update:', fileError);
                                throw new Error('Failed to update file content');
                            }

                            // 更新文件记录
                            const updateSuccess = await obj.libraryService.updateFile(parseInt(fileId), updateData);

                            if (updateSuccess) {
                                // 获取更新后的文件信息
                                result = await obj.libraryService.getFile(parseInt(fileId));
                            }

                            results.push({
                                success: updateSuccess,
                                file: file.path,
                                result,
                                operation: 'update'
                            });

                            // 发送WebSocket事件
                            if (this.backend.webSocketServer && updateSuccess) {
                                this.backend.webSocketServer.broadcastPluginEvent('file::updated', {
                                    message: {
                                        type: 'file',
                                        action: 'update',
                                        fields,
                                        payload
                                    },
                                    result,
                                    libraryId,
                                    fileId: parseInt(fileId)
                                });

                                if (clientId) {
                                    const ws = this.backend.webSocketServer?.getWsClientById(libraryId, clientId);
                                    ws && this.backend.webSocketServer?.sendToWebsocket(ws, {
                                        eventName: 'file::updated',
                                        data: { path: sourcePath, fileId: parseInt(fileId) }
                                    });
                                    this.backend.webSocketServer?.broadcastLibraryEvent(libraryId, 'file::updated', {
                                        ...result,
                                        libraryId,
                                        fileId: parseInt(fileId)
                                    });
                                }
                            }
                        } else {
                            // 创建操作（原有逻辑）
                            const fileData = {
                                name: req.body.name || originalName,
                                tags: JSON.stringify(tags || []),
                                folder_id: folder_id || null,
                            };

                            result = await obj.libraryService.createFileFromPath(file.path, fileData, { importType: 'move' }); // 使用move上传完成后自动删除临时文件
                            results.push({
                                success: true,
                                file: file.path,
                                result,
                                operation: 'create'
                            });

                            // 发送WebSocket事件
                            if (this.backend.webSocketServer) {
                                this.backend.webSocketServer.broadcastPluginEvent('file::created', {
                                    message: {
                                        type: 'file',
                                        action: 'create',
                                        fields, payload
                                    }, result, libraryId
                                });

                                this.backend.webSocketServer?.broadcastLibraryEvent(libraryId, 'file::created', { ...result, libraryId });

                                if (clientId) {
                                    const ws = this.backend.webSocketServer?.getWsClientById(libraryId, clientId);
                                    ws && this.backend.webSocketServer?.sendToWebsocket(ws, { eventName: 'file::uploaded', data: { path: sourcePath } });
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing file ${file.originalname}:`, error);
                        results.push({
                            success: false,
                            file: file.path,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
                res.send({ results });
            } catch (error) {
                console.error('Error uploading files:', error);
                res.status(500).send('Internal server error while processing the upload.');
            }
        });

        // 获取文件缩略图
        this.router.get('/thumb/:libraryId/:id', async (req: Request, res: Response) => {
            try {
                const ret = await this.parseLibraryItem(req, res);
                if (ret) {
                    const thumbPath = await ret.library.getItemThumbPath(ret.item, { isNetworkImage: false });
                    if (!fs.existsSync(thumbPath)) return res.status(404).send('Thumbnail not found');

                    res.setHeader('Content-Type', 'image/png');
                    fs.createReadStream(thumbPath).pipe(res);
                }
            } catch (err) {
                console.error('Error serving thumbnail:', err);
                res.status(500).send('Internal server error');
            }
        });

        // 获取文件内容 - 支持 Range 请求
        this.router.get('/file/:libraryId/:id', async (req: Request, res: Response) => {
            const ret = await this.parseLibraryItem(req, res);
            if (ret) {
                const filePath = await ret.library.getItemFilePath(ret.item);
                if (!filePath || !fs.existsSync(filePath)) {
                    return res.status(404).send('File not found');
                }

                const fileExt = path.extname(filePath).toLowerCase();
                const contentType = this.getContentType(fileExt);

                // 获取文件大小
                const stats = fs.statSync(filePath);
                const fileSize = stats.size;

                // 添加文件名到响应头
                const fileName = ret.item.name || path.basename(filePath);
                res.setHeader('X-File-Name', encodeURIComponent(fileName));

                // 检查是否为 Range 请求
                const range = req.headers.range;

                if (range) {
                    // 处理 Range 请求
                    // Processing Range request

                    // 解析 Range 头: "bytes=start-end"
                    const matches = range.match(/bytes=(\d*)-(\d*)/);
                    if (!matches) {
                        return res.status(416).send('Invalid Range header format');
                    }

                    const start = matches[1] ? parseInt(matches[1], 10) : 0;
                    const end = matches[2] ? parseInt(matches[2], 10) : fileSize - 1;

                    // 验证范围
                    if (start >= fileSize || end >= fileSize || start > end) {
                        res.setHeader('Content-Range', `bytes */${fileSize}`);
                        return res.status(416).send('Range Not Satisfiable');
                    }

                    const chunkSize = (end - start) + 1;

                    // 设置 206 Partial Content 响应头
                    res.status(206);
                    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                    res.setHeader('Accept-Ranges', 'bytes');
                    res.setHeader('Content-Length', chunkSize);
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Cache-Control', 'public, max-age=3600');

                    // 创建指定范围的文件流
                    const stream = fs.createReadStream(filePath, { start, end });

                    // 处理流错误
                    stream.on('error', (error) => {
                        console.error('Stream error:', error);
                        if (!res.headersSent) {
                            res.status(500).send('Stream error');
                        }
                    });

                    stream.pipe(res);

                    // Range request served
                } else {
                    // 非 Range 请求，返回完整文件
                    res.setHeader('Accept-Ranges', 'bytes');
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Length', fileSize);
                    res.setHeader('Cache-Control', 'public, max-age=3600');
                    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

                    // 创建完整文件流
                    const stream = fs.createReadStream(filePath);

                    // 处理流错误
                    stream.on('error', (error) => {
                        console.error('Stream error:', error);
                        if (!res.headersSent) {
                            res.status(500).send('Stream error');
                        }
                    });

                    stream.pipe(res);

                    // Full file served
                }
            }
        });

        // 删除文件
        this.router.delete('/:libraryId/:id', async (req: Request, res: Response) => {
            try {
                const { libraryId, id } = req.params;
                const obj = this.backend.libraries!.getLibrary(libraryId);

                if (!obj) {
                    return res.status(404).json({
                        success: false,
                        error: 'Library not found',
                        libraryId
                    });
                }

                // 获取文件信息
                const item = await obj.libraryService.getFile(parseInt(id));
                if (!item) {
                    return res.status(404).json({
                        success: false,
                        error: 'File not found',
                        libraryId,
                        fileId: id
                    });
                }

                // 获取文件路径
                const filePath = await obj.libraryService.getItemFilePath(item);

                // 删除数据库记录
                const deleteSuccess = await obj.libraryService.deleteFile(parseInt(id));

                if (!deleteSuccess) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete file from database',
                        libraryId,
                        fileId: id
                    });
                }

                // 删除物理文件
                if (filePath && fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`Physical file deleted: ${filePath}`);
                    } catch (fileError) {
                        console.error(`Error deleting physical file ${filePath}:`, fileError);
                        // 文件删除失败但数据库记录已删除，记录警告但不返回错误
                    }
                }

                // 删除缩略图
                try {
                    const thumbPath = await obj.libraryService.getItemThumbPath(item, { isNetworkImage: false });
                    if (thumbPath && fs.existsSync(thumbPath)) {
                        fs.unlinkSync(thumbPath);
                        console.log(`Thumbnail deleted: ${thumbPath}`);
                    }
                } catch (thumbError) {
                    console.error(`Error deleting thumbnail:`, thumbError);
                    // 缩略图删除失败不影响整体操作
                }

                const response = {
                    success: true,
                    message: 'File deleted successfully',
                    deletedFile: {
                        id: parseInt(id),
                        name: item.name,
                        libraryId: libraryId,
                        deletedAt: new Date().toISOString()
                    }
                };

                // 发送WebSocket事件
                if (this.backend.webSocketServer) {
                    this.backend.webSocketServer.broadcastPluginEvent('file::deleted', {
                        message: {
                            type: 'file',
                            action: 'delete'
                        },
                        result: response.deletedFile,
                        libraryId,
                        fileId: parseInt(id)
                    });

                    this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::deleted', {
                        ...response.deletedFile,
                        libraryId,
                        fileId: parseInt(id)
                    });
                }

                res.json(response);

            } catch (error) {
                console.error('Error deleting file:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error while deleting file',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // 获取文件列表 - 支持过滤参数
        this.router.post('/getFiles', async (req: Request, res: Response) => {
            try {
                const { libraryId, filters = {}, isUrlFile = false } = req.body;
                console.log({filters})
                if (!libraryId) {
                    return res.status(400).json({
                        code: 400,
                        message: 'Library ID is required',
                        data: null
                    });
                }

                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Library not found',
                        data: null
                    });
                }

                const files = await obj.libraryService.getFiles({
                    filters: filters,
                    isUrlFile: isUrlFile || obj.libraryService.useHttpFile,
                });

                res.json({
                    code: 0,
                    message: 'Success',
                    data: files
                });

            } catch (error) {
                console.error('Error getting files:', error);
                res.status(500).json({
                    code: 500,
                    message: 'Internal server error while getting files',
                    data: null
                });
            }
        });

        // 获取单个文件信息
        this.router.post('/getFile', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId } = req.body;

                if (!libraryId) {
                    return res.status(400).json({
                        code: 400,
                        message: 'Library ID is required',
                        data: null
                    });
                }

                if (!fileId) {
                    return res.status(400).json({
                        code: 400,
                        message: 'File ID is required',
                        data: null
                    });
                }

                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Library not found',
                        data: null
                    });
                }

                const file = await obj.libraryService.getFile(parseInt(fileId));
                if (!file) {
                    return res.status(404).json({
                        code: 404,
                        message: 'File not found',
                        data: null
                    });
                }

                res.json({
                    code: 0,
                    message: 'Success',
                    data: file
                });

            } catch (error) {
                console.error('Error getting file:', error);
                res.status(500).json({
                    code: 500,
                    message: 'Internal server error while getting file',
                    data: null
                });
            }
        });
    }

    private async parseLibraryItem(req: Request, res: Response): Promise<{ library: any, item: any } | void> {
        const { libraryId, id } = req.params;
        const obj = this.backend.libraries!.getLibrary(libraryId);
        if (!obj) {
            res.status(404).send('Library not found');
            return;
        }

        const item = await obj.libraryService.getFile(parseInt(id));
        if (!item) {
            res.status(404).send('Item not found');
            return;
        }
        return { library: obj.libraryService, item };
    }

    private getContentType(ext: string): string {
        const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.json': 'application/json',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.zip': 'application/zip',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    public getRouter(): Router {
        return this.router;
    }
}