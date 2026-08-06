/**
 * plugins 模块工具
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerPluginTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'plugins_list',
        {
            description: '获取所有插件列表（可按素材库/分类/状态筛选）',
            inputSchema: {
                libraryId: z.string().optional(),
                category: z.string().optional(),
                status: z.enum(['active', 'inactive']).optional(),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                let list = await client.plugins().getAll();
                if (args.libraryId) list = list.filter(p => p.libraryId === args.libraryId);
                if (args.category) list = list.filter(p => p.category === args.category);
                if (args.status) list = list.filter(p => p.status === args.status);
                return list;
            });
        }
    );

    mcp.registerTool(
        'plugins_install',
        {
            description: '安装插件到指定素材库',
            inputSchema: {
                name: z.string().describe('插件名'),
                libraryId: z.string(),
                version: z.string().optional().describe('版本（默认 latest）'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return args.version
                    ? await client.plugins().installVersion(args.name, args.version, args.libraryId)
                    : await client.plugins().installLatest(args.name, args.libraryId);
            });
        }
    );

    mcp.registerTool(
        'plugins_enable',
        {
            description: '启用插件',
            inputSchema: { id: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.plugins().enable(args.id);
            });
        }
    );

    mcp.registerTool(
        'plugins_disable',
        {
            description: '禁用插件',
            inputSchema: { id: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.plugins().disable(args.id);
            });
        }
    );

    mcp.registerTool(
        'plugins_uninstall',
        {
            description: '卸载插件',
            inputSchema: { id: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.plugins().uninstall(args.id);
            });
        }
    );

    mcp.registerTool(
        'plugins_search',
        {
            description: '按关键词搜索插件（匹配名称/描述/作者/标签）',
            inputSchema: { query: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.plugins().search(args.query);
            });
        }
    );
}
