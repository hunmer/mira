import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { canAccessLibrary } from '../middleware/permission';
import { resolveUploadImport } from './UploadImportMode';
import { resolveFolderId, resolveTagIds } from './FileAssociationResolver';
import { FileRouteContext, FileRouteDef } from './FileRouteRegistry';
import { emitFileEvent } from '../lib/FileEvents';

/** 移动文件后清理源库残留的物理文件与缩略图 */
async function removeFileArtifacts(libraryService: any, item: Record<string, any>): Promise<void> {
    try {
        const filePath = await libraryService.getItemFilePath(item, { isUrlFile: false });
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
        console.error('Failed to remove moved file artifact:', error);
    }

    try {
        const thumbPath = await libraryService.getItemThumbPath(item, { isNetworkImage: false });
        if (thumbPath && fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    } catch (error) {
        console.error('Failed to remove moved thumbnail artifact:', error);
    }
}

async function removeMovedTarget(libraryService: any, item: Record<string, any>): Promise<void> {
    try {
        await libraryService.deleteFile(Number(item.id), { moveToRecycleBin: false });
    } finally {
        await removeFileArtifacts(libraryService, item);
    }
}

/** 更新操作但未携带文件：仅更新 tags/folder_id/imported_at/uploader 等元数据并应答 */
async function handleMetadataOnlyUpload(ctx: FileRouteContext, args: {
    req: Request;
    res: Response;
    library: Record<string, any>;
    libraryId: string;
    fileId: string;
    existingFile: any;
    payload: any;
    fields: any;
    uploader: string | null;
    clientId: string | null;
}): Promise<unknown> {
    const { res, library, libraryId, fileId, existingFile, payload, fields, uploader, clientId } = args;
    try {
        const { tags, folder_id } = payload?.data || {};
        const tagIds = await resolveTagIds(library.libraryService, Array.isArray(tags) ? tags : []);
        const resolvedFolderId = await resolveFolderId(library.libraryService, folder_id);
        const updateData: Record<string, any> = {
            tags: JSON.stringify(tagIds),
            folder_id: resolvedFolderId === undefined ? existingFile.folder_id : resolvedFolderId,
            imported_at: Date.now(),
        };
        if (uploader) updateData.uploader = uploader;

        const { success: updateSuccess, oldData } = await library.libraryService.updateFile(parseInt(fileId), updateData);

        let result = null;
        if (updateSuccess) {
            result = await library.libraryService.getFile(parseInt(fileId));
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
        if (updateSuccess) {
            emitFileEvent(ctx.backend, libraryId, parseInt(fileId), 'file::updated', {
                ...result,
                libraryId,
                fileId: parseInt(fileId),
                old_data: oldData,
            }, {
                action: 'metadata_update',
                message: { fields, payload },
                pluginResult: result,
                ...(clientId ? {
                    client: {
                        clientId,
                        event: 'file::updated',
                        data: { fileId: parseInt(fileId), old_data: oldData },
                    },
                } : {}),
            });
        }

        return res.send(response);
    } catch (error) {
        console.error('Error updating file metadata:', error);
        return res.status(500).send('Internal server error while updating file metadata.');
    }
}

/** 更新操作且携带文件：物理替换文件内容并更新记录，写入 results 并广播 */
async function handleUploadReplaceFile(ctx: FileRouteContext, args: {
    req: Request;
    library: Record<string, any>;
    libraryId: string;
    fileId: string;
    existingFile: any;
    file: Express.Multer.File;
    originalName: string;
    tagIds: any[];
    resolvedFolderId: any;
    uploader: string | null;
    clientId: string | null;
    sourcePath: any;
    fields: any;
    payload: any;
    results: any[];
}): Promise<void> {
    const { req, library, libraryId, fileId, existingFile, file, originalName, tagIds, resolvedFolderId, uploader, clientId, sourcePath, fields, payload, results } = args;
    // 更新操作：更新文件内容和元数据
    const updateData: Record<string, any> = {
        name: req.body.name || originalName,
        tags: JSON.stringify(tagIds),
        folder_id: resolvedFolderId === undefined ? existingFile.folder_id : resolvedFolderId,
        size: file.size,
        imported_at: Date.now(),
    };
    if (uploader) updateData.uploader = uploader;

    // 处理物理文件替换
    try {
        const existingFilePath = await library.libraryService.getItemFilePath(existingFile);
        // 计算新文件的目标路径
        const targetDir = await library.libraryService.getItemPath({ ...existingFile, ...updateData });
        const targetPath = path.join(targetDir, updateData.name);

        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const isCrossDevice = path.parse(file.path).root.toLowerCase() !== path.parse(targetPath).root.toLowerCase();
        if (isCrossDevice) {
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
    const { success: updateSuccess, oldData } = await library.libraryService.updateFile(parseInt(fileId), updateData);

    let result;
    if (updateSuccess) {
        // 获取更新后的文件信息
        result = await library.libraryService.getFile(parseInt(fileId));
    }

    results.push({
        success: updateSuccess,
        file: file.path,
        result,
        operation: 'update'
    });

    // 发送WebSocket事件
    if (updateSuccess) {
        emitFileEvent(ctx.backend, libraryId, parseInt(fileId), 'file::updated', {
            ...result,
            libraryId,
            fileId: parseInt(fileId),
            old_data: oldData,
        }, {
            action: 'update',
            message: { fields, payload },
            pluginResult: result,
            // 与原实现一致：library 事件与客户端回执仅在携带 clientId 时发送
            libraryEvent: Boolean(clientId),
            ...(clientId ? {
                client: {
                    clientId,
                    event: 'file::updated',
                    data: { path: sourcePath, fileId: parseInt(fileId), old_data: oldData },
                },
            } : {}),
        });
    }
}

/** 非更新操作：按导入三模式入库新文件，写入 results 并广播 */
async function handleUploadCreateFile(ctx: FileRouteContext, args: {
    req: Request;
    library: Record<string, any>;
    libraryId: string;
    file: Express.Multer.File;
    originalName: string;
    tagIds: any[];
    resolvedFolderId: any;
    uploader: string | null;
    clientId: string | null;
    sourcePath: any;
    silent: boolean;
    isBatchImport: boolean;
    batchId?: string;
    uploadBatchId: string;
    fields: any;
    payload: any;
    results: any[];
}): Promise<void> {
    const { req, library, libraryId, file, originalName, tagIds, resolvedFolderId, uploader, clientId, sourcePath, silent, isBatchImport, batchId, uploadBatchId, fields, payload, results } = args;
    // 创建操作（原有逻辑）
    const fileData = {
        name: req.body.name || originalName,
        tags: JSON.stringify(tagIds),
        folder_id: resolvedFolderId ?? null,
        uploader,
    };

    // Electron 本地导入会额外传入源文件绝对路径；服务端与客户端同机时直接使用源文件，
    // 让 move 按“复制后移入系统回收站”处理，而不是只移动上传临时文件。
    const configuredImportType = library.libraryService.config.customFields?.importType
        ?? library.libraryService.config.importType
        ?? req.body.importType;
    const { sourceFilePath, importType } = resolveUploadImport(
        file.path,
        sourcePath,
        configuredImportType,
    );
    console.info(`[FileUpload] library=${libraryId} configuredImportType=${configuredImportType || '<none>'} importType=${importType} sourcePath=${sourcePath || '<none>'} sourceFile=${sourceFilePath}`);
    // copy/link 会在素材库目录产生新的目录项，预先屏蔽 watcher 的 add 事件，避免重复入库。
    if (importType !== 'move' && library.watcher) {
        const anticipatedPath = path.join(
            await library.libraryService.getItemPath(fileData),
            fileData.name,
        );
        library.watcher.ignorePath(anticipatedPath);
    }
    const result = await library.libraryService.createFileFromPath(sourceFilePath, fileData, {
        importType,
        ...(typeof req.body.enableHash === 'boolean' ? { enableHash: req.body.enableHash } : {}),
        ...(typeof req.body.skipSameName === 'boolean' ? { skipSameName: req.body.skipSameName } : {}),
    });
    if (library.watcher) {
        const actualPath = await library.libraryService.getItemFilePath(result, { isUrlFile: false });
        library.watcher.ignorePath(actualPath);
    }
    if (sourceFilePath !== file.path || importType === 'copy') {
        await fs.promises.unlink(file.path).catch(() => undefined);
    }
    const isDuplicate = result?.duplicate === true;
    results.push({
        success: !isDuplicate,
        file: file.path,
        result,
        operation: isDuplicate ? 'duplicate' : 'create'
    });

    // 发送WebSocket事件（命中重复时不广播 file::created，因为并没有新建文件）
    if (!isDuplicate) {
        const eventData = {
            ...result,
            libraryId,
            uploadBatchId,
            ...(silent ? { silent: true } : {}),
            ...(isBatchImport ? { batchImport: true, batchId } : {})
        };
        emitFileEvent(ctx.backend, libraryId, undefined, 'file::created', eventData, {
            action: 'create',
            message: { fields, payload },
        });
    }

    // 命中重复也向上传方回传 file::uploaded（带 duplicate 标记），让前端能给出"已存在，已跳过"的提示
    if (clientId) {
        emitFileEvent(ctx.backend, libraryId, undefined, 'file::uploaded', {}, {
            pluginEvent: false,
            libraryEvent: false,
            client: {
                clientId,
                event: 'file::uploaded',
                data: isDuplicate ? { path: sourcePath, duplicate: true } : { path: sourcePath },
            },
        });
    }
}

// Electron 本机服务可直接读取客户端提供的绝对路径，避免无意义的二进制回传。
const importPathRoute: FileRouteDef = {
    method: 'post',
    path: '/import-path',
    async handler(ctx, req, res) {
        try {
            const { libraryId, path: sourcePath, folderId, tags } = req.body || {};
            const remoteAddress = req.socket.remoteAddress || '';
            const isLoopback = remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
            if (!isLoopback) {
                return res.status(403).json({ success: false, error: 'Local path import is only available from localhost' });
            }
            if (!libraryId || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
                return res.status(400).json({ success: false, error: 'libraryId and absolute path are required' });
            }
            const library = ctx.files.getLibrary(libraryId);
            if (!library || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
                return res.status(404).json({ success: false, error: 'Source file not found' });
            }
            const fileData: Record<string, any> = {};
            const resolvedFolderId = await resolveFolderId(library.libraryService, folderId);
            if (resolvedFolderId !== undefined) fileData.folder_id = resolvedFolderId;
            if (Array.isArray(tags)) fileData.tags = JSON.stringify(await resolveTagIds(library.libraryService, tags));
            const configuredImportType = library.libraryService.config.customFields?.importType
                ?? library.libraryService.config.importType ?? 'copy';
            const result = await library.libraryService.createFileFromPath(sourcePath, fileData, {
                importType: ['copy', 'move', 'link'].includes(configuredImportType) ? configuredImportType : 'copy'
            });
            return res.json({ success: true, data: result });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message || 'Failed to import local path' });
        }
    },
};

// 上传文件到资源库
const uploadRoute: FileRouteDef = {
    method: 'post',
    path: '/upload',
    multer: 'files',
    async handler(ctx, req, res) {
        const { libraryId, sourcePath, fileId } = req.body; // sourcePath是用户的本地文件位置，用来验证是否上传成功
        const clientId = req.body.clientId || null;
        const isBatchImport = req.body.batchImport === 'true' || req.body.batchImport === true;
        // 静默上传：编辑器覆盖保存等场景，广播事件带 silent 标记让客户端跳过导入通知
        const silent = req.body.silent === 'true' || req.body.silent === true;
        const batchId = isBatchImport ? randomUUID() : undefined;
        // 为每次 HTTP 上传请求生成独立标识，避免客户端通知聚合跨请求累计。
        const uploadBatchId = randomUUID();
        const urlItems = isBatchImport && req.body.urlItems
            ? JSON.parse(req.body.urlItems)
            : [];
        const fields = req.body.fields ? JSON.parse(req.body.fields) : null;
        const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
        const uploader = (req as any).user?.id || null;
        const library = ctx.files.getLibrary(libraryId);
        if (!library) return res.status(404).send('Library not found');

        // 检查是否为更新操作
        const isUpdateOperation = fileId && fileId.trim();
        let existingFile = null;

        if (isUpdateOperation) {
            try {
                existingFile = await library.libraryService.getFile(parseInt(fileId));
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
            return handleMetadataOnlyUpload(ctx, {
                req, res, library, libraryId, fileId, existingFile,
                payload, fields, uploader, clientId,
            });
        }

        // 如果不是更新操作，或者是更新操作但有文件，则需要文件
        if ((!files || !files.length) && !urlItems.length) return res.status(400).send('No files or URLs uploaded.');

        try {
            const results = [];
            let urlBatchId: string | undefined;
            const { tags, folder_id } = payload?.data || {};
            const tagIds = await resolveTagIds(library.libraryService, Array.isArray(tags) ? tags : []);
            const resolvedFolderId = await resolveFolderId(library.libraryService, folder_id);
            const validUrlItems = urlItems.filter((url: unknown) => typeof url === 'string' && /^https?:\/\//i.test(url));
            if (validUrlItems.length) {
                const userId = (req as any).user?.id;
                if (!userId || !ctx.backend.downloadExecutor) {
                    return res.status(503).send('URL import executor unavailable.');
                }
                urlBatchId = await ctx.backend.downloadExecutor.enqueueBatch(
                    validUrlItems
                        .map((url: string) => ({
                            url,
                            libraryId,
                            userId,
                            folderId: resolvedFolderId ?? null,
                            clientId,
                        })),
                );
            }
            for (const file of files) {
                try {
                    // 生成唯一文件名并保存文件
                    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

                    if (isUpdateOperation) {
                        await handleUploadReplaceFile(ctx, {
                            req, library, libraryId, fileId, existingFile, file, originalName,
                            tagIds, resolvedFolderId, uploader, clientId, sourcePath, fields, payload, results,
                        });
                    } else {
                        await handleUploadCreateFile(ctx, {
                            req, library, libraryId, file, originalName,
                            tagIds, resolvedFolderId, uploader, clientId, sourcePath,
                            silent, isBatchImport, batchId, uploadBatchId, fields, payload, results,
                        });
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
            if (files.length > 0) {
                const imported = results.filter((item: any) => item.operation === 'create' && item.success).length;
                const skipped = results.filter((item: any) => item.operation === 'duplicate').length;
                const failed = results.filter((item: any) => !item.success && item.operation !== 'duplicate').length;
                emitFileEvent(ctx.backend, libraryId, undefined, 'file::upload-completed', {
                    uploadBatchId,
                    total: files.length,
                    imported,
                    skipped,
                    failed,
                    ...(silent ? { silent: true } : {}),
                }, { pluginEvent: false });
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
    },
};

// 在服务端跨素材库移动文件，避免客户端下载后重新上传。
const moveRoute: FileRouteDef = {
    method: 'post',
    path: '/move',
    async handler(ctx, req, res) {
        const { sourceLibraryId, targetLibraryId, fileId } = req.body || {};
        const sourceId = String(sourceLibraryId || req.body?.libraryId || '');
        const targetId = String(targetLibraryId || '');
        const id = Number(fileId);

        if (!sourceId || !targetId || !Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ code: 400, message: 'sourceLibraryId, targetLibraryId and valid fileId are required', data: null });
        }
        if (sourceId === targetId) {
            return res.status(400).json({ code: 400, message: 'Source and target libraries must be different', data: null });
        }

        try {
            const sourceConfig = ctx.files.getLibraryConfig(sourceId);
            const targetConfig = ctx.files.getLibraryConfig(targetId);
            const userRole = (req as any).user?.role;
            if (!canAccessLibrary(sourceConfig, userRole) || !canAccessLibrary(targetConfig, userRole)) {
                return res.status(403).json({ code: 403, message: 'Access denied', data: null });
            }

            const source = ctx.files.getLibrary(sourceId);
            const target = ctx.files.getLibrary(targetId);
            if (!source?.libraryService || !target?.libraryService) {
                return res.status(404).json({ code: 404, message: 'Source or target library is unavailable', data: null });
            }

            const sourceItem = await source.libraryService.getFile(id);
            if (!sourceItem) {
                return res.status(404).json({ code: 404, message: 'File not found', data: null });
            }
            if (sourceItem.recycled) {
                return res.status(400).json({ code: 400, message: 'Recycled files cannot be moved', data: null });
            }

            const sourcePath = await source.libraryService.getItemFilePath(sourceItem, { isUrlFile: false });
            if (!sourcePath || !fs.existsSync(sourcePath)) {
                return res.status(404).json({ code: 404, message: 'Source file is missing', data: null });
            }

            const targetMeta = {
                created_at: sourceItem.created_at,
                hash: sourceItem.hash,
                custom_fields: sourceItem.custom_fields,
                notes: sourceItem.notes,
                stars: sourceItem.stars,
                reference: sourceItem.reference,
                tags: sourceItem.tags,
                uploader: sourceItem.uploader,
                website: sourceItem.website,
                metadata: sourceItem.metadata,
                folder_id: null,
            };
            const targetItem = await target.libraryService.createFileFromPath(
                sourcePath,
                { name: sourceItem.name, ...targetMeta },
                { importType: 'copy' },
            );
            if (targetItem?.duplicate) {
                return res.status(409).json({ code: 409, message: 'A duplicate file already exists in the target library', data: null });
            }

            const deleted = await source.libraryService.deleteFile(id, { moveToRecycleBin: false });
            if (!deleted) {
                await removeMovedTarget(target.libraryService, targetItem);
                return res.status(500).json({ code: 500, message: 'Failed to remove source file record', data: null });
            }

            await removeFileArtifacts(source.libraryService, sourceItem);
            const result = await target.libraryService.getFile(Number(targetItem.id)) || targetItem;

            emitFileEvent(ctx.backend, sourceId, id, 'file::deleted', {
                id, name: sourceItem.name, libraryId: sourceId, fileId: id,
            }, {
                action: 'delete',
                pluginResult: { id, name: sourceItem.name, libraryId: sourceId },
            });
            emitFileEvent(ctx.backend, targetId, undefined, 'file::created', {
                ...result, libraryId: targetId,
            }, {
                action: 'create',
                pluginResult: { ...result, libraryId: targetId },
            });

            return res.json({
                code: 0,
                message: 'File moved successfully',
                data: {
                    sourceLibraryId: sourceId,
                    targetLibraryId: targetId,
                    sourceFileId: id,
                    targetFile: result,
                },
            });
        } catch (error) {
            console.error('Error moving file between libraries:', error);
            return res.status(500).json({ code: 500, message: 'Internal server error while moving file', data: null });
        }
    },
};

export const fileImportRoutes: FileRouteDef[] = [importPathRoute, uploadRoute, moveRoute];
