/**
 * 数据库模块命令
 *
 * 注意：服务端的数据库路由（/api/database/*）都需要 libraryId 查询参数，
 * 但 SDK 的 DatabaseModule 方法未暴露该参数。因此这里直接通过 HttpClient
 * 拼接 libraryId 查询串调用，绕过 SDK 的方法签名限制。
 */

import { Command } from 'commander';
import { getClient } from '../client';
import { fatal, formatTable, output } from '../format';

export function registerDatabase(program: Command): void {
    const db = program.command('db').description('数据库查询（针对指定素材库）');

    db.command('tables <libraryId>')
        .description('列出素材库的所有表')
        .action(async (libraryId: string) => {
            try {
                const { client } = getClient();
                const tables = await client
                    .getHttpClient()
                    .get<any[]>(`/api/database/tables?libraryId=${encodeURIComponent(libraryId)}`);
                const rows = tables.map((t: any) => ({
                    name: t.name,
                    rowCount: t.rowCount,
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    db.command('schema <libraryId> <table>')
        .description('查看表结构')
        .action(async (libraryId: string, table: string) => {
            try {
                const { client } = getClient();
                const schema = await client
                    .getHttpClient()
                    .get<any[]>(`/api/database/tables/${encodeURIComponent(table)}/schema?libraryId=${encodeURIComponent(libraryId)}`);
                const rows = schema.map((c: any) => ({
                    name: c.name,
                    type: c.type,
                    notnull: c.notnull,
                    pk: c.pk,
                    dflt_value: c.dflt_value ?? '',
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    db.command('data <libraryId> <table>')
        .description('查看表数据')
        .option('--limit <n>', '限制行数', parseInt)
        .action(async (libraryId: string, table: string, options: any) => {
            try {
                const { client } = getClient();
                const data = await client
                    .getHttpClient()
                    .get<any[]>(`/api/database/tables/${encodeURIComponent(table)}/data?libraryId=${encodeURIComponent(libraryId)}`);
                const limited = options.limit ? data.slice(0, options.limit) : data;
                output(limited);
            } catch (error) {
                fatal(error);
            }
        });

    db.command('info <libraryId>')
        .description('查看所有表的基本信息（名称+行数）')
        .action(async (libraryId: string) => {
            try {
                const { client } = getClient();
                const tables = await client
                    .getHttpClient()
                    .get<any[]>(`/api/database/tables?libraryId=${encodeURIComponent(libraryId)}`);
                const rows = tables.map((t: any) => ({ name: t.name, rowCount: t.rowCount }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });
}
