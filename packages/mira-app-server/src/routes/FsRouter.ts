import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { MiraServer } from '..';
import { LibraryServerDataSQLite } from 'mira-app-core/storage/sqlite';

interface FileEntry {
    name: string;
    path: string;
    isDir: boolean;
    size: number;
    modified: string;
    extension?: string;
}

export class FsRouter {
    private router: Router;
    private backend?: MiraServer;

    constructor(backend?: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private getLibraryPath(libraryId: string): string | null {
        if (!this.backend?.libraries) return null;
        const lib = this.backend.libraries.getLibrary(libraryId);
        if (!lib?.libraryService) return null;
        return lib.libraryService.config.customFields?.path || lib.libraryService.config.path || null;
    }

    private setupRoutes(): void {
        // 创建目录
        this.router.post('/mkdir', async (req: Request, res: Response) => {
            try {
                const { path: parentPath, name } = req.body;
                if (!parentPath || !name) {
                    res.status(400).json({ error: 'path and name are required' });
                    return;
                }
                const newPath = path.join(parentPath, name);
                await fs.promises.mkdir(newPath);
                res.json({ label: name, value: newPath, isLeaf: false });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to create directory' });
            }
        });

        // 列出目录（仅目录，供 PathTreeSelect 使用）
        this.router.get('/dirs', async (req: Request, res: Response) => {
            try {
                const dirPath = req.query.path as string;

                if (!dirPath) {
                    if (process.platform === 'win32') {
                        const drives: any[] = [];
                        for (let i = 65; i <= 90; i++) {
                            const drive = `${String.fromCharCode(i)}:\\`;
                            try {
                                fs.accessSync(drive);
                                drives.push({ label: drive, value: drive, isLeaf: false });
                            } catch { /* drive not available */ }
                        }
                        res.json(drives);
                        return;
                    }
                    const rootEntries = await fs.promises.readdir('/', { withFileTypes: true });
                    const dirs = rootEntries
                        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
                        .map(e => ({ label: e.name, value: `/${e.name}`, isLeaf: false }))
                        .sort((a, b) => a.label.localeCompare(b.label));
                    res.json(dirs);
                    return;
                }

                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
                const dirs = entries
                    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
                    .map(e => ({ label: e.name, value: path.join(dirPath, e.name), isLeaf: false }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                res.json(dirs);
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to list directories' });
            }
        });

        // 列出文件和目录（带分页，供文件管理器使用）
        this.router.get('/list', async (req: Request, res: Response) => {
            try {
                const libraryId = req.query.libraryId as string;
                const relativePath = (req.query.path as string) || '';
                const offset = parseInt(req.query.offset as string) || 0;
                const limit = parseInt(req.query.limit as string) || 50;

                const basePath = this.getLibraryPath(libraryId);
                if (!basePath) {
                    res.status(400).json({ error: 'Invalid libraryId or library path not configured' });
                    return;
                }

                const targetPath = relativePath ? path.join(basePath, relativePath) : basePath;

                // 安全检查：防止路径穿越
                const resolved = path.resolve(targetPath);
                if (!resolved.startsWith(path.resolve(basePath))) {
                    res.status(403).json({ error: 'Access denied' });
                    return;
                }

                const stat = await fs.promises.stat(resolved);
                if (!stat.isDirectory()) {
                    res.status(400).json({ error: 'Path is not a directory' });
                    return;
                }

                const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
                const items: FileEntry[] = [];

                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue;
                    const fullPath = path.join(resolved, entry.name);
                    try {
                        const entryStat = await fs.promises.stat(fullPath);
                        items.push({
                            name: entry.name,
                            path: relativePath ? path.join(relativePath, entry.name) : entry.name,
                            isDir: entry.isDirectory(),
                            size: entryStat.size,
                            modified: entryStat.mtime.toISOString(),
                            extension: entry.isDirectory() ? undefined : path.extname(entry.name).toLowerCase(),
                        });
                    } catch { /* skip inaccessible files */ }
                }

                // 目录优先，然后按名称排序
                items.sort((a, b) => {
                    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });

                const total = items.length;
                const paged = items.slice(offset, offset + limit);

                res.json({
                    items: paged,
                    total,
                    offset,
                    limit,
                    hasMore: offset + limit < total,
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to list files' });
            }
        });

        // 移动文件/文件夹
        this.router.post('/move', async (req: Request, res: Response) => {
            try {
                const { libraryId, source, destination } = req.body;
                if (!libraryId || !source || !destination) {
                    res.status(400).json({ error: 'libraryId, source and destination are required' });
                    return;
                }

                const basePath = this.getLibraryPath(libraryId);
                if (!basePath) {
                    res.status(400).json({ error: 'Invalid libraryId' });
                    return;
                }

                const sourcePath = path.resolve(path.join(basePath, source));
                const destPath = path.resolve(destination);

                if (!sourcePath.startsWith(path.resolve(basePath))) {
                    res.status(403).json({ error: 'Source path access denied' });
                    return;
                }

                if (!await fileExists(sourcePath)) {
                    res.status(404).json({ error: 'Source not found' });
                    return;
                }

                await fs.promises.rename(sourcePath, path.join(destPath, path.basename(sourcePath)));
                res.json({ success: true });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to move' });
            }
        });

        // 删除文件/文件夹
        this.router.post('/remove', async (req: Request, res: Response) => {
            try {
                const { libraryId, paths } = req.body;
                if (!libraryId || !paths?.length) {
                    res.status(400).json({ error: 'libraryId and paths are required' });
                    return;
                }

                const basePath = this.getLibraryPath(libraryId);
                if (!basePath) {
                    res.status(400).json({ error: 'Invalid libraryId' });
                    return;
                }

                for (const relativePath of paths) {
                    const fullPath = path.resolve(path.join(basePath, relativePath));
                    if (!fullPath.startsWith(path.resolve(basePath))) {
                        continue;
                    }
                    const stat = await fs.promises.stat(fullPath);
                    if (stat.isDirectory()) {
                        await fs.promises.rm(fullPath, { recursive: true });
                    } else {
                        await fs.promises.unlink(fullPath);
                    }
                }

                res.json({ success: true });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to delete' });
            }
        });

        // 同步：对比磁盘文件与数据库记录
        this.router.post('/sync', async (req: Request, res: Response) => {
            try {
                const { libraryId } = req.body;
                if (!libraryId) {
                    res.status(400).json({ error: 'libraryId is required' });
                    return;
                }

                const lib = this.backend?.libraries?.getLibrary(libraryId);
                const dbService = lib?.libraryService as LibraryServerDataSQLite | undefined;
                const libraryPath = this.getLibraryPath(libraryId);

                if (!dbService || !libraryPath) {
                    res.status(400).json({ error: 'Invalid libraryId or library not active' });
                    return;
                }

                const result = await this.syncLibrary(libraryPath, dbService);
                res.json({ success: true, data: result });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to sync' });
            }
        });
    }

    private async scanDiskFiles(libraryPath: string): Promise<string[]> {
        const entries = await fg('**/*', {
            cwd: libraryPath,
            absolute: true,
            dot: false,
            ignore: [
                'thumbs/**',
                'thumbs',
                '**/thumbs/**',
                '**/.*',
                '**/*.db',
                '**/*.db-journal',
                '**/*.db-wal',
                '**/*.db-shm',
                '**/*.tmp',
                '**/*.temp',
            ],
            onlyFiles: true,
            suppressErrors: true,
        });
        // 过滤掉空文件
        return entries.filter((p) => {
            try { return fs.statSync(p).size > 0; } catch { return false; }
        });
    }

    private async syncLibrary(
        libraryPath: string,
        dbService: LibraryServerDataSQLite,
    ): Promise<{ scanned: number; added: number; removed: number }> {
        const diskFiles = await this.scanDiskFiles(libraryPath);
        const diskSet = new Set(diskFiles);

        // 直接用 SQL 查询，避免 getFiles 的 processingFiles 处理
        const rows: any[] = await dbService.getSql('SELECT id, path FROM files', []);
        const dbPathSet = new Set(rows.map(r => r.path));

        let added = 0;
        let removed = 0;

        // 移除数据库中不存在于磁盘的记录
        for (const row of rows) {
            if (!diskSet.has(row.path)) {
                await dbService.deleteFile(row.id);
                removed++;
            }
        }

        // 添加磁盘中存在但数据库中没有的文件
        for (const filePath of diskFiles) {
            if (!dbPathSet.has(filePath)) {
                const fileData: Record<string, any> = {};
                const folderId = await this.resolveFolder(filePath, libraryPath, dbService);
                if (folderId) fileData.folder_id = folderId;
                await dbService.createFileFromPath(filePath, fileData, { importType: 'link' });
                added++;
            }
        }

        return { scanned: diskFiles.length, added, removed };
    }

    private async resolveFolder(
        filePath: string,
        libraryPath: string,
        dbService: LibraryServerDataSQLite,
    ): Promise<number | null> {
        const rel = path.relative(libraryPath, path.dirname(filePath));
        if (!rel) return null;
        const parts = rel.replace(/\\/g, '/').split('/');
        let parentId: number | null = null;
        for (const part of parts) {
            if (!part) continue;
            let folder = await dbService.findFolderByName(part, parentId);
            if (!folder) {
                const id = await dbService.createFolder({
                    title: part, parent_id: parentId, color: 0, icon: '',
                });
                folder = { id };
            }
            parentId = folder.id;
        }
        return parentId;
    }

    public getRouter(): Router {
        return this.router;
    }
}

async function fileExists(p: string): Promise<boolean> {
    try { await fs.promises.access(p); return true; } catch { return false; }
}
