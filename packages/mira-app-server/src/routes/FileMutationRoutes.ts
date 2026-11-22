import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { resolveFolderId, resolveTagIds } from './FileAssociationResolver';
import { FileRouteContext, FileRouteDef } from './FileRouteRegistry';
import { emitFileEvent } from '../lib/FileEvents';

/** 与原 broadcastFileEvent 等价：action 固定 'update'，plugin/library 事件均带 old_data */
function emitFileUpdated(ctx: FileRouteContext, libraryId: string, fileId: number, result: any, oldData?: any): void {
    const extra = oldData ? { old_data: oldData } : undefined;
    emitFileEvent(ctx.backend, libraryId, fileId, 'file::updated', {
        ...result,
        libraryId,
        fileId,
        ...(extra ?? {}),
    }, {
        action: 'update',
        pluginResult: result,
        pluginExtra: extra,
    });
}

// 覆盖素材缩略图；客户端裁切组件统一导出 PNG。
const coverRoute: FileRouteDef = {
    method: 'post',
    path: '/cover/:libraryId/:id',
    multer: 'cover',
    async handler(ctx, req, res) {
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

            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).json({ code: 404, message: 'Library not found' });
            const item = await library.libraryService.getFile(fileId);
            if (!item) return res.status(404).json({ code: 404, message: 'File not found' });

            const thumbPath = await library.libraryService.getItemThumbPath(item, { isNetworkImage: false });
            await fs.promises.mkdir(path.dirname(thumbPath), { recursive: true });
            await fs.promises.writeFile(thumbPath, cover.buffer);
            await library.libraryService.updateFile(fileId, { thumb: 1 });

            const result = await library.libraryService.getFile(fileId);
            result.thumb = await library.libraryService.getItemThumbPath(result, { isUrlFile: true });
            emitFileEvent(ctx.backend, libraryId, undefined, 'thumbnail::generated', result, { pluginEvent: false });
            res.json({ code: 0, message: 'Cover updated', data: result });
        } catch (error) {
            console.error('Error setting file cover:', error);
            res.status(500).json({ code: 500, message: 'Failed to set cover' });
        }
    },
};

