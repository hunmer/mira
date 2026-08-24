import * as fs from 'fs';
import * as path from 'path';
import { Database as SQLiteDatabase } from 'sqlite3';
import type { ILibraryServerData } from 'mira-app-core/storage/sqlite';
import { MiraServer } from '../MiraServer';

export type ImportSource = 'eagle' | 'billfish';

export interface LibraryImportOptions {
    /** 新素材库名称，默认取源目录名 */
    name?: string;
    /** 新素材库存储路径，默认 <dataPath>/imported/<name> */
    libraryPath?: string;
}

export interface LibraryImportProgress {
    id: string;
    source: ImportSource;
    sourcePath: string;
    libraryId: string;
    libraryName: string;
    status: 'importing' | 'completed' | 'error' | 'cancelled';
    total: number;
    completed: number;
    skipped: number;
    failed: number;
    current: string;
    error?: string;
    startedAt: number;
    finishedAt?: number;
}

interface ImportTask extends LibraryImportProgress {
    cancelRequested: boolean;
}

// billfish 文件夹/标签颜色索引（1-9）→ 十六进制，与老版导入脚本一致
const BILLFISH_COLORS = ['#a3a3a3', '#f47272', '#f2b054', '#f3d919', '#90e968', '#5de0ce', '#62b7ff', '#ac5ce5', '#d571a3'];

function colorToInt(hex?: string): number | undefined {
    if (!hex) return undefined;
    const value = parseInt(hex.replace('#', ''), 16);
    return Number.isNaN(value) ? undefined : value;
}

function compact(obj: Record<string, any>): Record<string, any> | undefined {
    const result = Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    // 空对象返回 undefined：保证 files.metadata 为 NULL，导入完成后 scanPending 才会用 exiftool 补全
    return Object.keys(result).length > 0 ? result : undefined;
}

const yieldToEventLoop = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function openSqlite(file: string): Promise<SQLiteDatabase> {
    const sqlite3 = require('sqlite3');
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err: any) => (err ? reject(err) : resolve(db)));
    });
}

function closeSqlite(db: SQLiteDatabase): Promise<void> {
    return new Promise(resolve => db.close(() => resolve()));
}

function dbAll(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err: any, rows: any[]) => (err ? reject(err) : resolve(rows ?? [])));
    });
}

/**
 * 从 Eagle / Billfish 素材库导入：
 * 新建一个 Mira 素材库，复制素材文件并保留文件夹结构、标签、文件信息（尺寸/时长/评分/备注/来源网址等）。
 */
export class LibraryImportService {
    private tasks = new Map<string, ImportTask>();

    constructor(private backend: MiraServer) {}

    getProgress(importId: string): LibraryImportProgress | undefined {
        const task = this.tasks.get(importId);
        if (!task) return undefined;
        const { cancelRequested, ...progress } = task;
        return progress;
    }

    cancel(importId: string): boolean {
        const task = this.tasks.get(importId);
        if (!task || task.status !== 'importing') return false;
        task.cancelRequested = true;
        return true;
    }

    /** 校验源目录格式，返回错误信息（null 表示通过） */
    validate(source: ImportSource, sourcePath: string): string | null {
        if (!fs.existsSync(sourcePath)) return `源目录不存在: ${sourcePath}`;
        if (source === 'eagle') {
            if (!fs.existsSync(path.join(sourcePath, 'metadata.json'))) {
                return '不是有效的 Eagle 素材库（缺少 metadata.json）';
            }
        } else {
            if (!fs.existsSync(path.join(sourcePath, '.bf', 'billfish.db'))) {
                return '不是有效的 Billfish 素材库（缺少 .bf/billfish.db）';
            }
        }
        return null;
    }

