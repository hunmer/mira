/**
 * 标签模块命令
 */

import { Command } from 'commander';
import { getClient } from '../client';
import { fatal, formatKeyValue, formatTable, output, success } from '../format';

export function registerTags(program: Command): void {
    const tags = program.command('tags').description('标签管理');

    tags
        .command('list <libraryId>')
        .description('获取所有标签')
        .action(async (libraryId: string) => {
            try {
                const { client } = getClient();
                const list = await client.tags().getAll(libraryId);
                const rows = list.map(t => ({
                    id: t.id,
                    title: t.title,
                    parent_id: t.parent_id ?? '',
                    color: t.color ?? '',
                    file_count: t.file_count ?? '',
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    tags
        .command('create <libraryId> <title>')
        .description('创建标签')
        .option('--parent-id <id>', '父标签 ID', parseInt)
        .option('--color <color>', '颜色（数字）', parseInt)
        .option('--desc <desc>', '描述')
        .action(async (libraryId: string, title: string, options: any) => {
            try {
                const { client } = getClient();
                const res = await client.tags().createTag(
                    libraryId,
                    title,
                    options.parentId,
                    options.color,
                    options.desc
                );
                success(`标签已创建: ${title}`);
                output(res, () => formatKeyValue(res as any));
            } catch (error) {
                fatal(error);
            }
        });

    tags
        .command('update <libraryId> <id>')
        .description('更新标签')
        .option('--title <title>', '标题')
        .option('--parent-id <id>', '父标签 ID', parseInt)
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
                const res = await client.tags().updateTag(libraryId, id, updates);
                success(`标签 ${id} 已更新`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    tags
        .command('delete <libraryId> <id>')
        .alias('rm')
        .description('删除标签')
        .action(async (libraryId: string, id: number) => {
            try {
                const { client } = getClient();
                const res = await client.tags().deleteTag(libraryId, id);
                success(`标签 ${id} 已删除`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    tags
        .command('file-set <libraryId> <fileId> <tags...>')
        .description('为文件设置标签（tags 为名称或 ID）')
        .action(async (libraryId: string, fileId: number, tagList: string[]) => {
            try {
                const { client } = getClient();
                const res = await client.tags().addTagsToFile(libraryId, fileId, tagList);
                success(`文件 ${fileId} 标签已设置: ${tagList.join(', ')}`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    tags
        .command('file-get <libraryId> <fileId>')
        .description('获取文件的标签')
        .action(async (libraryId: string, fileId: number) => {
            try {
                const { client } = getClient();
                const res = await client.tags().getFileTagList(libraryId, fileId);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });
}
