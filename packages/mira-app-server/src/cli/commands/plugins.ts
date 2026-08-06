/**
 * 插件模块命令
 */

import { Command } from 'commander';
import { getClient } from '../client';
import { fatal, formatKeyValue, formatTable, output, success } from '../format';

export function registerPlugins(program: Command): void {
    const plugins = program.command('plugins').description('插件管理');

    plugins
        .command('list')
        .description('获取所有插件列表')
        .option('--library <id>', '按素材库 ID 筛选')
        .option('--category <cat>', '按分类筛选')
        .option('--status <status>', '按状态筛选 (active|inactive)')
        .action(async (options: any) => {
            try {
                const { client } = getClient();
                let list = await client.plugins().getAll();
                if (options.library) {
                    list = list.filter(p => p.libraryId === options.library);
                }
                if (options.category) {
                    list = list.filter(p => p.category === options.category);
                }
                if (options.status) {
                    list = list.filter(p => p.status === options.status);
                }
                const rows = list.map(p => ({
                    id: p.id,
                    name: p.name,
                    version: p.version,
                    status: p.status,
                    libraryId: p.libraryId,
                    category: p.category,
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    plugins
        .command('install <name> <libraryId>')
        .description('安装插件')
        .option('--version <version>', '指定版本（默认 latest）')
        .action(async (name: string, libraryId: string, options: any) => {
            try {
                const { client } = getClient();
                const res = options.version
                    ? await client.plugins().installVersion(name, options.version, libraryId)
                    : await client.plugins().installLatest(name, libraryId);
                success(`插件 ${name} 已安装到 ${libraryId}`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    plugins
        .command('enable <id>')
        .description('启用插件')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const res = await client.plugins().enable(id);
                success(`插件 ${id} 已启用`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    plugins
        .command('disable <id>')
        .description('禁用插件')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const res = await client.plugins().disable(id);
                success(`插件 ${id} 已禁用`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    plugins
        .command('uninstall <id>')
        .alias('rm')
        .description('卸载插件')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const res = await client.plugins().uninstall(id);
                success(`插件 ${id} 已卸载`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    plugins
        .command('search <query>')
        .description('搜索插件')
        .action(async (query: string) => {
            try {
                const { client } = getClient();
                const list = await client.plugins().search(query);
                const rows = list.map(p => ({
                    id: p.id,
                    name: p.name,
                    version: p.version,
                    author: p.author,
                    description: p.description,
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });
}
