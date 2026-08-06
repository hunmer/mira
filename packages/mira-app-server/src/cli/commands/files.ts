/**
 * 文件模块命令
 *
 * 注意：SDK 的 upload 使用 FormData/Blob。Node 18+ 已内置全局 FormData、File、Blob，
 * 因此可直接复用 SDK 的 uploadFiles，仅需用 Blob 包装读取出的 Buffer。
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getClient } from '../client';
import { fatal, formatKeyValue, formatTable, output, success } from '../format';

/**
 * 读取本地文件并构造为全局 File 对象（Node 18+ 内置）
 */
function readFileAsFile(filePath: string): File {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
        throw new Error(`文件不存在: ${abs}`);
    }
    const buffer = fs.readFileSync(abs);
    const blob = new Blob([new Uint8Array(buffer)]);
    const name = path.basename(abs);
    // File 构造签名: new File(bits, name)
    return new File([blob], name);
}

/**
 * 兼容 Node 环境的文件上传。
 *
 * 注意：SDK 的 FileModule.uploadFiles 在判断 `files instanceof FileList` 时，
 * 会因 Node 中未定义 FileList 而抛出 ReferenceError。因此这里直接构造
 * FormData 并通过 HttpClient.upload 发起上传，绕过该问题。
 */
async function uploadFilesToLibrary(
    client: any,
    libraryId: string,
    paths: string[],
    options: { tags?: string[]; folderId?: string }
): Promise<any> {
    const formData = new FormData();
    paths.forEach(p => {
        const file = readFileAsFile(p);
        formData.append('files', file, file.name);
    });
    formData.append('libraryId', libraryId);
    if (options.tags && options.tags.length) {
        formData.append('payload', JSON.stringify({ data: { tags: options.tags } }));
    }
    if (options.folderId) {
        formData.append('payload', JSON.stringify({ data: { folder_id: options.folderId } }));
    }
    return await client.getHttpClient().upload('/api/files/upload', formData);
}

export function registerFiles(program: Command): void {
    const files = program.command('files').description('文件管理');

    files
        .command('list <libraryId>')
        .description('获取文件列表')
        .option('--title <title>', '按标题模糊搜索')
        .option('--ext <extension>', '按扩展名筛选')
        .option('--tag <tag>', '按标签筛选（可多次）', collect, [])
        .option('--folder-id <id>', '按文件夹 ID 筛选')
        .option('--limit <n>', '数量限制', parseInt)
        .option('--offset <n>', '偏移量', parseInt)
        .action(async (libraryId: string, options: any) => {
            try {
                const { client } = getClient();
                const filters: any = {};
                if (options.title) filters.title = options.title;
                if (options.ext) filters.extension = options.ext;
                if (options.tag && options.tag.length) filters.tags = options.tag;
                if (options.folderId) filters.folder = parseInt(options.folderId);
                if (options.limit) filters.limit = options.limit;
                if (options.offset) filters.offset = options.offset;
                // 服务器返回 { result, limit, offset, total }
                const resp: any = await client.files().getFiles({ libraryId, filters });
                const list: any[] = Array.isArray(resp) ? resp : resp?.result || [];
                const rows = list.map(f => ({
                    id: f.id,
                    title: f.title || f.name,
                    extension: f.extension,
                    size: f.size,
                    tags: f.tags || '',
                    folder_id: f.folder_id,
                }));
                output(rows, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('get <libraryId> <fileId>')
        .description('获取单个文件信息')
        .action(async (libraryId: string, fileId: string) => {
            try {
                const { client } = getClient();
                const info = await client.files().getFile(libraryId, fileId);
                output(info, () => formatKeyValue(info as any));
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('upload <libraryId> <paths...>')
        .description('上传文件到指定素材库')
        .option('--tag <tag>', '添加标签（可多次）', collect, [])
        .option('--folder-id <id>', '目标文件夹 ID')
        .action(async (libraryId: string, paths: string[], options: any) => {
            try {
                const { client } = getClient();
                const opts: any = {};
                if (options.tag && options.tag.length) opts.tags = options.tag;
                if (options.folderId) opts.folderId = options.folderId;
                const res = await uploadFilesToLibrary(client, libraryId, paths, opts);
                success(`已上传 ${paths.length} 个文件到 ${libraryId}`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('download <libraryId> <fileId>')
        .description('下载文件到本地')
        .option('-o, --output <path>', '保存路径（默认当前目录，使用文件原名）')
        .action(async (libraryId: string, fileId: string, options: any) => {
            try {
                const { client } = getClient();
                const blob = await client.files().download(libraryId, fileId);
                const buffer = Buffer.from(await blob.arrayBuffer());
                let outPath = options.output;
                if (!outPath) {
                    try {
                        const info = await client.files().getFile(libraryId, fileId);
                        outPath = path.resolve(process.cwd(), info.title || fileId);
                    } catch {
                        outPath = path.resolve(process.cwd(), String(fileId));
                    }
                }
                fs.writeFileSync(outPath, buffer);
                success(`已下载到: ${outPath} (${buffer.length} bytes)`);
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('rename <libraryId> <fileId> <name>')
        .description('重命名文件')
        .action(async (libraryId: string, fileId: string, name: string) => {
            try {
                const { client } = getClient();
                const res = await client.files().renameFile(libraryId, fileId, name);
                success(`文件已重命名为: ${name}`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('update <libraryId> <fileId> <json>')
        .description('更新文件元数据（json 为 JSON 字符串）')
        .action(async (libraryId: string, fileId: string, json: string) => {
            try {
                let data: any;
                try {
                    data = JSON.parse(json);
                } catch {
                    throw new Error('json 参数不是合法的 JSON');
                }
                const { client } = getClient();
                const res = await client.files().updateFile(libraryId, fileId, data);
                success(`文件 ${fileId} 已更新`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('delete <libraryId> <fileId>')
        .alias('rm')
        .description('删除文件（默认进回收站）')
        .option('--permanent', '彻底删除（不进回收站）')
        .action(async (libraryId: string, fileId: string, options: any) => {
            try {
                const { client } = getClient();
                const res = await client.files().delete(libraryId, fileId, {
                    moveToRecycleBin: !options.permanent,
                });
                success(options.permanent ? `文件 ${fileId} 已彻底删除` : `文件 ${fileId} 已移入回收站`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('restore <libraryId> <fileId>')
        .description('从回收站恢复文件')
        .action(async (libraryId: string, fileId: string) => {
            try {
                const { client } = getClient();
                const res = await client.files().restoreFile(libraryId, fileId);
                success(`文件 ${fileId} 已恢复`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    files
        .command('empty-trash <libraryId>')
        .description('清空素材库回收站')
        .action(async (libraryId: string) => {
            try {
                const { client } = getClient();
                const res = await client.files().emptyTrash(libraryId);
                success(`素材库 ${libraryId} 回收站已清空`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });
}

/** commander collect 辅助：收集多次出现的选项 */
function collect(value: string, previous: string[]): string[] {
    return previous.concat([value]);
}