// 清空回收站（需要 admin 权限）
const emptyTrashRoute: FileRouteDef = {
    method: 'delete',
    path: '/:libraryId/trash',
    async handler(ctx, req, res) {
        try {
            const user = (req as any).user;
            if (!user || (user.role !== 'admin' && user.role !== 'super')) {
                return res.status(403).json({
                    success: false,
                    error: '权限不足，清空回收站需要管理员权限',
                });
            }

            const { libraryId } = req.params;
            const library = ctx.files.getLibrary(libraryId);

            if (!library) {
                return res.status(404).json({
                    success: false,
                    error: 'Library not found',
                    libraryId
                });
            }

            const result = await library.libraryService.emptyTrash();

            // 广播 WebSocket 事件
            emitFileEvent(ctx.backend, libraryId, undefined, 'files::trash-emptied', {
                libraryId,
                deletedCount: result.deletedCount
            }, { pluginEvent: false });

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
    },
};

// 批量删除文件（默认移入回收站，moveToRecycleBin=false 时彻底删除）
const batchDeleteRoute: FileRouteDef = {
    method: 'post',
    path: '/batch-delete',
    async handler(ctx, req, res) {
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

            const library = ctx.files.getLibrary(libraryId);
            if (!library) {
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
                    const item = await library.libraryService.getFile(id);
                    if (!item) {
                        failedIds.push(id);
                        continue;
                    }

                    const deleteSuccess = await library.libraryService.deleteFile(id, { moveToRecycleBin: toRecycleBin });
                    if (!deleteSuccess) {
                        failedIds.push(id);
                        continue;
                    }

                    // 仅在彻底删除时才删除物理文件和缩略图（与单个删除路由保持一致）
                    if (!toRecycleBin) {
                        const filePath = await library.libraryService.getItemFilePath(item);
                        if (filePath && fs.existsSync(filePath)) {
                            try {
                                fs.unlinkSync(filePath);
                            } catch (fileError) {
                                console.error(`Error deleting physical file ${filePath}:`, fileError);
                            }
                        }

                        try {
                            const thumbPath = await library.libraryService.getItemThumbPath(item, { isNetworkImage: false });
                            if (thumbPath && fs.existsSync(thumbPath)) {
                                fs.unlinkSync(thumbPath);
                            }
                        } catch (thumbError) {
                            console.error(`Error deleting thumbnail:`, thumbError);
                        }
                    }

                    deletedIds.push(id);

                    // 与单个删除路由保持一致的事件结构，逐个广播 file::deleted
                    const deletedFile = {
                        id,
                        name: item.name,
                        libraryId,
                        deletedAt
                    };
                    emitFileEvent(ctx.backend, libraryId, id, 'file::deleted', {
                        ...deletedFile,
                        libraryId,
                        fileId: id
                    }, {
                        action: 'delete',
                        pluginResult: deletedFile,
                    });
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
    },
};

// 批量恢复文件（从回收站还原）
const batchRecoverRoute: FileRouteDef = {
    method: 'post',
    path: '/batch-recover',
    async handler(ctx, req, res) {
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

            const library = ctx.files.getLibrary(libraryId);
            if (!library) {
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
                    const before = await library.libraryService.getFile(id);
                    const success = await library.libraryService.recoverFile(id);
                    if (!success) {
                        failedIds.push(id);
                        continue;
                    }

                    recoveredIds.push(id);

                    // 与单个恢复路由保持一致的事件结构，逐个广播 file::recovered
                    const result = await library.libraryService.getFile(id);
                    const oldData = before ? { folder_id: before.folder_id, recycled: 1 } : undefined;
                    emitFileUpdated(ctx, libraryId, id, result, oldData);
                    // 标记 recovered，便于回收站 tab 精确匹配刷新
                    emitFileEvent(ctx.backend, libraryId, id, 'file::recovered', { recovered: 1, libraryId, fileId: id }, { pluginEvent: false });
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
    },
};

// 恢复文件（从回收站还原）
const recoverRoute: FileRouteDef = {
    method: 'post',
    path: '/recover',
    async handler(ctx, req, res) {
        try {
            const { libraryId, fileId } = req.body;

            if (!libraryId || !fileId) {
                return res.status(400).json({
                    code: 400,
                    message: 'libraryId and fileId are required',
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

            // 获取恢复前的文件信息（用于事件携带 folder_id）
            const before = await library.libraryService.getFile(parseInt(fileId));

            const success = await library.libraryService.recoverFile(parseInt(fileId));
            if (!success) {
                return res.status(500).json({
                    code: 500,
                    message: 'Failed to recover file',
                    data: null
                });
            }

            const result = await library.libraryService.getFile(parseInt(fileId));
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
            const oldData = before ? { folder_id: before.folder_id, recycled: 1 } : undefined;
            emitFileUpdated(ctx, libraryId, parseInt(fileId), result, oldData);
            // 标记 recovered，便于回收站 tab 精确匹配刷新
            emitFileEvent(ctx.backend, libraryId, parseInt(fileId), 'file::recovered', { recovered: 1, libraryId, fileId: parseInt(fileId) }, { pluginEvent: false });

            res.json(response);
        } catch (error) {
            console.error('Error recovering file:', error);
            res.status(500).json({
                code: 500,
                message: 'Internal server error while recovering file',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    },
};

// 删除文件
const deleteFileRoute: FileRouteDef = {
    method: 'delete',
    path: '/:libraryId/:id',
    async handler(ctx, req, res) {
        try {
            const { libraryId, id } = req.params;
            const library = ctx.files.getLibrary(libraryId);

            if (!library) {
                return res.status(404).json({
                    success: false,
                    error: 'Library not found',
                    libraryId
                });
            }

            // 获取文件信息
            const item = await library.libraryService.getFile(parseInt(id));
            if (!item) {
                return res.status(404).json({
                    success: false,
                    error: 'File not found',
                    libraryId,
                    fileId: id
                });
            }

            // 获取文件路径
            const filePath = await library.libraryService.getItemFilePath(item);

            // 读取 moveToRecycleBin 参数，默认 true（移到回收站）
            const moveToRecycleBin = req.query.moveToRecycleBin !== 'false';

            // 删除数据库记录
            const deleteSuccess = await library.libraryService.deleteFile(parseInt(id), { moveToRecycleBin });

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
                    } catch (fileError) {
                        console.error(`Error deleting physical file ${filePath}:`, fileError);
                    }
                }

                try {
                    const thumbPath = await library.libraryService.getItemThumbPath(item, { isNetworkImage: false });
                    if (thumbPath && fs.existsSync(thumbPath)) {
                        fs.unlinkSync(thumbPath);
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
            emitFileEvent(ctx.backend, libraryId, parseInt(id), 'file::deleted', {
                ...response.deletedFile,
                libraryId,
                fileId: parseInt(id)
            }, {
                action: 'delete',
                pluginResult: response.deletedFile,
            });

            res.json(response);

        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while deleting file',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    },
};

// 重命名文件（含同名检测）
const renameRoute: FileRouteDef = {
    method: 'post',
    path: '/rename',
    async handler(ctx, req, res) {
        try {
            const { libraryId, fileId, name } = req.body;

            if (!libraryId || !fileId || !name) {
                return res.status(400).json({ code: 400, message: 'libraryId, fileId, name are required' });
            }

            const requestedName = path.basename(String(name).trim());
            if (!requestedName) {
                return res.status(400).json({ code: 400, message: 'name is required' });
            }

            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).json({ code: 404, message: 'Library not found' });

            const file = await library.libraryService.getFile(parseInt(fileId));
            if (!file) return res.status(404).json({ code: 404, message: 'File not found' });
            if (Number(file.recycled) === 1) {
                return res.status(409).json({ code: 409, message: 'Cannot update a recycled file' });
            }

            // 同文件夹下同名检测
            const { result: siblings } = await library.libraryService.getFiles({
                filters: { folder: file.folder_id || '=null', recycled: 0 },
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
            const oldPath = await library.libraryService.getItemFilePath(file);
            const { success: updated, oldData } = await library.libraryService.updateFile(parseInt(fileId), { name: resolvedName });

            if (updated && oldPath) {
                const dir = path.dirname(oldPath);
                const newPath = path.join(dir, resolvedName);
                if (fs.existsSync(oldPath) && oldPath !== newPath) {
                    try { fs.renameSync(oldPath, newPath); } catch (e) { console.error('Rename file error:', e); }
                }
            }

            const result = await library.libraryService.getFile(parseInt(fileId));
            emitFileUpdated(ctx, libraryId, parseInt(fileId), result, oldData);

            res.json({ code: 0, message: 'Success', data: result });
        } catch (error) {
            console.error('Error renaming file:', error);
            res.status(500).json({ code: 500, message: 'Internal server error' });
        }
    },
};

// 更新文件元数据（website 等）
const updateFileRoute: FileRouteDef = {
    method: 'post',
    path: '/update',
    async handler(ctx, req, res) {
        try {
            const { libraryId, fileId, data } = req.body;

            if (!libraryId || !fileId || !data) {
                return res.status(400).json({ code: 400, message: 'libraryId, fileId, data are required' });
            }

            const library = ctx.files.getLibrary(libraryId);
            if (!library) return res.status(404).json({ code: 404, message: 'Library not found' });

            const file = await library.libraryService.getFile(parseInt(fileId));
            if (!file) return res.status(404).json({ code: 404, message: 'File not found' });
            if (Number(file.recycled) === 1) {
                return res.status(409).json({ code: 409, message: 'Cannot update a recycled file' });
            }

            // 将 camelCase 映射到 snake_case 列名
            const updateData: Record<string, any> = {};
            if (data.website !== undefined) updateData.website = data.website;
            if (data.notes !== undefined) updateData.notes = data.notes;
            if (data.stars !== undefined) updateData.stars = data.stars;
            if (data.custom_fields !== undefined) updateData.custom_fields = typeof data.custom_fields === 'string' ? data.custom_fields : JSON.stringify(data.custom_fields);
            if (data.tags !== undefined) {
                if (!Array.isArray(data.tags)) {
                    return res.status(400).json({ code: 400, message: 'tags must be an array' });
                }
                updateData.tags = JSON.stringify(await resolveTagIds(library.libraryService, data.tags));
            }
            const requestedFolder = data.folder_id !== undefined ? data.folder_id : data.folderId;
            const resolvedFolderId = await resolveFolderId(library.libraryService, requestedFolder);

            if (Object.keys(updateData).length === 0 && resolvedFolderId === undefined) {
                return res.status(400).json({ code: 400, message: 'No valid fields to update' });
            }

            let oldData = file;
            if (Object.keys(updateData).length > 0) {
                ({ oldData } = await library.libraryService.updateFile(parseInt(fileId), updateData));
            }
            if (resolvedFolderId !== undefined) {
                await library.libraryService.setFileFolder(parseInt(fileId), resolvedFolderId);
            }
            const result = await library.libraryService.getFile(parseInt(fileId));
            emitFileUpdated(ctx, libraryId, parseInt(fileId), result, oldData);

            res.json({ code: 0, message: 'Success', data: result });
        } catch (error) {
            console.error('Error updating file:', error);
            res.status(500).json({ code: 500, message: 'Internal server error' });
        }
    },
};

export const fileMutationRoutes: FileRouteDef[] = [
    coverRoute,
    emptyTrashRoute,
    batchDeleteRoute,
    batchRecoverRoute,
    recoverRoute,
    deleteFileRoute,
    renameRoute,
    updateFileRoute,
];
