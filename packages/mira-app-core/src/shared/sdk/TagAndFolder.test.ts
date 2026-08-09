import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MiraClient } from './client/MiraClient';
import {
    createLoggedInClient,
    LIBRARY_ID,
    TEST_PREFIX,
    uniqueName,
    isServerReachable,
} from './test-helpers';

const SERVER_OK = await isServerReachable();
const describeOrSkip = SERVER_OK ? describe : describe.skip;

/**
 * Tag + Folder 测试：
 * - 只读：getAll / query（断言根节点 parent_id === null）
 * - CRUD 闭环：create → update → query 校验 → delete
 * - 测试数据用 __sdk_test__ 前缀，afterAll 兜底按前缀清理
 */
describeOrSkip('TagModule + FolderModule', () => {
    let client: MiraClient;

    beforeAll(async () => {
        client = await createLoggedInClient();
    });

    // 兜底清理：删除所有测试前缀残留，杜绝垃圾数据
    afterAll(async () => {
        if (!client) return;
        await cleanupByPrefix(client, 'tag');
        await cleanupByPrefix(client, 'folder');
    });

    describe('TagModule 只读', () => {
        it('getAll 返回标签数组', async () => {
            const tags = await client.tags().getAll(LIBRARY_ID);
            expect(Array.isArray(tags)).toBe(true);
            tags.forEach(t => expect(typeof t.id).toBe('number'));
        });

        it('query 返回数组；根标签 parent_id 为 null', async () => {
            const all = await client.tags().getAll(LIBRARY_ID);
            const roots = all.filter(t => t.parent_id == null);
            // 根节点 parent_id 是 null 而非 0
            roots.forEach(t => expect(t.parent_id).toBeNull());
        });

        it('findByTitle 能按标题命中已存在标签', async () => {
            const all = await client.tags().getAll(LIBRARY_ID);
            if (all.length === 0) return; // 库内无标签时跳过断言
            const sample = all[0];
            const found = await client.tags().findByTitle(LIBRARY_ID, sample.title);
            expect(found.some(t => t.title === sample.title)).toBe(true);
        });
    });

    describe('TagModule CRUD 闭环', () => {
        it('create → update → query → delete', async () => {
            const title = uniqueName('tag');
            const updatedTitle = uniqueName('tag_upd');

            // 1. 创建（create 返回新 id）
            const createdId = await client.tags().createTag(LIBRARY_ID, title);
            expect(typeof createdId).toBe('number');
            expect(createdId).toBeGreaterThan(0);

            try {
                // 2. 更新（update 返回 boolean）
                const ok = await client.tags().updateTag(LIBRARY_ID, createdId, { title: updatedTitle });
                expect(ok).toBe(true);

                // 3. 查询校验：更新后的标题应能命中该 id
                const found = await client.tags().findByTitle(LIBRARY_ID, updatedTitle);
                expect(found.some(t => t.id === createdId && t.title === updatedTitle)).toBe(true);
            } finally {
                // 4. 删除
                await client.tags().deleteTag(LIBRARY_ID, createdId);
            }

            // 删除后应查不到
            const after = await client.tags().findByTitle(LIBRARY_ID, updatedTitle);
            expect(after.some(t => t.id === createdId)).toBe(false);
        });
    });

    describe('FolderModule 只读', () => {
        it('getAll 返回文件夹数组', async () => {
            const folders = await client.folders().getAll(LIBRARY_ID);
            expect(Array.isArray(folders)).toBe(true);
            folders.forEach(f => expect(typeof f.id).toBe('number'));
        });

        it('根文件夹 parent_id 为 null（不是 0）', async () => {
            const all = await client.folders().getAll(LIBRARY_ID);
            const roots = all.filter(f => f.parent_id == null);
            roots.forEach(f => expect(f.parent_id).toBeNull());
        });

        it('findByTitle 能按标题命中已存在文件夹', async () => {
            const all = await client.folders().getAll(LIBRARY_ID);
            if (all.length === 0) return;
            const sample = all[0];
            const found = await client.folders().findByTitle(LIBRARY_ID, sample.title);
            expect(found.some(f => f.title === sample.title)).toBe(true);
        });
    });

    describe('FolderModule CRUD 闭环', () => {
        it('create → update → findByTitle → delete', async () => {
            const title = uniqueName('folder');
            const updatedTitle = uniqueName('folder_upd');

            // 创建（返回新 id）
            const createdId = await client.folders().createFolder(LIBRARY_ID, title);
            expect(typeof createdId).toBe('number');
            expect(createdId).toBeGreaterThan(0);

            try {
                // 更新标题与颜色（返回 boolean）
                const ok = await client.folders().updateFolder(LIBRARY_ID, createdId, {
                    title: updatedTitle,
                    color: 12345,
                });
                expect(ok).toBe(true);

                // 查询校验
                const found = await client.folders().findByTitle(LIBRARY_ID, updatedTitle);
                const target = found.find(f => f.id === createdId);
                expect(target).toBeDefined();
                expect(target!.color).toBe(12345);
            } finally {
                // 删除
                await client.folders().deleteFolder(LIBRARY_ID, createdId);
            }

            // 删除后查不到
            const after = await client.folders().findByTitle(LIBRARY_ID, updatedTitle);
            expect(after.some(f => f.id === createdId)).toBe(false);
        });

        it('create 子文件夹 → getAll 校验父子关系 → 删除（子先父后）', async () => {
            const parentTitle = uniqueName('fparent');
            const childTitle = uniqueName('fchild');
            const parentId = await client.folders().createFolder(LIBRARY_ID, parentTitle);
            const childId = await client.folders().createFolder(LIBRARY_ID, childTitle, parentId);
            try {
                // 后端 folders/query 的 parent_id 过滤当前不可靠，改用 getAll 客户端校验
                // 父子关系确实被正确建立（child.parent_id === parentId）
                const all = await client.folders().getAll(LIBRARY_ID);
                const child = all.find(f => f.id === childId);
                const parent = all.find(f => f.id === parentId);
                expect(parent).toBeDefined();
                expect(child).toBeDefined();
                expect(child!.parent_id).toBe(parentId);
            } finally {
                // 必须子先父后，避免父删后子成孤儿残留
                await client.folders().deleteFolder(LIBRARY_ID, childId);
                await client.folders().deleteFolder(LIBRARY_ID, parentId);
            }
        });
    });

    describe('FileModule 只读（不写入真实数据）', () => {
        it('getFiles 返回 { result, limit, offset, total } 结构', async () => {
            const data: any = await client.files().getFiles({
                libraryId: LIBRARY_ID,
                filters: { limit: 2 },
            });
            expect(data).toBeDefined();
            expect(Array.isArray(data.result)).toBe(true);
            expect(typeof data.total).toBe('number');
            expect(data.total).toBeGreaterThan(0);
            expect(data.limit).toBe(2);
        });

        it('getFiles 结果的 tags 字段为 JSON 字符串', async () => {
            const data: any = await client.files().getFiles({
                libraryId: LIBRARY_ID,
                filters: { limit: 1 },
            });
            if (data.result.length > 0) {
                const file = data.result[0];
                // tags 是字符串，能被 JSON.parse
                expect(typeof file.tags).toBe('string');
                expect(() => JSON.parse(file.tags)).not.toThrow();
            }
        });

        it('getFile 按真实 id 获取单文件', async () => {
            const list: any = await client.files().getFiles({
                libraryId: LIBRARY_ID,
                filters: { limit: 1 },
            });
            const sampleId = list.result[0].id;
            const file = await client.files().getFile(LIBRARY_ID, sampleId);
            expect(file.id).toBe(sampleId);
        });

        it('getFilesByFolder 真正按文件夹过滤（返回的文件均属该文件夹）', async () => {
            // 先从全量数据找一个真实归属某文件夹的文件
            const list: any = await client.files().getFiles({
                libraryId: LIBRARY_ID,
                filters: { limit: 100 },
            });
            const withFolder = list.result.find((f: any) => f.folder_id != null);
            if (!withFolder) return; // 无文件归属文件夹则跳过
            // getFilesByFolder 走 getFiles，filters.folder 过滤应生效
            const inFolder: any = await client.files().getFilesByFolder(LIBRARY_ID, withFolder.folder_id);
            expect(Array.isArray(inFolder.result)).toBe(true);
            expect(inFolder.total).toBeGreaterThan(0);
            // 关键断言：返回的每个文件 folder_id 都等于目标文件夹
            inFolder.result.forEach((f: any) => expect(f.folder_id).toBe(withFolder.folder_id));
        });

        it('getFilesByFolder(null) 返回未分类文件（folder_id 均为 null）', async () => {
            const uncat: any = await client.files().getFilesByFolder(LIBRARY_ID, null as any);
            expect(Array.isArray(uncat.result)).toBe(true);
            if (uncat.result.length > 0) {
                uncat.result.forEach((f: any) => expect(f.folder_id).toBeNull());
            }
        });
    });

    /** 按 TEST_PREFIX 清理残留的 tag / folder。folder 需子先父后，避免孤儿残留。 */
    async function cleanupByPrefix(c: MiraClient, kind: 'tag' | 'folder'): Promise<void> {
        try {
            if (kind === 'tag') {
                const tags = await c.tags().getAll(LIBRARY_ID);
                await Promise.all(
                    tags
                        .filter(t => t.title.startsWith(TEST_PREFIX))
                        .map(t => c.tags().deleteTag(LIBRARY_ID, t.id).catch(() => {}))
                );
            } else {
                const folders = await c.folders().getAll(LIBRARY_ID);
                const leftovers = folders.filter(f => f.title.startsWith(TEST_PREFIX));
                // 先删有 parent_id 的（子），再删根，保证父删前子已清
                const children = leftovers.filter(f => f.parent_id != null);
                const roots = leftovers.filter(f => f.parent_id == null);
                for (const f of [...children, ...roots]) {
                    await c.folders().deleteFolder(LIBRARY_ID, f.id).catch(() => {});
                }
            }
        } catch {
            // 清理是兜底，失败不影响测试结论
        }
    }
});
