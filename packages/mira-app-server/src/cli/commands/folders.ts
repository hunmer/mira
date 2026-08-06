/**
 * 文件夹模块命令
 */

import { Command } from 'commander';
import { getClient } from '../client';
import { fatal, formatKeyValue, formatTable, output, success } from '../format';

export function registerFolders(program: Command): void {
    const folders = program.command('folders').description('文件夹管理');

    folders
        .command('list <libraryId>')
        .description('获取所有文件夹')
        .option('--parent-id <id>', '按父文件夹 ID 筛选', parseInt)
        .action(async (libraryId: string, options: any) => {
            try {
                const { client } = getClient();
                let list;
                if (options.parentId !== undefined) {
                    list = await client.folders().getSubFolders(libraryId, options.parentId);
                } else {
                    list = await client.folders().getAll(libraryId);
                }
                const rows = list.map(f => ({
                    id: f.id,
                    title: f.title,
                    parent_id: f.parent_id ?? '',
                    color: f.color ?? '',
                    file_count: f.file_count ?? '',
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    folders
        .command('create <libraryId> <title>')
        .description('创建文件夹')
        .option('--parent-id <id>', '父文件夹 ID', parseInt)
        .option('--color <color>', '颜色（数字）', parseInt)
        .option('--desc <desc>', '描述')
        .action(async (libraryId: string, title: string, options: any) => {
            try {
                const { client } = getClient();
                const res = await client.folders().createFolder(
                    libraryId,
                    title,
                    options.parentId,
                    options.color,
                    options.desc
                );
                success(`文件夹已创建: ${title}`);
                output(res, () => formatKeyValue(res as any));
            } catch (error) {
                fatal(error);
            }
        });

    folders
        .command('update <libraryId> <id>')
        .description('更新文件夹')
        .option('--title <title>', '标题')
        .option('--parent-id <id>', '父文件夹 ID', parseInt)
        .option('--color <color>', '颜色（数字）', parseInt)
        .option('--desc <desc>', '描述')
        .action(async (libraryId: string, id: number, options: any) => {
            try {
                const { client } = getClient();
                const updates: any = {};
                if (options.title !== undefined) updates.title = options.title;
                if (options.parentId !== undefined) updates.parent_id = options.parentId;
                if (options.color !== undefined) updates.color = options.color;
                if (options.desc !== undefined) updates.description = options.desc;
                const res = await client.folders().updateFolder(libraryId, id, updates);
                success(`文件夹 ${id} 已更新`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    folders
        .command('delete <libraryId> <id>')
        .alias('rm')
        .description('删除文件夹')
        .option('--delete-files', '同时删除文件夹内的文件')
        .action(async (libraryId: string, id: number, options: any) => {
            try {
                const { client } = getClient();
                const res = await client.folders().deleteFolder(libraryId, id, options.deleteFiles);
                success(`文件夹 ${id} 已删除`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    folders
        .command('move <libraryId> <fileId> <folderId>')
        .description('将文件移动到指定文件夹')
        .action(async (libraryId: string, fileId: number, folderId: number) => {
            try {
                const { client } = getClient();
                const res = await client.folders().moveFileToFolder(libraryId, fileId, folderId);
                success(`文件 ${fileId} 已移动到文件夹 ${folderId}`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    folders
        .command('remove <libraryId> <fileId>')
        .description('将文件移出文件夹（移到根目录）')
        .action(async (libraryId: string, fileId: number) => {
            try {
                const { client } = getClient();
                const res = await client.folders().removeFileFromFolder(libraryId, fileId);
                success(`文件 ${fileId} 已移到根目录`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });
}
