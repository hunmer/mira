/**
 * tags 模块工具
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerTagTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'tags_list',
        {
            description: '获取素材库的所有标签',
            inputSchema: { libraryId: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.tags().getAll(args.libraryId);
            });
        }
    );

    mcp.registerTool(
        'tags_create',
        {
            description: '创建标签',
            inputSchema: {
                libraryId: z.string(),
                title: z.string(),
                parentId: z.number().optional().describe('父标签 ID'),
                color: z.number().optional().describe('颜色（数字代码）'),
                description: z.string().optional(),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client
                    .tags()
                    .createTag(args.libraryId, args.title, args.parentId, args.color, args.description);
            });
        }
    );

    mcp.registerTool(
        'tags_update',
        {
            description: '更新标签',
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
                return await client.tags().updateTag(args.libraryId, args.id, updates);
            });
        }
    );

    mcp.registerTool(
        'tags_delete',
        {
            description: '删除标签',
            inputSchema: { libraryId: z.string(), id: z.number() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.tags().deleteTag(args.libraryId, args.id);
            });
        }
    );

    mcp.registerTool(
        'tags_file_set',
        {
            description: '为文件设置标签（tags 可为名称或 ID，服务端自动解析名称）',
            inputSchema: {
                libraryId: z.string(),
                fileId: z.number(),
                tags: z.array(z.string()).describe('标签数组（名称或 ID）'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.tags().addTagsToFile(args.libraryId, args.fileId, args.tags);
            });
        }
    );

    mcp.registerTool(
        'tags_file_get',
        {
            description: '获取文件的标签',
            inputSchema: { libraryId: z.string(), fileId: z.number() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.tags().getFileTagList(args.libraryId, args.fileId);
            });
        }
    );
}
