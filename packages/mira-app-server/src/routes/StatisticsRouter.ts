import { Router, Request, Response } from 'express';
import { MiraServer } from '../server';

export class StatisticsRouter {
    private router: Router;
    private backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private static getStartTime(req: Request): number | undefined {
        const days = parseInt(req.query.days as string);
        if (days > 0) return Date.now() - days * 24 * 60 * 60 * 1000;
        return undefined;
    }

    private setupRoutes(): void {
        // 上传统计（按用户）
        this.router.get('/:libraryId/upload', async (req: Request, res: Response) => {
            try {
                const { libraryId } = req.params;
                const obj = this.backend.libraries?.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({ code: 404, message: 'Library not found', data: null });
                }

                const startTime = StatisticsRouter.getStartTime(req);
                const stats = await obj.libraryService.getUploadStatistics(startTime);

                // 把 uploader ID 映射为用户名
                const userStorage = this.backend.httpServer?.authRouter.getUserStorage();
                const allUsers = userStorage ? await userStorage.getAllUsers() : [];
                const userMap = new Map(allUsers.map(u => [u.id, u.username]));

                const data = stats.map((row: any) => ({
                    uploader: row.uploader,
                    uploaderName: row.uploader ? (userMap.get(row.uploader) || `User#${row.uploader}`) : '未知',
                    fileCount: row.file_count,
                    totalSize: row.total_size,
                }));

                res.json({ code: 0, message: 'Success', data });
            } catch (error) {
                console.error('Error getting upload statistics:', error);
                res.status(500).json({ code: 500, message: 'Internal server error', data: null });
            }
        });

        // 每日上传统计（按日期分组）
        this.router.get('/:libraryId/upload/daily', async (req: Request, res: Response) => {
            try {
                const { libraryId } = req.params;
                const obj = this.backend.libraries?.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({ code: 404, message: 'Library not found', data: null });
                }

                const startTime = StatisticsRouter.getStartTime(req);
                const stats = await obj.libraryService.getDailyUploadStats(startTime);
                res.json({ code: 0, message: 'Success', data: stats });
            } catch (error) {
                console.error('Error getting daily upload stats:', error);
                res.status(500).json({ code: 500, message: 'Internal server error', data: null });
            }
        });

        // 文件类型统计
        this.router.get('/:libraryId/file-types', async (req: Request, res: Response) => {
            try {
                const { libraryId } = req.params;
                const obj = this.backend.libraries?.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({ code: 404, message: 'Library not found', data: null });
                }

                const startTime = StatisticsRouter.getStartTime(req);
                const stats = await obj.libraryService.getFileTypeStatistics(startTime);
                res.json({ code: 0, message: 'Success', data: stats });
            } catch (error) {
                console.error('Error getting file type statistics:', error);
                res.status(500).json({ code: 500, message: 'Internal server error', data: null });
            }
        });

        // 最近上传记录（一周内，按天/用户/文件夹/标签聚合）
        this.router.get('/:libraryId/recent-uploads', async (req: Request, res: Response) => {
            try {
                const { libraryId } = req.params;
                const days = parseInt(req.query.days as string) || 7;
                const obj = this.backend.libraries?.getLibrary(libraryId);
                if (!obj) {
                    return res.status(404).json({ code: 404, message: 'Library not found', data: null });
                }

                const raw: any = await obj.libraryService.getRecentUploads(days);

                // 收集所有 folder_id，批量查名称
                const folderIds = [...new Set((raw.byFolder || []).map((r: any) => r.folder_id).filter(Boolean))] as number[];

                const folderMap = new Map<number, string>();
                for (const fid of folderIds) {
                    const folder = await obj.libraryService.getFolder(fid);
                    if (folder) folderMap.set(fid, folder.title);
                }

                const tagMap = new Map<number, string>();
                const allTags = await obj.libraryService.getAllTags();
                for (const tag of allTags) {
                    tagMap.set(tag.id, tag.title);
                }

                const userStorage = this.backend.httpServer?.authRouter.getUserStorage();
                const allUsers = userStorage ? await userStorage.getAllUsers() : [];
                const userMap = new Map(allUsers.map(u => [u.id, u.username]));

                const userName = (id: number | null) => id ? (userMap.get(id) || `User#${id}`) : '未知';

                // 合并成统一的活动记录
                type Record = { date: string; userName: string; uploader: number | null; target: string; targetType: 'folder' | 'tag'; targetId: number | null; fileCount: number };
                const records: Record[] = [];

                for (const r of (raw.byFolder || [])) {
                    const folderName = r.folder_id ? (folderMap.get(r.folder_id) || '未分类') : '素材库';
                    records.push({ date: r.date, userName: userName(r.uploader), uploader: r.uploader, target: folderName, targetType: 'folder', targetId: r.folder_id || null, fileCount: r.file_count });
                }

                for (const r of (raw.byTag || [])) {
                    const tagName = r.tag_id ? (tagMap.get(Number(r.tag_id)) || '未知标签') : '未知标签';
                    records.push({ date: r.date, userName: userName(r.uploader), uploader: r.uploader, target: tagName, targetType: 'tag', targetId: r.tag_id ? Number(r.tag_id) : null, fileCount: r.file_count });
                }

                // 按日期分组
                const grouped = new Map<string, Record[]>();
                for (const r of records) {
                    if (!grouped.has(r.date)) grouped.set(r.date, []);
                    grouped.get(r.date)!.push(r);
                }

                // 合并同天同用户同目标的记录
                const result: { date: string; items: { userName: string; uploader: number | null; target: string; targetType: string; targetId: number | null; fileCount: number }[] }[] = [];
                for (const [date, items] of grouped) {
                    const merged = new Map<string, { userName: string; uploader: number | null; target: string; targetType: string; targetId: number | null; fileCount: number }>();
                    for (const item of items) {
                        const key = `${item.uploader}::${item.targetType}::${item.targetId}`;
                        const existing = merged.get(key);
                        if (existing) {
                            existing.fileCount += item.fileCount;
                        } else {
                            merged.set(key, { userName: item.userName, uploader: item.uploader, target: item.target, targetType: item.targetType, targetId: item.targetId, fileCount: item.fileCount });
                        }
                    }
                    result.push({ date, items: [...merged.values()].sort((a, b) => b.fileCount - a.fileCount) });
                }

                result.sort((a, b) => b.date.localeCompare(a.date));
                res.json({ code: 0, message: 'Success', data: result });
            } catch (error) {
                console.error('Error getting recent uploads:', error);
                res.status(500).json({ code: 500, message: 'Internal server error', data: null });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
