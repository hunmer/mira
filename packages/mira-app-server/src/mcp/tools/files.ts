/**
 * files 模块工具
 *
 * upload/download 直接走 HttpClient，绕过 Node 下 FileList 未定义的问题（与 CLI 一致）。
 */

import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerFileTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'files_list',
        {
            description: '获取素材库的文件列表（支持过滤）',
            inputSchema: {
                libraryId: z.string().describe('素材库 ID'),
                title: z.string().optional().describe('按标题模糊搜索'),
                extension: z.string().optional().describe('按扩展名筛选'),
                tags: z.array(z.string()).optional().describe('按标签筛选'),
                folder: z.number().optional().describe('按文件夹 ID 筛选'),
                limit: z.number().optional().describe('数量限制'),
                offset: z.number().optional().describe('偏移量'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                const filters: any = {};
                if (args.title) filters.title = args.title;
                if (args.extension) filters.extension = args.extension;
                if (args.tags?.length) filters.tags = args.tags;
                if (args.folder !== undefined) filters.folder = args.folder;
                if (args.limit !== undefined) filters.limit = args.limit;
                if (args.offset !== undefined) filters.offset = args.offset;
                const resp: any = await client.files().getFiles({ libraryId: args.libraryId, filters });
                return Array.isArray(resp) ? resp : resp?.result || [];
            });
        }
    );

    mcp.registerTool(
        'files_get',
        {
            description: '获取单个文件的详细信息',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.union([z.string(), z.number()]).describe('文件 ID'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.files().getFile(args.libraryId, String(args.fileId));
            });
        }
    );

    mcp.registerTool(
        'files_upload',
        {
            description:
                '上传一个或多个本地文件到指定素材库。paths 为本地文件路径数组。',
            inputSchema: {
                libraryId: z.string(),
                paths: z.array(z.string()).describe('本地文件绝对路径数组'),
                tags: z.array(z.string()).optional().describe('为每个文件附加的标签'),
                folderId: z.string().optional().describe('目标文件夹 ID'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                const formData = new FormData();
                for (const p of args.paths) {
                    const abs = path.resolve(p);
                    if (!fs.existsSync(abs)) throw new Error(`文件不存在: ${abs}`);
                    const buf = fs.readFileSync(abs);
                    const blob = new Blob([new Uint8Array(buf)]);
                    const name = path.basename(abs);
                    const file = new File([blob], name);
                    formData.append('files', file, name);
                }
                formData.append('libraryId', args.libraryId);
                if (args.tags?.length || args.folderId) {
                    formData.append(
                        'payload',
                        JSON.stringify({ data: { tags: args.tags, folder_id: args.folderId } })
                    );
                }
                return await client.getHttpClient().upload('/api/files/upload', formData);
            });
        }
    );

    mcp.registerTool(
        'files_download',
        {
            description: '下载文件到本地。output 省略时使用文件原名保存到当前工作目录。',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.union([z.string(), z.number()]),
                output: z.string().optional().describe('保存路径'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                const blob = await client.files().download(args.libraryId, String(args.fileId));
                const buffer = Buffer.from(await blob.arrayBuffer());
                let outPath = args.output;
                if (!outPath) {
                    try {
                        const info = await client.files().getFile(args.libraryId, String(args.fileId));
                        outPath = path.resolve(process.cwd(), info.title || String(args.fileId));
                    } catch {
                        outPath = path.resolve(process.cwd(), String(args.fileId));
                    }
                }
                fs.writeFileSync(outPath, buffer);
                return { savedTo: outPath, bytes: buffer.length };
            });
        }
    );

    mcp.registerTool(
        'files_rename',
        {
            description: '重命名文件（同文件夹下重名会返回 409）',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.union([z.string(), z.number()]),
                name: z.string().describe('新文件名'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.files().renameFile(args.libraryId, String(args.fileId), args.name);
            });
        }
    );

    mcp.registerTool(
        'files_update',
        {
            description: '更新文件元数据（任意键值，如 website 等）',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.union([z.string(), z.number()]),
                data: z.record(z.any()).describe('要更新的元数据对象'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.files().updateFile(args.libraryId, String(args.fileId), args.data);
            });
        }
    );

    mcp.registerTool(
        'files_delete',
        {
            description: '删除文件（默认移入回收站，permanent=true 彻底删除）',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.union([z.string(), z.number()]),
                permanent: z.boolean().optional().describe('彻底删除而不进回收站'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.files().delete(args.libraryId, String(args.fileId), {
                    moveToRecycleBin: !args.permanent,
                });
            });
        }
    );

    mcp.registerTool(
        'files_restore',
        {
            description: '从回收站恢复文件',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.union([z.string(), z.number()]),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.files().restoreFile(args.libraryId, String(args.fileId));
            });
        }
    );

    mcp.registerTool(
        'files_empty_trash',
        {
            description: '清空素材库回收站',
            inputSchema: { libraryId: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.files().emptyTrash(args.libraryId);
            });
        }
    );
}
