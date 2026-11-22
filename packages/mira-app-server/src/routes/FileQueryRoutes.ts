import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { canAccessLibrary } from '../middleware/permission';
import { FileRouteContext, FileRouteDef } from './FileRouteRegistry';
import { parseLibraryItem } from '../lib/parseLibraryItem';
import { getContentType } from '../lib/contentType';

/** 解析容器格式插件附属文件的来源（库 + 插件管理器 + 真实解压路径） */
async function resolveExtraFileSource(ctx: FileRouteContext, libraryId: string, fileId: string): Promise<{ filePath: string, pluginManager: any } | undefined> {
    const library = ctx.files.getLibrary(libraryId);
    if (!library) return undefined;
    const item = await library.libraryService.getFile(parseInt(fileId, 10));
    if (!item) return undefined;
    const filePath = await library.libraryService.getItemFilePath(item);
    if (!filePath || !fs.existsSync(filePath)) return undefined;
    return { filePath, pluginManager: library.pluginManager };
}

function canAccessExtraFileLibrary(ctx: FileRouteContext, req: Request): boolean {
    const config = ctx.files.getLibraryConfig(req.params.libraryId);
    return canAccessLibrary(config, (req as any).user?.role);
}

function appendToken(url: string, token: string): string {
    if (!token) return url;
    const resolved = new URL(url);
    resolved.searchParams.set('token', token);
    return resolved.toString();
}

function buildExtraFileUrl(fileUrl: string, libraryId: string, fileId: string, fileName: string, token: string): string {
    const resolved = new URL(fileUrl);
    const apiIndex = resolved.pathname.indexOf('/api/files/file/');
    const prefix = apiIndex >= 0 ? resolved.pathname.slice(0, apiIndex) : '';
    const encodedName = fileName.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
    resolved.pathname = `${prefix}/api/files/extra/${encodeURIComponent(String(libraryId))}/${encodeURIComponent(String(fileId))}/${encodedName}`;
    resolved.search = '';
    return appendToken(resolved.toString(), token);
}

// 获取文件缩略图
const thumbRoute: FileRouteDef = {
    method: 'get',
    path: '/thumb/:libraryId/:id',
    async handler(ctx, req, res) {
        try {
            const parsedItem = await parseLibraryItem(ctx.files, req, res);
            if (parsedItem) {
                const thumbPath = await parsedItem.service.getItemThumbPath(parsedItem.item, { isNetworkImage: false });
                if (!fs.existsSync(thumbPath)) return res.status(404).send('Thumbnail not found');

                res.setHeader('Content-Type', 'image/png');
                fs.createReadStream(thumbPath).pipe(res);
            }
        } catch (err) {
            console.error('Error serving thumbnail:', err);
            res.status(500).send('Internal server error');
        }
    },
};

// 获取容器格式插件暴露的附属文件列表，真实解压路径不对外返回。
const extraFileListRoute: FileRouteDef = {
    method: 'get',
    path: '/extra/:libraryId/:fileId',
    async handler(ctx, req, res) {
        try {
            if (!canAccessExtraFileLibrary(ctx, req)) return res.status(403).json({ code: 403, message: 'Access denied' });
            const extraSource = await resolveExtraFileSource(ctx, req.params.libraryId, req.params.fileId);
            if (!extraSource) return res.status(404).json({ code: 404, message: 'File not found' });
            const files = await extraSource.pluginManager.getExtraFileList(extraSource.filePath, {
                libraryId: req.params.libraryId,
                fileId: req.params.fileId,
            });
            if (!files) return res.status(404).json({ code: 404, message: 'File format has no extra files' });
            res.json({ code: 0, data: files });
        } catch (error) {
            console.error('Error listing extra files:', error);
            res.status(400).json({ code: 400, message: error instanceof Error ? error.message : 'Failed to list extra files' });
        }
    },
};

