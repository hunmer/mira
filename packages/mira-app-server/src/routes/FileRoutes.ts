import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { MiraServer } from '../server';
import { canAccessLibrary } from '../middleware/permission';

export class FileRoutes {
    private router: Router;
    private backend: MiraServer;
    private upload!: multer.Multer;
    private coverUpload!: multer.Multer;

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
        this.coverUpload = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 },
        });
    }

    private setupRoutes(): void {
        // 上传文件到资源库
        this.router.post('/upload', this.upload.array('files'), async (req: Request, res: Response) => {
            const { libraryId, sourcePath, fileId } = req.body; // sourcePath是用户的本地文件位置，用来验证是否上传成功
            const clientId = req.body.clientId || null;
            const isBatchImport = req.body.batchImport === 'true' || req.body.batchImport === true;
            const batchId = isBatchImport ? randomUUID() : undefined;
            // 为每次 HTTP 上传请求生成独立标识，避免客户端通知聚合跨请求累计。
            const uploadBatchId = randomUUID();
            const urlItems = isBatchImport && req.body.urlItems
                ? JSON.parse(req.body.urlItems)
                : [];
            const fields = req.body.fields ? JSON.parse(req.body.fields) : null;
            const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
            const uploader = (req as any).user?.id || null;
          console.log('[Upload] req.user:', (req as any).user, '| uploader:', uploader);
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
            const files = (req.files as Express.Multer.File[]) || [];

            // 如果是更新操作且没有文件，则只更新元数据
            if (isUpdateOperation && (!files || !files.length)) {
                try {
                    const { tags, folder_id } = payload?.data || {};
                    const updateData: Record<string, any> = {
                        tags: JSON.stringify(tags || []),
                        folder_id: folder_id || existingFile.folder_id,
                        imported_at: Date.now(),
                    };
                    if (uploader) updateData.uploader = uploader;

                    const { success: updateSuccess, oldData } = await obj.libraryService.updateFile(parseInt(fileId), updateData);

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
                            fileId: parseInt(fileId),
                            old_data: oldData,
                        });

                        if (clientId) {
                            const ws = this.backend.webSocketServer?.getWsClientById(libraryId, clientId);
                            ws && this.backend.webSocketServer?.sendToWebsocket(ws, {
                                eventName: 'file::updated',
                                data: { fileId: parseInt(fileId), old_data: oldData }
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
            if ((!files || !files.length) && !urlItems.length) return res.status(400).send('No files or URLs uploaded.');

            try {
                const results = [];
                let urlBatchId: string | undefined;
                const validUrlItems = urlItems.filter((url: unknown) => typeof url === 'string' && /^https?:\/\//i.test(url));
                if (validUrlItems.length) {
                    const userId = (req as any).user?.id;
                    if (!userId || !this.backend.downloadExecutor) {
                        return res.status(503).send('URL import executor unavailable.');
                    }
                    urlBatchId = await this.backend.downloadExecutor.enqueueBatch(
                        validUrlItems
                            .map((url: string) => ({
                                url,
                                libraryId,
                                userId,
                                folderId: payload?.data?.folder_id ? Number(payload.data.folder_id) : null,
                                clientId,
                            })),
                    );
                }
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
                            if (uploader) updateData.uploader = uploader;

                            // 处理物理文件替换
                            try {
                                const existingFilePath = await obj.libraryService.getItemFilePath(existingFile);
                                // 计算新文件的目标路径
                                const targetDir = await obj.libraryService.getItemPath({ ...existingFile, ...updateData });
                                const targetPath = path.join(targetDir, updateData.name);

                                // 确保目标目录存在
                                if (!fs.existsSync(targetDir)) {
                                    fs.mkdirSync(targetDir, { recursive: true });
                                }

                                const isCrossDevice = path.parse(file.path).root.toLowerCase() !== path.parse(targetPath).root.toLowerCase();
                                if (isCrossDevice) {
                                    console.info('[Upload] Cross-device update, using copy/unlink:', file.path, '->', targetPath);
                                    fs.copyFileSync(file.path, targetPath);
                                    fs.unlinkSync(file.path);
                                } else {
                                    if (existingFilePath && fs.existsSync(existingFilePath)) {
                                        fs.unlinkSync(existingFilePath);
                                    }
                                    try {
                                        fs.renameSync(file.path, targetPath);
                                    } catch (error: any) {
                                        if (error?.code !== 'EXDEV') throw error;
                                        console.info('[Upload] Cross-device update, using copy/unlink:', file.path, '->', targetPath);
                                        fs.copyFileSync(file.path, targetPath);
                                        fs.unlinkSync(file.path);
                                    }
                                }

                                if (existingFilePath && existingFilePath !== targetPath && fs.existsSync(existingFilePath)) {
                                    fs.unlinkSync(existingFilePath);
                                }

                                // 更新数据库中的path字段
                                updateData.path = targetPath;
                            } catch (fileError) {
                                console.error('File handling error during update:', fileError);
                                throw new Error('Failed to update file content');
                            }

                            // 更新文件记录
                            const { success: updateSuccess, oldData } = await obj.libraryService.updateFile(parseInt(fileId), updateData);

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
                                        data: { path: sourcePath, fileId: parseInt(fileId), old_data: oldData }
                                    });
                                    this.backend.webSocketServer?.broadcastLibraryEvent(libraryId, 'file::updated', {
                                        ...result,
                                        libraryId,
                                        fileId: parseInt(fileId),
                                        old_data: oldData,
                                    });
                                }
                            }
                        } else {
                            // 创建操作（原有逻辑）
                            const fileData = {
                                name: req.body.name || originalName,
                                tags: JSON.stringify(tags || []),
                                folder_id: folder_id || null,
                                uploader,
                            };

                            result = await obj.libraryService.createFileFromPath(file.path, fileData, { importType: 'move' }); // 使用move上传完成后自动删除临时文件
                            const isDuplicate = result?.duplicate === true;
                            results.push({
                                success: !isDuplicate,
                                file: file.path,
                                result,
                                operation: isDuplicate ? 'duplicate' : 'create'
                            });

                            // 发送WebSocket事件（命中重复时不广播 file::created，因为并没有新建文件）
                            if (this.backend.webSocketServer && !isDuplicate) {
                                const eventData = {
                                    ...result,
                                    libraryId,
                                    uploadBatchId,
                                    ...(isBatchImport ? { batchImport: true, batchId } : {})
                                };
                                this.backend.webSocketServer.broadcastPluginEvent('file::created', {
                                    message: {
                                        type: 'file',
                                        action: 'create',
                                        fields, payload
                                    }, result: eventData, libraryId
                                });

                                this.backend.webSocketServer?.broadcastLibraryEvent(libraryId, 'file::created', eventData);
                            }

                            // 命中重复也向上传方回传 file::uploaded（带 duplicate 标记），让前端能给出"已存在，已跳过"的提示
                            if (this.backend.webSocketServer && clientId) {
                                const ws = this.backend.webSocketServer?.getWsClientById(libraryId, clientId);
                                ws && this.backend.webSocketServer?.sendToWebsocket(ws, {
                                    eventName: 'file::uploaded',
                                    data: isDuplicate ? { path: sourcePath, duplicate: true } : { path: sourcePath }
                                });
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
                if (this.backend.webSocketServer && files.length > 0) {
                    const imported = results.filter((item: any) => item.operation === 'create' && item.success).length;
                    const skipped = results.filter((item: any) => item.operation === 'duplicate').length;
                    const failed = results.filter((item: any) => !item.success && item.operation !== 'duplicate').length;
                    this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::upload-completed', {
                        uploadBatchId,
                        total: files.length,
                        imported,
                        skipped,
                        failed,
                    });
                }
                res.send(isBatchImport ? {
                    batchId: batchId || urlBatchId,
                    urlBatchId,
                    total: files.length + validUrlItems.length,
                    results,
                } : { results });
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

        // 获取容器格式插件暴露的附属文件列表，真实解压路径不对外返回。
        this.router.get('/extra/:libraryId/:fileId', async (req: Request, res: Response) => {
            try {
                if (!this.canAccessExtraFileLibrary(req)) return res.status(403).json({ code: 403, message: 'Access denied' });
                const ret = await this.resolveExtraFileSource(req.params.libraryId, req.params.fileId);
                if (!ret) return res.status(404).json({ code: 404, message: 'File not found' });
                const files = await ret.pluginManager.getExtraFileList(ret.filePath, {
                    libraryId: req.params.libraryId,
                    fileId: req.params.fileId,
                });
                if (!files) return res.status(404).json({ code: 404, message: 'File format has no extra files' });
                res.json({ code: 0, data: files });
            } catch (error) {
                console.error('Error listing extra files:', error);
                res.status(400).json({ code: 400, message: error instanceof Error ? error.message : 'Failed to list extra files' });
            }
        });

        // 文件名由格式插件解析；这里只流式返回插件确认过的临时文件。
        this.router.get('/extra/:libraryId/:fileId/*', async (req: Request, res: Response) => {
            try {
                if (!this.canAccessExtraFileLibrary(req)) return res.status(403).send('Access denied');
                const ret = await this.resolveExtraFileSource(req.params.libraryId, req.params.fileId);
                if (!ret) return res.status(404).send('File not found');
                const fileName = req.params[0];
                if (!fileName) return res.status(400).send('Extra file name is required');
                const extraPath = await ret.pluginManager.getExtraFile(ret.filePath, fileName, {
                    libraryId: req.params.libraryId,
                    fileId: req.params.fileId,
                });
                if (!extraPath || !fs.existsSync(extraPath)) return res.status(404).send('Extra file not found');
                const stat = await fs.promises.stat(extraPath);
                if (!stat.isFile()) return res.status(404).send('Extra file not found');
                res.setHeader('Content-Type', this.getContentType(path.extname(extraPath).toLowerCase()));
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Cache-Control', 'private, max-age=86400');
                fs.createReadStream(extraPath).pipe(res);
            } catch (error) {
                console.error('Error serving extra file:', error);
                res.status(400).send(error instanceof Error ? error.message : 'Failed to serve extra file');
            }
        });

        // 覆盖素材缩略图；客户端裁切组件统一导出 PNG。
        this.router.post('/cover/:libraryId/:id', this.coverUpload.single('cover'), async (req: Request, res: Response) => {
            try {
                const { libraryId, id } = req.params;
                const fileId = Number(id);
                const cover = req.file;
                if (!Number.isInteger(fileId) || fileId <= 0 || !cover) {
                    return res.status(400).json({ code: 400, message: 'Valid file id and cover are required' });
                }
                if (!cover.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
                    return res.status(400).json({ code: 400, message: 'Cover must be a PNG image' });
                }

                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) return res.status(404).json({ code: 404, message: 'Library not found' });
                const item = await obj.libraryService.getFile(fileId);
                if (!item) return res.status(404).json({ code: 404, message: 'File not found' });

                const thumbPath = await obj.libraryService.getItemThumbPath(item, { isNetworkImage: false });
                await fs.promises.mkdir(path.dirname(thumbPath), { recursive: true });
                await fs.promises.writeFile(thumbPath, cover.buffer);
                await obj.libraryService.updateFile(fileId, { thumb: 1 });

                const result = await obj.libraryService.getFile(fileId);
                result.thumb = await obj.libraryService.getItemThumbPath(result, { isUrlFile: true });
                this.backend.webSocketServer?.broadcastLibraryEvent(libraryId, 'thumbnail::generated', result);
                res.json({ code: 0, message: 'Cover updated', data: result });
            } catch (error) {
                console.error('Error setting file cover:', error);
                res.status(500).json({ code: 500, message: 'Failed to set cover' });
            }
        });

        // JIT HLS 播放列表：只描述时间轴，分片在播放器请求时生成
        this.router.get('/preview/:libraryId/:fileId/index.m3u8', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId } = req.params;
                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) return res.status(404).send('Library not found');
                const item = await obj.libraryService.getFile(parseInt(fileId, 10));
                if (!item) return res.status(404).send('File not found');
                const filePath = await obj.libraryService.getItemFilePath(item);
                if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

                const tokenQuery = typeof req.query.token === 'string'
                    ? `?token=${encodeURIComponent(req.query.token)}`
                    : '';
                const playlist = await this.backend.thumbnailService.getHlsPlaylist(
                    filePath,
                    path.join(this.backend.dataPath, 'temp', 'previews'),
                    `${libraryId}:${fileId}`,
                    tokenQuery,
                );
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.setHeader('Cache-Control', 'private, max-age=3600');
                res.send(playlist);
            } catch (err) {
                console.error('Error generating HLS playlist:', err);
                res.status(500).send('HLS playlist generation failed');
            }
        });

        // JIT HLS 分片：按进度条请求的序号转换，完成后从 temp 缓存流式返回
        this.router.get('/preview/:libraryId/:fileId/segment/:segment.ts', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId, segment } = req.params;
                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) return res.status(404).send('Library not found');
                const item = await obj.libraryService.getFile(parseInt(fileId, 10));
                if (!item) return res.status(404).send('File not found');
                const filePath = await obj.libraryService.getItemFilePath(item);
                if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

                const segmentPath = await this.backend.thumbnailService.getHlsSegmentPath(
                    filePath,
                    path.join(this.backend.dataPath, 'temp', 'previews'),
                    `${libraryId}:${fileId}`,
                    Number(segment),
                );
                const stat = await fs.promises.stat(segmentPath);
                res.setHeader('Content-Type', 'video/mp2t');
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Cache-Control', 'private, max-age=86400');
                fs.createReadStream(segmentPath).pipe(res);
            } catch (err) {
                if (err instanceof RangeError) return res.status(400).send(err.message);
                console.error('Error generating HLS segment:', err);
                res.status(500).send('HLS segment generation failed');
            }
        });

        // 按需生成浏览器可展示的大图，结果只缓存到服务端 temp 目录
        this.router.get('/preview/:libraryId/:fileId', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId } = req.params;
                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) return res.status(404).send('Library not found');

                const item = await obj.libraryService.getFile(parseInt(fileId, 10));
                if (!item) return res.status(404).send('File not found');
                const filePath = await obj.libraryService.getItemFilePath(item);
                if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

                const previewPath = await this.backend.thumbnailService.getPreviewPath(
                    filePath,
                    path.join(this.backend.dataPath, 'temp', 'previews'),
                    `${libraryId}:${fileId}`,
                );
                const stat = await fs.promises.stat(previewPath);
                res.setHeader('Content-Type', 'image/webp');
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Cache-Control', 'private, max-age=86400');
                fs.createReadStream(previewPath).on('error', (error) => {
                    console.error('Preview stream error:', error);
                    if (!res.headersSent) res.status(500).send('Preview stream error');
                }).pipe(res);
            } catch (err) {
                console.error('Error generating preview:', err);
                res.status(500).send('Preview generation failed');
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
                    const disposition = contentType === 'application/pdf' ? 'inline' : 'attachment';
                    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);

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

        // 清空回收站（需要 admin 权限）
        this.router.delete('/:libraryId/trash', async (req: Request, res: Response) => {
            try {
                const user = (req as any).user;
                if (!user || (user.role !== 'admin' && user.role !== 'super')) {
                    return res.status(403).json({
                        success: false,
                        error: '权限不足，清空回收站需要管理员权限',
                    });
                }

                const { libraryId } = req.params;
                const obj = this.backend.libraries!.getLibrary(libraryId);

                if (!obj) {
                    return res.status(404).json({
                        success: false,
                        error: 'Library not found',
                        libraryId
                    });
                }

                const result = await obj.libraryService.emptyTrash();

                // 广播 WebSocket 事件
                if (this.backend.webSocketServer) {
                    this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'files::trash-emptied', {
                        libraryId,
                        deletedCount: result.deletedCount
                    });
                }

                res.json({
                    success: true,
                    message: `清空回收站完成，删除 ${result.deletedCount} 个文件`,
                    deletedCount: result.deletedCount,
                    errors: result.errors.length > 0 ? result.errors : undefined
                });
            } catch (error) {
                console.error('Error emptying trash:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error while emptying trash',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // 批量删除文件（默认移入回收站，moveToRecycleBin=false 时彻底删除）
        this.router.post('/batch-delete', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileIds, moveToRecycleBin } = req.body;

                if (!libraryId || !Array.isArray(fileIds) || fileIds.length === 0) {
                    return res.status(400).json({
                        code: 400,
                        message: 'libraryId and non-empty fileIds array are required',
                        data: null
                    });
                }
                if (fileIds.length > 1000) {
                    return res.status(400).json({
                        code: 400,
                        message: 'fileIds cannot contain more than 1000 items',
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

                const toRecycleBin = moveToRecycleBin !== false;
                const deletedAt = new Date().toISOString();
                const deletedIds: number[] = [];
                const failedIds: number[] = [];

                for (const rawId of fileIds) {
                    const id = Number(rawId);
                    if (!Number.isSafeInteger(id)) {
                        failedIds.push(rawId);
                        continue;
                    }
                    try {
                        const item = await obj.libraryService.getFile(id);
                        if (!item) {
                            failedIds.push(id);
                            continue;
                        }

                        const deleteSuccess = await obj.libraryService.deleteFile(id, { moveToRecycleBin: toRecycleBin });
                        if (!deleteSuccess) {
                            failedIds.push(id);
                            continue;
                        }

                        // 仅在彻底删除时才删除物理文件和缩略图（与单个删除路由保持一致）
                        if (!toRecycleBin) {
                            const filePath = await obj.libraryService.getItemFilePath(item);
                            if (filePath && fs.existsSync(filePath)) {
                                try {
                                    fs.unlinkSync(filePath);
                                } catch (fileError) {
                                    console.error(`Error deleting physical file ${filePath}:`, fileError);
                                }
                            }

                            try {
                                const thumbPath = await obj.libraryService.getItemThumbPath(item, { isNetworkImage: false });
                                if (thumbPath && fs.existsSync(thumbPath)) {
                                    fs.unlinkSync(thumbPath);
                                }
                            } catch (thumbError) {
                                console.error(`Error deleting thumbnail:`, thumbError);
                            }
                        }

                        deletedIds.push(id);

                        // 与单个删除路由保持一致的事件结构，逐个广播 file::deleted
                        if (this.backend.webSocketServer) {
                            const deletedFile = {
                                id,
                                name: item.name,
                                libraryId,
                                deletedAt
                            };
                            this.backend.webSocketServer.broadcastPluginEvent('file::deleted', {
                                message: { type: 'file', action: 'delete' },
                                result: deletedFile,
                                libraryId,
                                fileId: id
                            });
                            this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::deleted', {
                                ...deletedFile,
                                libraryId,
                                fileId: id
                            });
                        }
                    } catch (itemError) {
                        console.error(`Error deleting file ${id} in batch:`, itemError);
                        failedIds.push(id);
                    }
                }

                res.json({
                    success: failedIds.length === 0,
                    message: failedIds.length === 0
                        ? `Deleted ${deletedIds.length} files successfully`
                        : `Deleted ${deletedIds.length} files, ${failedIds.length} failed`,
                    deletedCount: deletedIds.length,
                    deletedIds,
                    failedIds
                });
            } catch (error) {
                console.error('Error batch deleting files:', error);
                res.status(500).json({
                    code: 500,
                    message: 'Internal server error while batch deleting files',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // 批量恢复文件（从回收站还原）
        this.router.post('/batch-recover', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileIds } = req.body;

                if (!libraryId || !Array.isArray(fileIds) || fileIds.length === 0) {
                    return res.status(400).json({
                        code: 400,
                        message: 'libraryId and non-empty fileIds array are required',
                        data: null
                    });
                }
                if (fileIds.length > 1000) {
                    return res.status(400).json({
                        code: 400,
                        message: 'fileIds cannot contain more than 1000 items',
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

                const recoveredIds: number[] = [];
                const failedIds: number[] = [];

                for (const rawId of fileIds) {
                    const id = Number(rawId);
                    if (!Number.isSafeInteger(id)) {
                        failedIds.push(rawId);
                        continue;
                    }
                    try {
                        // 获取恢复前的文件信息（用于事件携带 folder_id）
                        const before = await obj.libraryService.getFile(id);
                        const success = await obj.libraryService.recoverFile(id);
                        if (!success) {
                            failedIds.push(id);
                            continue;
                        }

                        recoveredIds.push(id);

                        // 与单个恢复路由保持一致的事件结构，逐个广播 file::recovered
                        const result = await obj.libraryService.getFile(id);
                        this.broadcastFileEvent('file::recovered', libraryId, result, id, before ? { folder_id: before.folder_id, recycled: 1 } : undefined);
                        if (this.backend.webSocketServer) {
                            this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::recovered', { recovered: 1, libraryId, fileId: id });
                        }
                    } catch (itemError) {
                        console.error(`Error recovering file ${id} in batch:`, itemError);
                        failedIds.push(id);
                    }
                }

                res.json({
                    success: failedIds.length === 0,
                    message: failedIds.length === 0
                        ? `Recovered ${recoveredIds.length} files successfully`
                        : `Recovered ${recoveredIds.length} files, ${failedIds.length} failed`,
                    recoveredCount: recoveredIds.length,
                    recoveredIds,
                    failedIds
                });
            } catch (error) {
                console.error('Error batch recovering files:', error);
                res.status(500).json({
                    code: 500,
                    message: 'Internal server error while batch recovering files',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // 恢复文件（从回收站还原）
        this.router.post('/recover', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId } = req.body;

                if (!libraryId || !fileId) {
                    return res.status(400).json({
                        code: 400,
                        message: 'libraryId and fileId are required',
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

                // 获取恢复前的文件信息（用于事件携带 folder_id）
                const before = await obj.libraryService.getFile(parseInt(fileId));

                const success = await obj.libraryService.recoverFile(parseInt(fileId));
                if (!success) {
                    return res.status(500).json({
                        code: 500,
                        message: 'Failed to recover file',
                        data: null
                    });
                }

                const result = await obj.libraryService.getFile(parseInt(fileId));
                const response = {
                    success: true,
                    message: 'File recovered successfully',
                    recoveredFile: {
                        id: parseInt(fileId),
                        name: result?.name,
                        libraryId,
                        folderId: result?.folder_id ?? null,
                        recoveredAt: new Date().toISOString()
                    }
                };

                // 发送 WebSocket 事件
                this.broadcastFileEvent('file::recovered', libraryId, result, parseInt(fileId), before ? { folder_id: before.folder_id, recycled: 1 } : undefined);
                // 标记 recovered，便于回收站 tab 精确匹配刷新
                if (this.backend.webSocketServer) {
                    this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::recovered', { recovered: 1, libraryId, fileId: parseInt(fileId) });
                }

                res.json(response);
            } catch (error) {
                console.error('Error recovering file:', error);
                res.status(500).json({
                    code: 500,
                    message: 'Internal server error while recovering file',
                    details: error instanceof Error ? error.message : String(error)
                });
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

                // 读取 moveToRecycleBin 参数，默认 true（移到回收站）
                const moveToRecycleBin = req.query.moveToRecycleBin !== 'false';

                // 删除数据库记录
                const deleteSuccess = await obj.libraryService.deleteFile(parseInt(id), { moveToRecycleBin });

                if (!deleteSuccess) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete file from database',
                        libraryId,
                        fileId: id
                    });
                }

                // 仅在彻底删除时才删除物理文件和缩略图
                if (!moveToRecycleBin) {
                    if (filePath && fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`Physical file deleted: ${filePath}`);
                        } catch (fileError) {
                            console.error(`Error deleting physical file ${filePath}:`, fileError);
                        }
                    }

                    try {
                        const thumbPath = await obj.libraryService.getItemThumbPath(item, { isNetworkImage: false });
                        if (thumbPath && fs.existsSync(thumbPath)) {
                            fs.unlinkSync(thumbPath);
                            console.log(`Thumbnail deleted: ${thumbPath}`);
                        }
                    } catch (thumbError) {
                        console.error(`Error deleting thumbnail:`, thumbError);
                    }
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

        // 批量获取文件 metadata（瀑布流等布局只需要宽高时使用）
        this.router.post('/metadata', async (req: Request, res: Response) => {
            try {
                const { libraryId, ids, clientId } = req.body;
                if (!libraryId || !Array.isArray(ids)) {
                    return res.status(400).json({ code: 400, message: 'libraryId and ids are required', data: null });
                }
                if (ids.length > 1000) {
                    return res.status(400).json({ code: 400, message: 'ids cannot contain more than 1000 items', data: null });
                }

                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) return res.status(404).json({ code: 404, message: 'Library not found', data: null });

                const allowed = await obj.pluginManager.runHttpHooks({
                    libraryId,
                    clientId,
                    method: req.method,
                    path: '/api/files/metadata',
                    req,
                    res,
                    fields: this.backend.webSocketServer?.getClientFields(libraryId, clientId),
                });
                if (!allowed || res.headersSent) return;

                const fileIds = [...new Set(ids.map((id: unknown) => Number(id)).filter(Number.isSafeInteger))];
                const files = await Promise.all(fileIds.map(id => obj.libraryService.getFile(id)));
                const data = files.filter(Boolean).map(file => {
                    const metadata = file!.metadata && typeof file!.metadata === 'object' ? file!.metadata : undefined;
                    const width = Number(metadata?.width);
                    const height = Number(metadata?.height);
                    return {
                        id: String(file!.id),
                        metadata,
                        ...(Number.isFinite(width) && width > 0 ? { width } : {}),
                        ...(Number.isFinite(height) && height > 0 ? { height } : {}),
                    };
                });

                res.json({ code: 0, message: 'Success', data });
            } catch (error) {
                console.error('Error getting file metadata:', error);
                res.status(500).json({ code: 500, message: 'Internal server error while getting file metadata', data: null });
            }
        });

        // 获取文件列表 - 支持过滤参数
        this.router.post('/getFiles', async (req: Request, res: Response) => {
            try {
                const { libraryId, filters = {}, clientId } = req.body;
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

                const allowed = await obj.pluginManager.runHttpHooks({
                    libraryId,
                    clientId,
                    method: req.method,
                    path: '/api/files/getFiles',
                    req,
                    res,
                    fields: this.backend.webSocketServer?.getClientFields(libraryId, clientId),
                });
                if (!allowed || res.headersSent) return;

                const files = await obj.libraryService.getFiles({
                    filters: filters,
                    isUrlFile: true,
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
                const { libraryId, fileId, clientId } = req.body;

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

                const allowed = await obj.pluginManager.runHttpHooks({
                    libraryId,
                    clientId,
                    method: req.method,
                    path: '/api/files/getFile',
                    req,
                    res,
                    fields: this.backend.webSocketServer?.getClientFields(libraryId, clientId),
                });
                if (!allowed || res.headersSent) return;

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

        // 获取文件可用的全部插件 iframe Viewer
        this.router.post('/getPreviewViewers', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId, clientId } = req.body;
                if (!libraryId || !fileId) {
                    return res.status(400).json({
                        code: 400,
                        message: 'libraryId and fileId are required',
                        data: null
                    });
                }

                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({ code: 404, message: 'Library not found', data: null });
                }

                const allowed = await obj.pluginManager.runHttpHooks({
                    libraryId,
                    clientId,
                    method: req.method,
                    path: '/api/files/getPreviewViewers',
                    req,
                    res,
                    fields: this.backend.webSocketServer?.getClientFields(libraryId, clientId),
                });
                if (!allowed || res.headersSent) return;

                const file = await obj.libraryService.getFile(parseInt(fileId, 10));
                if (!file) {
                    return res.status(404).json({ code: 404, message: 'File not found', data: null });
                }

                const filePath = await obj.libraryService.getItemFilePath(file, { isUrlFile: false });
                const requestToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
                    (typeof req.query.token === 'string' ? req.query.token : '');
                const fileUrl = this.appendToken(
                    await obj.libraryService.getItemFilePath(file, { isUrlFile: true }),
                    requestToken
                );
                const viewers = await obj.pluginManager.getPreviewViewers({
                    libraryId: String(libraryId),
                    fileId: String(fileId),
                    file: { ...file, libraryId },
                    filePath,
                    fileUrl,
                    getExtraFileUrl: (fileName: string) => this.buildExtraFileUrl(fileUrl, libraryId, fileId, fileName, requestToken),
                });

                res.json({
                    code: 0,
                    message: 'Success',
                    data: { libraryId: String(libraryId), fileId: String(fileId), viewers }
                });
            } catch (error) {
                console.error('Error getting preview Viewers:', error);
                res.status(500).json({
                    code: 500,
                    message: 'Internal server error while getting preview Viewers',
                    data: null
                });
            }
        });

        // 重命名文件（含同名检测）
        this.router.post('/rename', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId, name } = req.body;

                if (!libraryId || !fileId || !name) {
                    return res.status(400).json({ code: 400, message: 'libraryId, fileId, name are required' });
                }

                const requestedName = path.basename(String(name).trim());
                if (!requestedName) {
                    return res.status(400).json({ code: 400, message: 'name is required' });
                }

                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) return res.status(404).json({ code: 404, message: 'Library not found' });

                const file = await obj.libraryService.getFile(parseInt(fileId));
                if (!file) return res.status(404).json({ code: 404, message: 'File not found' });

                // 同文件夹下同名检测
                const { result: siblings } = await obj.libraryService.getFiles({
                    filters: { folder: file.folder_id || '=null' },
                });
                const usedNames = new Set(
                    siblings
                        .filter((f: any) => String(f.id) !== String(fileId))
                        .map((f: any) => String(f.name).toLowerCase())
                );
                const extension = path.extname(requestedName);
                const basename = path.basename(requestedName, extension);
                let resolvedName = requestedName;
                for (let index = 1; usedNames.has(resolvedName.toLowerCase()); index++) {
                    resolvedName = `${basename} (${index})${extension}`;
                }

                // 重命名物理文件
                const oldPath = await obj.libraryService.getItemFilePath(file);
                const { success: updated, oldData } = await obj.libraryService.updateFile(parseInt(fileId), { name: resolvedName });

                if (updated && oldPath) {
                    const dir = path.dirname(oldPath);
                    const newPath = path.join(dir, resolvedName);
                    if (fs.existsSync(oldPath) && oldPath !== newPath) {
                        try { fs.renameSync(oldPath, newPath); } catch (e) { console.error('Rename file error:', e); }
                    }
                }

                const result = await obj.libraryService.getFile(parseInt(fileId));
                this.broadcastFileEvent('file::updated', libraryId, result, parseInt(fileId), oldData);

                res.json({ code: 0, message: 'Success', data: result });
            } catch (error) {
                console.error('Error renaming file:', error);
                res.status(500).json({ code: 500, message: 'Internal server error' });
            }
        });

        // 更新文件元数据（website 等）
        this.router.post('/update', async (req: Request, res: Response) => {
            try {
                const { libraryId, fileId, data } = req.body;

                if (!libraryId || !fileId || !data) {
                    return res.status(400).json({ code: 400, message: 'libraryId, fileId, data are required' });
                }

                const obj = this.backend.libraries!.getLibrary(libraryId);
                if (!obj) return res.status(404).json({ code: 404, message: 'Library not found' });

                const file = await obj.libraryService.getFile(parseInt(fileId));
                if (!file) return res.status(404).json({ code: 404, message: 'File not found' });

                // 将 camelCase 映射到 snake_case 列名
                const updateData: Record<string, any> = {};
                if (data.website !== undefined) updateData.website = data.website;
                if (data.notes !== undefined) updateData.notes = data.notes;
                if (data.stars !== undefined) updateData.stars = data.stars;
                if (data.custom_fields !== undefined) updateData.custom_fields = typeof data.custom_fields === 'string' ? data.custom_fields : JSON.stringify(data.custom_fields);

                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({ code: 400, message: 'No valid fields to update' });
                }

                const { oldData } = await obj.libraryService.updateFile(parseInt(fileId), updateData);
                const result = await obj.libraryService.getFile(parseInt(fileId));
                this.broadcastFileEvent('file::updated', libraryId, result, parseInt(fileId), oldData);

                res.json({ code: 0, message: 'Success', data: result });
            } catch (error) {
                console.error('Error updating file:', error);
                res.status(500).json({ code: 500, message: 'Internal server error' });
            }
        });
    }

    private broadcastFileEvent(event: string, libraryId: string, result: any, fileId: number, oldData?: any) {
        if (!this.backend.webSocketServer) return;
        const eventData = oldData ? { old_data: oldData } : {};
        this.backend.webSocketServer.broadcastPluginEvent(event, {
            message: { type: 'file', action: 'update' },
            result, libraryId, fileId, ...eventData,
        });
        this.backend.webSocketServer.broadcastLibraryEvent(libraryId, event, {
            ...result, libraryId, fileId, ...eventData,
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

    private async resolveExtraFileSource(libraryId: string, fileId: string): Promise<{ filePath: string, pluginManager: any } | undefined> {
        const obj = this.backend.libraries!.getLibrary(libraryId);
        if (!obj) return undefined;
        const item = await obj.libraryService.getFile(parseInt(fileId, 10));
        if (!item) return undefined;
        const filePath = await obj.libraryService.getItemFilePath(item);
        if (!filePath || !fs.existsSync(filePath)) return undefined;
        return { filePath, pluginManager: obj.pluginManager };
    }

    private canAccessExtraFileLibrary(req: Request): boolean {
        const config = this.backend.libraries!.getLibraryConfig(req.params.libraryId);
        return canAccessLibrary(config, (req as any).user?.role);
    }

    private appendToken(url: string, token: string): string {
        if (!token) return url;
        const resolved = new URL(url);
        resolved.searchParams.set('token', token);
        return resolved.toString();
    }

    private buildExtraFileUrl(fileUrl: string, libraryId: string, fileId: string, fileName: string, token: string): string {
        const resolved = new URL(fileUrl);
        const apiIndex = resolved.pathname.indexOf('/api/files/file/');
        const prefix = apiIndex >= 0 ? resolved.pathname.slice(0, apiIndex) : '';
        const encodedName = fileName.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
        resolved.pathname = `${prefix}/api/files/extra/${encodeURIComponent(String(libraryId))}/${encodeURIComponent(String(fileId))}/${encodedName}`;
        resolved.search = '';
        return this.appendToken(resolved.toString(), token);
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
            '.atlas': 'text/plain; charset=utf-8',
            '.mp4': 'video/mp4',
            '.m4v': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.wav': 'audio/wav',
            '.flac': 'audio/flac',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
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