    async start(source: ImportSource, sourcePath: string, options: LibraryImportOptions = {}): Promise<{ importId: string; libraryId: string }> {
        const error = this.validate(source, sourcePath);
        if (error) throw new Error(error);

        const defaultName = path.basename(sourcePath).replace(/\.library$/i, '') || '导入素材库';
        const name = options.name?.trim() || defaultName;
        const libraryPath = options.libraryPath?.trim() || path.join(this.backend.getDataPath(), 'imported', name);

        const configs = await this.readLibraryConfigs();
        for (const config of configs) {
            const existing = config.path || config.customFields?.path;
            if (existing && path.resolve(existing) === path.resolve(libraryPath)) {
                throw new Error(`存储路径已被素材库「${config.name}」使用: ${libraryPath}`);
            }
        }

        const libraryId = Date.now().toString();
        const libraryConfig: Record<string, any> = {
            id: libraryId,
            name,
            path: libraryPath,
            description: `Imported from ${source === 'eagle' ? 'Eagle' : 'Billfish'}: ${sourcePath}`,
            icon: 'default',
            customFields: {
                path: libraryPath,
                enableHash: false,
                enableAutoSync: true,
                enableAutoBackup: true,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
        };

        configs.push(libraryConfig);
        await fs.promises.writeFile(this.getLibrarysPath(), JSON.stringify(configs, null, 2), 'utf8');
        await this.backend.libraries!.load(libraryConfig);

        const importId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const task: ImportTask = {
            id: importId,
            source,
            sourcePath,
            libraryId,
            libraryName: name,
            status: 'importing',
            total: 0,
            completed: 0,
            skipped: 0,
            failed: 0,
            current: '',
            startedAt: Date.now(),
            cancelRequested: false,
        };
        this.tasks.set(importId, task);

        void this.run(task);
        return { importId, libraryId };
    }

    private async run(task: ImportTask): Promise<void> {
        try {
            const dbService = this.backend.libraries!.getLibrary(task.libraryId)?.libraryService;
            if (!dbService) throw new Error('新素材库加载失败');
            if (task.source === 'eagle') {
                await this.importEagle(dbService, task);
            } else {
                await this.importBillfish(dbService, task);
            }
            task.status = task.cancelRequested ? 'cancelled' : 'completed';
            if (task.status === 'completed') {
                this.schedulePostImportScan(task, dbService);
            }
        } catch (err) {
            task.status = 'error';
            task.error = err instanceof Error ? err.message : String(err);
        } finally {
            task.current = '';
            task.finishedAt = Date.now();
        }
    }

    /**
     * 导入完成后补全缺失的元数据（exiftool）与缺失的缩略图。
     * 仅处理缺失项：已从源库带来的 metadata/thumb 不会被覆盖（metadata 合并写入）。
     */
    private schedulePostImportScan(task: ImportTask, dbService: ILibraryServerData): void {
        void this.backend.metadataService?.scanPending(task.libraryId, dbService)
            .catch(err => console.error('[import] metadata scan failed:', err));
        void this.backend.thumbnailService?.scanPending(task.libraryId, dbService, 'library-import')
            .catch(err => console.error('[import] thumbnail scan failed:', err));
    }

    // ============ Eagle ============

    private async importEagle(db: ILibraryServerData, task: ImportTask): Promise<void> {
        const root = task.sourcePath;
        const meta = JSON.parse(await fs.promises.readFile(path.join(root, 'metadata.json'), 'utf8'));

        // metadata.json 的 folders 树 → mira folders（保留层级与颜色）
        const folderMap = new Map<string, number>();
        const addFolder = async (item: any, parentId?: number): Promise<void> => {
            const newId = await db.createFolder({
                title: item.name,
                parent_id: parentId,
                color: typeof item.iconColor === 'number' ? item.iconColor : undefined,
            });
            folderMap.set(item.id, newId);
            for (const child of item.children || []) {
                await addFolder(child, newId);
            }
        };
        for (const item of meta.folders || []) {
            await addFolder(item);
        }

        // eagle 标签是字符串名称，按需查找/创建（顶层）
        const tagMap = new Map<string, number>();
        const getTagId = async (title: string): Promise<number> => {
            let id = tagMap.get(title);
            if (id === undefined) {
                const found = await db.queryTag({ title });
                id = found.length > 0 ? Number(found[0].id) : await db.createTag({ title });
                tagMap.set(title, id as number);
            }
            return id as number;
        };

        const imagesDir = path.join(root, 'images');
        const dirs = fs.readdirSync(imagesDir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => path.join(imagesDir, e.name));
        task.total = dirs.length;

        for (const dir of dirs) {
            if (task.cancelRequested) break;
            const metaFile = path.join(dir, 'metadata.json');
            if (!fs.existsSync(metaFile)) {
                task.skipped++;
                continue;
            }
            try {
                const m = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
                if (m.isDeleted || !m.name || !m.ext) {
                    task.skipped++;
                    continue;
                }
                task.current = `${m.name}.${m.ext}`;

                const file = path.join(dir, `${m.name}.${m.ext}`);
                if (!fs.existsSync(file)) {
                    task.skipped++;
                    continue;
                }

                const tagIds: number[] = [];
                for (const tag of m.tags || []) {
                    tagIds.push(await getTagId(String(tag)));
                }

                const fileMeta: Record<string, any> = {
                    created_at: m.btime || m.lastModified || Date.now(),
                    size: m.size,
                    stars: m.star || 0,
                    notes: m.annotation || undefined,
                    website: m.url || undefined,
                    metadata: compact({
                        width: m.width,
                        height: m.height,
                        duration: m.duration,
                        colors: Array.isArray(m.palettes) ? m.palettes.map((p: any) => p.color).filter(Boolean) : undefined,
                    }),
                    folder_id: (m.folders || []).map((f: string) => folderMap.get(f)).find((id: number | undefined) => id !== undefined),
                };
                if (tagIds.length > 0) {
                    fileMeta.tags = JSON.stringify(tagIds.map(String));
                }

                // 源缩略图存在时预置 thumb=1：onFileImported 的生成任务看到后直接跳过，避免竞态覆盖源图
                const sourceThumb = path.join(dir, `${m.name}_thumbnail.png`);
                if (fs.existsSync(sourceThumb)) {
                    fileMeta.thumb = 1;
                }

                const result = await db.createFileFromPath(file, fileMeta, { importType: 'copy' });
                if ((result as any).duplicate) {
                    task.skipped++;
                } else {
                    await this.copyThumb(db, result, sourceThumb);
                    task.completed++;
                }
            } catch (err) {
                task.failed++;
                console.error(`[import:eagle] ${dir}:`, err);
            }
            if ((task.completed + task.skipped + task.failed) % 50 === 0) {
                await yieldToEventLoop();
            }
        }
    }

    // ============ Billfish ============

    private async importBillfish(db: ILibraryServerData, task: ImportTask): Promise<void> {
        const root = task.sourcePath;
        const bfDb = await openSqlite(path.join(root, '.bf', 'billfish.db'));

        try {
            const info = (await dbAll(bfDb, 'select * from library'))[0];
            if (info?.version < 30) {
                throw new Error('仅支持 Billfish V3 数据库');
            }

            const folders = await dbAll(bfDb, 'select * from bf_folder');
            const tags = await dbAll(bfDb, 'select * from bf_tag_v2');
            const folderMap = new Map<number, number>();
            const tagMap = new Map<number, number>();

            // 按 pid 升序排序保证父节点先创建，保留层级与颜色
            const buildTree = async (rows: any[], isFolder: boolean): Promise<void> => {
                const sorted = [...rows].sort((a, b) => (a.pid || 0) - (b.pid || 0));
                for (const row of sorted) {
                    const parentId = (isFolder ? folderMap : tagMap).get(row.pid);
                    const data = {
                        title: row.name,
                        parent_id: parentId !== undefined ? parentId : undefined,
                        color: colorToInt(BILLFISH_COLORS[row.color]),
                    };
                    const newId = isFolder ? await db.createFolder(data) : await db.createTag(data);
                    (isFolder ? folderMap : tagMap).set(row.id, newId);
                }
            };
            await buildTree(tags, false);
            await buildTree(folders, true);

            const files = await dbAll(bfDb, 'select * from bf_file');
            task.total = files.length;

            const indexByFile = async (table: string): Promise<Map<number, any>> => {
                const map = new Map<number, any>();
                for (const row of await dbAll(bfDb, `select * from ${table}`)) {
                    map.set(row.file_id, row);
                }
                return map;
            };
            const [userMeta, imageMeta, videoMeta, tagJoin] = await Promise.all([
                indexByFile('bf_material_userdata'),
                indexByFile('bf_material_v2'),
                indexByFile('bf_material_video'),
                dbAll(bfDb, 'select * from bf_tag_join_file'),
            ]);
            const tagsByFile = new Map<number, number[]>();
            for (const { file_id, tag_id } of tagJoin) {
                const list = tagsByFile.get(file_id) || [];
                list.push(tag_id);
                tagsByFile.set(file_id, list);
            }

            // 由文件夹名链定位素材实际路径（billfish 素材按文件夹结构平铺存放）
            const folderById = new Map(folders.map(f => [f.id, f]));
            const folderNames = (pid: number): string[] => {
                const names: string[] = [];
                let cur = folderById.get(pid);
                while (cur) {
                    names.unshift(cur.name);
                    cur = cur.pid > 0 ? folderById.get(cur.pid) : undefined;
                }
                return names;
            };
            const importedMd5 = new Set<string>();

            for (const row of files) {
                if (task.cancelRequested) break;
                task.current = row.name || '';
                try {
                    if (row.pid === -1 || row.is_link) {
                        // 回收站 / 快捷方式（服务端无法解析 .lnk）跳过
                        task.skipped++;
                        continue;
                    }
                    if (row.md5 && importedMd5.has(row.md5)) {
                        task.skipped++;
                        continue;
                    }

                    const file = path.resolve(root, ...folderNames(row.pid), row.name || '');
                    if (!row.name || !fs.existsSync(file)) {
                        task.skipped++;
                        continue;
                    }

                    const image = imageMeta.get(row.id) || {};
                    const video = videoMeta.get(row.id) || {};
                    const user = userMeta.get(row.id) || {};
                    const fileMeta: Record<string, any> = {
                        created_at: row.born ? row.born * 1000 : Date.now(),
                        size: row.file_size,
                        stars: user.score ?? 0,
                        notes: user.note || undefined,
                        website: user.origin || undefined,
                        metadata: compact({
                            width: image.w,
                            height: image.h,
                            duration: video.duration,
                            bitRate: video.bit_rate,
                            rotation: video.ratotion,
                        }),
                        folder_id: folderMap.get(row.pid),
                    };
                    if (row.md5) {
                        fileMeta.hash = row.md5;
                        importedMd5.add(row.md5);
                    }
                    const tagIds = (tagsByFile.get(row.id) || [])
                        .map(tagId => tagMap.get(tagId))
                        .filter((id: number | undefined) => id !== undefined) as number[];
                    if (tagIds.length > 0) {
                        fileMeta.tags = JSON.stringify(tagIds.map(String));
                    }

                    // 源缩略图存在时预置 thumb=1：onFileImported 的生成任务看到后直接跳过，避免竞态覆盖源图
                    const idHex = ('0' + row.id.toString(16)).slice(-2);
                    const sourceThumb = path.join(root, '.bf', '.preview', idHex, `${row.id}.small.webp`);
                    if (fs.existsSync(sourceThumb)) {
                        fileMeta.thumb = 1;
                    }

                    const result = await db.createFileFromPath(file, fileMeta, { importType: 'copy' });
                    if ((result as any).duplicate) {
                        task.skipped++;
                    } else {
                        await this.copyThumb(db, result, sourceThumb);
                        task.completed++;
                    }
                } catch (err) {
                    task.failed++;
                    console.error(`[import:billfish] ${row.name}:`, err);
                }
                if ((task.completed + task.skipped + task.failed) % 50 === 0) {
                    await yieldToEventLoop();
                }
            }
        } finally {
            await closeSqlite(bfDb);
        }
    }

    /** 把源库缩略图复制为 mira 的 thumbs/<hash|id>.png 并标记 thumb=1（复制失败回滚为 0，交给补扫生成） */
    private async copyThumb(db: ILibraryServerData, file: Record<string, any>, sourceThumb: string): Promise<void> {
        if (!sourceThumb || !fs.existsSync(sourceThumb)) return;
        try {
            const thumbPath = await db.getItemThumbPath(file);
            await fs.promises.mkdir(path.dirname(thumbPath), { recursive: true });
            await fs.promises.copyFile(sourceThumb, thumbPath);
            await db.updateFile(file.id, { thumb: 1 });
        } catch (err) {
            // 入库时预置了 thumb=1，复制失败必须回滚，否则 scanPending 不会补生成
            try { await db.updateFile(file.id, { thumb: 0 }); } catch {}
            console.error('[import] copy thumb failed:', err);
        }
    }

    // ============ librarys.json ============

    private getLibrarysPath(): string {
        return path.join(this.backend.getDataPath(), 'librarys.json');
    }

    private async readLibraryConfigs(): Promise<any[]> {
        try {
            return JSON.parse(await fs.promises.readFile(this.getLibrarysPath(), 'utf8'));
        } catch {
            return [];
        }
    }
}