// 文件名由格式插件解析；这里只流式返回插件确认过的临时文件。
const extraFileRoute: FileRouteDef = {
    method: 'get',
    path: '/extra/:libraryId/:fileId/*',
    async handler(ctx, req, res) {
        try {
            if (!canAccessExtraFileLibrary(ctx, req)) return res.status(403).send('Access denied');
            const extraSource = await resolveExtraFileSource(ctx, req.params.libraryId, req.params.fileId);
            if (!extraSource) return res.status(404).send('File not found');
            const fileName = req.params[0];
            if (!fileName) return res.status(400).send('Extra file name is required');
            const extraPath = await extraSource.pluginManager.getExtraFile(extraSource.filePath, fileName, {
                libraryId: req.params.libraryId,
                fileId: req.params.fileId,
            });
            if (!extraPath || !fs.existsSync(extraPath)) return res.status(404).send('Extra file not found');
            const stat = await fs.promises.stat(extraPath);
            if (!stat.isFile()) return res.status(404).send('Extra file not found');
            res.setHeader('Content-Type', getContentType(path.extname(extraPath).toLowerCase()));
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Cache-Control', 'private, max-age=86400');
            fs.createReadStream(extraPath).pipe(res);
        } catch (error) {
            console.error('Error serving extra file:', error);
            res.status(400).send(error instanceof Error ? error.message : 'Failed to serve extra file');
        }
    },
};

