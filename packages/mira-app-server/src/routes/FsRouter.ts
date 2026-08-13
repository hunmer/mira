import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { ZipArchive } from 'archiver';
import { MiraServer } from '..';
import { LibraryServerDataSQLite } from 'mira-app-core/storage/sqlite';
import { createSyncFilter, getIgnoreGlobs, ShouldSyncFn } from '../sync/SyncFilter';

interface FileEntry {
    name: string;
    path: string;
    isDir: boolean;
    size: number;
    modified: string;
    extension?: string;
}

interface DatabaseFileEntry {
    id: number;
    name: string;
    path: string;
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

                const customFields = dbService.config.customFields;
                const result = await this.syncLibrary(libraryPath, dbService, customFields);
                res.json({ success: true, data: result });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to sync' });
            }
        });

        // 扫描数据库中已不存在于磁盘的文件记录
        this.router.get('/database/missing', async (req: Request, res: Response) => {
            try {
                const context = this.getActiveLibraryContext(req.query.libraryId as string);
                if (!context) {
                    res.status(400).json({ error: 'Invalid libraryId or library not active' });
                    return;
                }

                const files = await this.findMissingDatabaseFiles(context.dbService);
                res.json({ success: true, data: files });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to scan missing files' });
            }
        });

        // 清空数据库中已不存在于磁盘的文件记录
        this.router.delete('/database/missing', async (req: Request, res: Response) => {
            try {
                const context = this.getActiveLibraryContext(req.body.libraryId);
                if (!context) {
                    res.status(400).json({ error: 'Invalid libraryId or library not active' });
                    return;
                }

                const files = await this.findMissingDatabaseFiles(context.dbService);
                let removed = 0;
                for (const file of files) {
                    if (await context.dbService.deleteFile(file.id)) removed++;
                }
                res.json({ success: true, data: { removed } });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to clear missing files' });
            }
        });

        // 自动同步关闭时，手动查找并导入磁盘中的新文件
        this.router.post('/database/new', async (req: Request, res: Response) => {
            try {
                const context = this.getActiveLibraryContext(req.body.libraryId);
                if (!context) {
                    res.status(400).json({ error: 'Invalid libraryId or library not active' });
                    return;
                }
                if (context.customFields?.enableAutoSync ?? true) {
                    res.status(409).json({ error: 'Disable auto sync before finding new files' });
                    return;
                }

                const files = await this.importNewDiskFiles(
                    context.libraryPath,
                    context.dbService,
                    context.customFields,
                );
                res.json({ success: true, data: files });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to find new files' });
            }
        });

        // 批量下载：单文件直接下原文件，多文件/含目录打包成 zip
        this.router.post('/download', async (req: Request, res: Response) => {
            try {
                const { libraryId, paths } = req.body as { libraryId: string; paths: string[] };
                if (!libraryId || !Array.isArray(paths) || paths.length === 0) {
                    res.status(400).json({ error: 'libraryId and paths are required' });
                    return;
                }

                const basePath = this.getLibraryPath(libraryId);
                if (!basePath) {
                    res.status(400).json({ error: 'Invalid libraryId' });
                    return;
                }
                const resolvedBase = path.resolve(basePath);

                // 解析为绝对路径，严格校验路径穿越
                const safe: string[] = [];
                for (const rel of paths) {
                    const full = path.resolve(path.join(resolvedBase, rel));
                    if (full.startsWith(resolvedBase) && fs.existsSync(full)) {
                        safe.push(full);
                    }
                }
                if (safe.length === 0) {
                    res.status(400).json({ error: 'No valid files to download' });
                    return;
                }

                // 单文件：直接流式下载原文件
                if (safe.length === 1) {
                    const filePath = safe[0];
                    const stat = await fs.promises.stat(filePath);
                    if (stat.isFile()) {
                        const fileName = path.basename(filePath);
                        res.setHeader('Content-Type', 'application/octet-stream');
                        res.setHeader('Content-Length', stat.size);
                        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
                        fs.createReadStream(filePath).on('error', (err) => {
                            if (!res.headersSent) res.status(500).json({ error: err.message });
                        }).pipe(res);
                        return;
                    }
                }

                // 多文件/含目录：流式打包 zip
                const zipName = encodeURIComponent('download.zip');
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${zipName}`);

                const archive = new ZipArchive({ zlib: { level: 5 } });
                archive.on('error', (err: Error) => {
                    if (!res.headersSent) res.status(500).json({ error: err.message });
                    else res.end();
                });
                archive.on('warning', (err: any) => {
                    if (err?.code !== 'ENOENT') console.warn('archiver warning:', err);
                });
                archive.pipe(res);

                for (const full of safe) {
                    const rel = path.relative(resolvedBase, full);
                    const stat = await fs.promises.stat(full);
                    if (stat.isDirectory()) {
                        archive.directory(full, rel);
                    } else {
                        archive.file(full, { name: rel });
                    }
                }
                archive.finalize();
            } catch (error: any) {
                if (!res.headersSent) res.status(500).json({ error: error.message || 'Failed to download' });
            }
        });
    }

    private async scanDiskFiles(
        libraryPath: string,
        customFields: Record<string, any> | undefined,
    ): Promise<string[]> {
        // fast-glob 的 ignore 只能表达「排除」，无法表达白名单的「强制包含」。
        // 因此先用默认 + 用户黑名单做粗筛（让 fast-glob 少跑文件），
        // 再用 createSyncFilter() 的 shouldSync 做一次精确判定，应用白名单覆盖。
        const ignore = getIgnoreGlobs(customFields);
        const shouldSync: ShouldSyncFn = createSyncFilter(customFields);

        const entries = await fg('**/*', {
            cwd: libraryPath,
            absolute: true,
            dot: false,
            ignore,
            onlyFiles: true,
            suppressErrors: true,
        });
        // 过滤掉空文件，并应用白名单覆盖（shouldSync）
        return entries.filter((p) => {
            try {
                if (fs.statSync(p).size === 0) return false;
            } catch {
                return false;
            }
            const rel = path.relative(libraryPath, p).replace(/\\/g, '/');
            return shouldSync(rel);
        });
    }

    private getActiveLibraryContext(libraryId: string | undefined): {
        dbService: LibraryServerDataSQLite;
        libraryPath: string;
        customFields: Record<string, any> | undefined;
    } | null {
        if (!libraryId) return null;
        const lib = this.backend?.libraries?.getLibrary(libraryId);
        const dbService = lib?.libraryService as LibraryServerDataSQLite | undefined;
        const libraryPath = this.getLibraryPath(libraryId);
        if (!dbService || !libraryPath) return null;
        return { dbService, libraryPath, customFields: dbService.config.customFields };
    }

    private async findMissingDatabaseFiles(dbService: LibraryServerDataSQLite): Promise<DatabaseFileEntry[]> {
        const rows = await dbService.getSql('SELECT id, name, path FROM files WHERE recycled = 0 ORDER BY id DESC', []);
        const missing: DatabaseFileEntry[] = [];
        for (const row of rows as DatabaseFileEntry[]) {
            if (!await fileExists(row.path)) missing.push(row);
        }
        return missing;
    }

    private async importNewDiskFiles(
        libraryPath: string,
        dbService: LibraryServerDataSQLite,
        customFields: Record<string, any> | undefined,
    ): Promise<DatabaseFileEntry[]> {
        const diskFiles = await this.scanDiskFiles(libraryPath, customFields);
        const rows: Array<{ path: string }> = await dbService.getSql('SELECT path FROM files', []);
        const dbPathSet = new Set(rows.map(row => row.path));
        const added: DatabaseFileEntry[] = [];

        for (const filePath of diskFiles) {
            if (dbPathSet.has(filePath)) continue;
            const fileData: Record<string, any> = {};
            const folderId = await this.resolveFolder(filePath, libraryPath, dbService);
            if (folderId) fileData.folder_id = folderId;
            const file = await dbService.createFileFromPath(filePath, fileData, { importType: 'link' });
            if (file.duplicate) continue;
            added.push({ id: Number(file.id), name: file.name, path: file.path });
        }
        return added;
    }

    private async syncLibrary(
        libraryPath: string,
        dbService: LibraryServerDataSQLite,
        customFields: Record<string, any> | undefined,
    ): Promise<{ scanned: number; added: number; removed: number }> {
        const diskFiles = await this.scanDiskFiles(libraryPath, customFields);
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
