import { describe, it, expect, beforeAll } from 'vitest';
import { MiraClient } from './client/MiraClient';
import { createLoggedInClient, LIBRARY_ID, isServerReachable } from './test-helpers';

const SERVER_OK = await isServerReachable();
const describeOrSkip = SERVER_OK ? describe : describe.skip;

describeOrSkip('DatabaseModule（带 libraryId 参数）', () => {
    let client: MiraClient;

    beforeAll(async () => {
        client = await createLoggedInClient();
    });

    it('getTables 返回目标库的表列表', async () => {
        const tables = await client.database().getTables(LIBRARY_ID);
        expect(Array.isArray(tables)).toBe(true);
        expect(tables.length).toBeGreaterThan(0);
        const names = tables.map(t => t.name);
        // mira 素材库至少包含这 3 张核心表
        expect(names).toContain('files');
        expect(names).toContain('folders');
        expect(names).toContain('tags');
        tables.forEach(t => {
            expect(typeof t.name).toBe('string');
            expect(typeof t.rowCount).toBe('number');
        });
    });

    it('tableExists 对存在的表返回 true，不存在返回 false', async () => {
        expect(await client.database().tableExists(LIBRARY_ID, 'files')).toBe(true);
        expect(await client.database().tableExists(LIBRARY_ID, '__no_such_table__')).toBe(false);
    });

    it('getTableRowCount 返回真实行数', async () => {
        const count = await client.database().getTableRowCount(LIBRARY_ID, 'files');
        expect(count).toBeGreaterThan(0);
    });

    it('getTableSchema 返回列定义', async () => {
        const schema = await client.database().getTableSchema(LIBRARY_ID, 'files');
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
        const names = schema.map(c => c.name);
        expect(names).toContain('id');
    });

    it('getPrimaryKeys 能识别主键列', async () => {
        const pks = await client.database().getPrimaryKeys(LIBRARY_ID, 'files');
        expect(pks.length).toBeGreaterThan(0);
        pks.forEach(c => expect(c.pk).toBe(1));
    });

    it('getTablesInfo 仅返回 name/rowCount', async () => {
        const info = await client.database().getTablesInfo(LIBRARY_ID);
        expect(info.length).toBeGreaterThan(0);
        info.forEach(t => {
            expect(Object.keys(t).sort()).toEqual(['name', 'rowCount']);
        });
    });

    it('searchTables 按关键词过滤', async () => {
        const hits = await client.database().searchTables(LIBRARY_ID, 'file');
        expect(hits.length).toBeGreaterThan(0);
        hits.forEach(t => expect(t.name.toLowerCase()).toContain('file'));
    });

    it('getNonEmptyTables / getEmptyTables 互斥', async () => {
        const [nonEmpty, empty, all] = await Promise.all([
            client.database().getNonEmptyTables(LIBRARY_ID),
            client.database().getEmptyTables(LIBRARY_ID),
            client.database().getTables(LIBRARY_ID),
        ]);
        expect(nonEmpty.length + empty.length).toBe(all.length);
        nonEmpty.forEach(t => expect(t.rowCount).toBeGreaterThan(0));
        empty.forEach(t => expect(t.rowCount).toBe(0));
    });

    it('getTablesByRowCount desc 排序正确', async () => {
        const sorted = await client.database().getTablesByRowCount(LIBRARY_ID, 'desc');
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].rowCount).toBeGreaterThanOrEqual(sorted[i].rowCount);
        }
    });
});