// JIT HLS 播放列表：只描述时间轴，分片在播放器请求时生成
const previewPlaylistRoute: FileRouteDef = {
    method: 'get',
    path: '/preview/:libraryId/:fileId/index.m3u8',
    async handler(ctx, req, res) {
        try {
            const { libraryId, fileId } = req.params;
            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).send('Library not found');
            const item = await library.libraryService.getFile(parseInt(fileId, 10));
            if (!item) return res.status(404).send('File not found');
            const filePath = await library.libraryService.getItemFilePath(item);
            if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

            const tokenQuery = typeof req.query.token === 'string'
                ? `?token=${encodeURIComponent(req.query.token)}`
                : '';
            const playlist = await ctx.backend.thumbnailService.getHlsPlaylist(
                filePath,
                path.join(ctx.backend.dataPath, 'temp', 'previews'),
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
    },
};

// JIT HLS 分片：按进度条请求的序号转换，完成后从 temp 缓存流式返回
const previewSegmentRoute: FileRouteDef = {
    method: 'get',
    path: '/preview/:libraryId/:fileId/segment/:segment.ts',
    async handler(ctx, req, res) {
        try {
            const { libraryId, fileId, segment } = req.params;
            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).send('Library not found');
            const item = await library.libraryService.getFile(parseInt(fileId, 10));
            if (!item) return res.status(404).send('File not found');
            const filePath = await library.libraryService.getItemFilePath(item);
            if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

            const segmentPath = await ctx.backend.thumbnailService.getHlsSegmentPath(
                filePath,
                path.join(ctx.backend.dataPath, 'temp', 'previews'),
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
    },
};

// 按需生成浏览器可展示的大图，结果只缓存到服务端 temp 目录
const previewRoute: FileRouteDef = {
    method: 'get',
    path: '/preview/:libraryId/:fileId',
    async handler(ctx, req, res) {
        try {
            const { libraryId, fileId } = req.params;
            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).send('Library not found');

            const item = await library.libraryService.getFile(parseInt(fileId, 10));
            if (!item) return res.status(404).send('File not found');
            const filePath = await library.libraryService.getItemFilePath(item);
            if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

            const previewPath = await ctx.backend.thumbnailService.getPreviewPath(
                filePath,
                path.join(ctx.backend.dataPath, 'temp', 'previews'),
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
    },
};

// 获取文件内容 - 支持 Range 请求
const fileContentRoute: FileRouteDef = {
    method: 'get',
    path: '/file/:libraryId/:id',
    async handler(ctx, req, res) {
        const parsedItem = await parseLibraryItem(ctx.files, req, res);
        if (parsedItem) {
            const filePath = await parsedItem.service.getItemFilePath(parsedItem.item);
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).send('File not found');
            }

            const fileExt = path.extname(filePath).toLowerCase();
            const contentType = getContentType(fileExt);

            // 获取文件大小
            const stats = fs.statSync(filePath);
            const fileSize = stats.size;

            // 添加文件名到响应头
            const fileName = parsedItem.item.name || path.basename(filePath);
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
    },
};

// 批量获取文件 metadata（瀑布流等布局只需要宽高时使用）
const metadataRoute: FileRouteDef = {
    method: 'post',
    path: '/metadata',
    async handler(ctx, req, res) {
        try {
            const { libraryId, ids, clientId } = req.body;
            if (!libraryId || !Array.isArray(ids)) {
                return res.status(400).json({ code: 400, message: 'libraryId and ids are required', data: null });
            }
            if (ids.length > 1000) {
                return res.status(400).json({ code: 400, message: 'ids cannot contain more than 1000 items', data: null });
            }

            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).json({ code: 404, message: 'Library not found', data: null });

            const allowed = await library.pluginManager.runHttpHooks({
                libraryId,
                clientId,
                method: req.method,
                path: '/api/files/metadata',
                req,
                res,
                fields: ctx.backend.webSocketServer?.getClientFields(libraryId, clientId),
            });
            if (!allowed || res.headersSent) return;

            const fileIds = [...new Set(ids.map((id: unknown) => Number(id)).filter(Number.isSafeInteger))];
            const files = await Promise.all(fileIds.map(id => library.libraryService.getFile(id)));
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
    },
};

// 按素材 ID 即时调用 exiftool，返回完整 EXIF 标签。
const exifRoute: FileRouteDef = {
    method: 'post',
    path: '/exif',
    async handler(ctx, req, res) {
        try {
            const { libraryId, ids, clientId } = req.body;
            if (!libraryId || !Array.isArray(ids)) {
                return res.status(400).json({ code: 400, message: 'libraryId and ids are required', data: null });
            }
            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).json({ code: 404, message: 'Library not found', data: null });
            const allowed = await library.pluginManager.runHttpHooks({
                libraryId, clientId, method: req.method, path: '/api/files/exif', req, res,
                fields: ctx.backend.webSocketServer?.getClientFields(libraryId, clientId),
            });
            if (!allowed || res.headersSent) return;
            const fileIds = [...new Set(ids.map((id: unknown) => Number(id)).filter(Number.isSafeInteger))];
            const data = await Promise.all(fileIds.map(async id => {
                const file = await library.libraryService.getFile(id);
                if (!file) return null;
                try {
                    const filePath = await library.libraryService.getItemFilePath(file, { isUrlFile: false });
                    return { id: String(id), tags: await ctx.backend.metadataService.parseFile(file, filePath) };
                } catch (error) {
                    return { id: String(id), error: error instanceof Error ? error.message : String(error) };
                }
            }));
            res.json({ code: 0, message: 'Success', data: data.filter(Boolean) });
        } catch (error) {
            console.error('Error parsing file EXIF:', error);
            res.status(500).json({ code: 500, message: 'Internal server error while parsing EXIF', data: null });
        }
    },
};

// 获取文件列表 - 支持过滤参数
const getFilesRoute: FileRouteDef = {
    method: 'post',
    path: '/getFiles',
    async handler(ctx, req, res) {
        try {
            const { libraryId, filters = {}, clientId } = req.body;
            if (!libraryId) {
                return res.status(400).json({
                    code: 400,
                    message: 'Library ID is required',
                    data: null
                });
            }

            const library = ctx.files.getLibrary(libraryId);
            if (!library) {
                return res.status(404).json({
                    code: 404,
                    message: 'Library not found',
                    data: null
                });
            }

            const allowed = await library.pluginManager.runHttpHooks({
                libraryId,
                clientId,
                method: req.method,
                path: '/api/files/getFiles',
                req,
                res,
                fields: ctx.backend.webSocketServer?.getClientFields(libraryId, clientId),
            });
            if (!allowed || res.headersSent) return;

            const files = await library.libraryService.getFiles({
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
    },
};

// 批量检查待上传文件名在库内是否已有同名文件（仅未回收，全库任意文件夹）
const checkDuplicatesRoute: FileRouteDef = {
    method: 'post',
    path: '/checkDuplicates',
    async handler(ctx, req, res) {
        try {
            const { libraryId, names = [], clientId } = req.body;
            if (!libraryId) {
                return res.status(400).json({
                    code: 400,
                    message: 'Library ID is required',
                    data: null
                });
            }

            const library = ctx.files.getLibrary(libraryId);
            if (!library) {
                return res.status(404).json({
                    code: 404,
                    message: 'Library not found',
                    data: null
                });
            }

            const allowed = await library.pluginManager.runHttpHooks({
                libraryId,
                clientId,
                method: req.method,
                path: '/api/files/checkDuplicates',
                req,
                res,
                fields: ctx.backend.webSocketServer?.getClientFields(libraryId, clientId),
            });
            if (!allowed || res.headersSent) return;

            // 规范化：仅保留非空字符串文件名
            const normalized = (Array.isArray(names) ? names : [])
                .filter((n: any) => typeof n === 'string' && n);

            const duplicates = await library.libraryService.checkDuplicateNames(normalized);
            res.json({
                code: 0,
                message: 'Success',
                data: { duplicates }
            });

        } catch (error) {
            console.error('Error checking duplicates:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error while checking duplicates',
                data: null
            });
        }
    },
};

// 获取单个文件信息
const getFileRoute: FileRouteDef = {
    method: 'post',
    path: '/getFile',
    async handler(ctx, req, res) {
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

            const library = ctx.files.getLibrary(libraryId);
            if (!library) {
                return res.status(404).json({
                    code: 404,
                    message: 'Library not found',
                    data: null
                });
            }

            const allowed = await library.pluginManager.runHttpHooks({
                libraryId,
                clientId,
                method: req.method,
                path: '/api/files/getFile',
                req,
                res,
                fields: ctx.backend.webSocketServer?.getClientFields(libraryId, clientId),
            });
            if (!allowed || res.headersSent) return;

            const file = await library.libraryService.getFile(parseInt(fileId));
            if (!file) {
                return res.status(404).json({
                    code: 404,
                    message: 'File not found',
                    data: null
                });
            }

            // 与 getFiles 保持一致，补充实际素材库文件位置；link 模式的 path 是源文件路径，
            // 不能直接作为 Electron 预览路径使用。
            const processedFile = (await library.libraryService.processingFiles([file], true))[0];
            res.json({
                code: 0,
                message: 'Success',
                data: processedFile
            });

        } catch (error) {
            console.error('Error getting file:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error while getting file',
                data: null
            });
        }
    },
};

// 获取文件可用的全部插件 iframe Viewer
const getPreviewViewersRoute: FileRouteDef = {
    method: 'post',
    path: '/getPreviewViewers',
    async handler(ctx, req, res) {
        try {
            const { libraryId, fileId, clientId } = req.body;
            if (!libraryId || !fileId) {
                return res.status(400).json({
                    code: 400,
                    message: 'libraryId and fileId are required',
                    data: null
                });
            }

            const library = ctx.files.getLibrary(libraryId);
            if (!library) {
                return res.status(404).json({ code: 404, message: 'Library not found', data: null });
            }

            const allowed = await library.pluginManager.runHttpHooks({
                libraryId,
                clientId,
                method: req.method,
                path: '/api/files/getPreviewViewers',
                req,
                res,
                fields: ctx.backend.webSocketServer?.getClientFields(libraryId, clientId),
            });
            if (!allowed || res.headersSent) return;

            const file = await library.libraryService.getFile(parseInt(fileId, 10));
            if (!file) {
                return res.status(404).json({ code: 404, message: 'File not found', data: null });
            }

            const filePath = await library.libraryService.getItemFilePath(file, { isUrlFile: false });
            const requestToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
                (typeof req.query.token === 'string' ? req.query.token : '');
            const fileUrl = appendToken(
                await library.libraryService.getItemFilePath(file, { isUrlFile: true }),
                requestToken
            );
            const viewers = await library.pluginManager.getPreviewViewers({
                libraryId: String(libraryId),
                fileId: String(fileId),
                file: { ...file, libraryId },
                filePath,
                fileUrl,
                getExtraFileUrl: (fileName: string) => buildExtraFileUrl(fileUrl, libraryId, fileId, fileName, requestToken),
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
    },
};

export const fileQueryRoutes: FileRouteDef[] = [
    thumbRoute,
    extraFileListRoute,
    extraFileRoute,
    previewPlaylistRoute,
    previewSegmentRoute,
    previewRoute,
    fileContentRoute,
    metadataRoute,
    exifRoute,
    getFilesRoute,
    checkDuplicatesRoute,
    getFileRoute,
    getPreviewViewersRoute,
];
