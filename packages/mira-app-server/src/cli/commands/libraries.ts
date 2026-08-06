/**
 * 素材库模块命令
 */

import { Command } from 'commander';
import { getClient } from '../client';
import { fatal, formatKeyValue, formatTable, output, success } from '../format';

export function registerLibraries(program: Command): void {
    const libraries = program.command('libraries').alias('lib').description('素材库管理');

    libraries
        .command('list')
        .description('获取所有素材库列表')
        .option('--status <status>', '按状态筛选 (active|inactive|error)')
        .action(async (options: any) => {
            try {
                const { client } = getClient();
                let list = await client.libraries().getAll();
                if (options.status) {
                    list = list.filter(lib => lib.status === options.status);
                }
                const rows = list.map(lib => ({
                    id: lib.id,
                    name: lib.name,
                    status: lib.status,
                    fileCount: lib.fileCount,
                    size: lib.size,
                    path: lib.path,
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    libraries
        .command('get <id>')
        .description('根据 ID 获取单个素材库')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const lib = await client.libraries().getById(id);
                output(lib, () => formatKeyValue(lib as any));
            } catch (error) {
                fatal(error);
            }
        });

    libraries
        .command('create')
        .description('创建新的素材库')
        .requiredOption('-n, --name <name>', '素材库名称')
        .requiredOption('-p, --path <path>', '素材库路径')
        .option('--desc <desc>', '描述')
        .option('--icon <icon>', '图标')
        .option('--plugins-dir <dir>', '插件目录')
        .option('--no-hash', '禁用 hash 校验')
        .action(async (options: any) => {
            try {
                const { client } = getClient();
                const data: any = {
                    name: options.name,
                    path: options.path,
                    description: options.desc || '',
                };
                if (options.icon) data.icon = options.icon;
                if (options.pluginsDir) data.pluginsDir = options.pluginsDir;
                data.customFields = { enableHash: options.hash !== false };
                const res = await client.libraries().create(data);
                success(`素材库已创建: ${options.name}`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    libraries
        .command('update <id>')
        .description('更新素材库信息')
        .option('--name <name>', '名称')
        .option('--desc <desc>', '描述')
        .option('--no-hash', '禁用 hash 校验')
        .action(async (id: string, options: any) => {
            try {
                const { client } = getClient();
                const data: any = {};
                if (options.name !== undefined) data.name = options.name;
                if (options.desc !== undefined) data.description = options.desc;
                if (options.hash !== undefined) {
                    data.customFields = { enableHash: options.hash !== false };
                }
                const res = await client.libraries().update(id, data);
                success(`素材库 ${id} 已更新`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    libraries
        .command('delete <id>')
        .alias('rm')
        .description('删除素材库')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const res = await client.libraries().delete(id);
                success(`素材库 ${id} 已删除`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    libraries
        .command('start <id>')
        .description('启动素材库服务')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const res = await client.libraries().start(id);
                success(`素材库 ${id} 已启动`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    libraries
        .command('stop <id>')
        .description('停止素材库服务')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const res = await client.libraries().stop(id);
                success(`素材库 ${id} 已停止`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    libraries
        .command('restart <id>')
        .description('重启素材库服务')
        .action(async (id: string) => {
            try {
                const { client } = getClient();
                const res = await client.libraries().restart(id);
                success(`素材库 ${id} 已重启`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });
}
