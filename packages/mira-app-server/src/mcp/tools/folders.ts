/**
 * folders 模块工具
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerFolderTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'folders_list',
        {
            description: '获取素材库的所有文件夹（可按父文件夹筛选）',
            inputSchema: {
                libraryId: z.string(),
                parentId: z.number().optional().describe('只列出某父文件夹的子项'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                if (args.parentId !== undefined) {
                    return await client.folders().getSubFolders(args.libraryId, args.parentId);
                }
                return await client.folders().getAll(args.libraryId);
            });
        }
    );

    mcp.registerTool(
        'folders_create',
        {
            description: '创建文件夹',
            inputSchema: {
                libraryId: z.string(),
                title: z.string(),
                parentId: z.number().optional(),
                color: z.number().optional(),
                description: z.string().optional(),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client
                    .folders()
                    .createFolder(args.libraryId, args.title, args.parentId, args.color, args.description);
            });
        }
    );

    mcp.registerTool(
        'folders_update',
        {
            description: '更新文件夹',
            inputSchema: {
                libraryId: z.string(),
                id: z.number(),
                title: z.string().optional(),
                parentId: z.number().optional(),
                color: z.number().optional(),
                description: z.string().optional(),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                const updates: any = {};
                if (args.title !== undefined) updates.title = args.title;
                if (args.parentId !== undefined) updates.parent_id = args.parentId;
                if (args.color !== undefined) updates.color = args.color;
                if (args.description !== undefined) updates.description = args.description;
                return await client.folders().updateFolder(args.libraryId, args.id, updates);
            });
        }
    );

    mcp.registerTool(
        'folders_delete',
        {
            description: '删除文件夹',
            inputSchema: {
                libraryId: z.string(),
                id: z.number(),
                deleteFiles: z.boolean().optional().describe('同时删除文件夹内的文件'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.folders().deleteFolder(args.libraryId, args.id, args.deleteFiles);
            });
        }
    );

    mcp.registerTool(
        'folders_move',
        {
            description: '将文件移动到指定文件夹',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.number(),
                folderId: z.union([z.number(), z.string()]).describe('文件夹 ID 或名称'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.folders().moveFileToFolder(args.libraryId, args.fileId, args.folderId);
            });
        }
    );

    mcp.registerTool(
        'folders_remove',
        {
            description: '将文件移出文件夹（移到根目录）',
            inputSchema: { libraryId: z.string(), fileId: z.number() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.folders().removeFileFromFolder(args.libraryId, args.fileId);
            });
        }
    );
}
