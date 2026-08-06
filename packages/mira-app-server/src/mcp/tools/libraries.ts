/**
 * libraries 模块工具
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerLibraryTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'libraries_list',
        {
            description: '获取所有素材库列表',
            inputSchema: {
                status: z
                    .enum(['active', 'inactive', 'error'])
                    .optional()
                    .describe('按状态筛选'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                let list = await client.libraries().getAll();
                if (args.status) list = list.filter(l => l.status === args.status);
                return list;
            });
        }
    );

    mcp.registerTool(
        'libraries_get',
        {
            description: '根据 ID 获取单个素材库详情',
            inputSchema: { id: z.string().describe('素材库 ID') },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.libraries().getById(args.id);
            });
        }
    );

    mcp.registerTool(
        'libraries_create',
        {
            description: '创建新的素材库',
            inputSchema: {
                name: z.string().describe('素材库名称'),
                path: z.string().describe('素材库在磁盘上的目录路径'),
                description: z.string().optional().describe('描述'),
                icon: z.string().optional().describe('图标标识'),
                pluginsDir: z.string().optional().describe('自定义插件目录'),
                enableHash: z.boolean().optional().describe('是否启用 hash 校验（默认 true）'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                const data: any = {
                    name: args.name,
                    path: args.path,
                    description: args.description || '',
                };
                if (args.icon) data.icon = args.icon;
                if (args.pluginsDir) data.pluginsDir = args.pluginsDir;
                data.customFields = { enableHash: args.enableHash !== false };
                return await client.libraries().create(data);
            });
        }
    );

    mcp.registerTool(
        'libraries_update',
        {
            description: '更新素材库信息',
            inputSchema: {
                id: z.string().describe('素材库 ID'),
                name: z.string().optional(),
                description: z.string().optional(),
                enableHash: z.boolean().optional(),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                const data: any = {};
                if (args.name !== undefined) data.name = args.name;
                if (args.description !== undefined) data.description = args.description;
                if (args.enableHash !== undefined) {
                    data.customFields = { enableHash: args.enableHash };
                }
                return await client.libraries().update(args.id, data);
            });
        }
    );

    mcp.registerTool(
        'libraries_delete',
        {
            description: '删除素材库',
            inputSchema: { id: z.string().describe('素材库 ID') },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.libraries().delete(args.id);
            });
        }
    );

    for (const action of ['start', 'stop', 'restart'] as const) {
        mcp.registerTool(
            `libraries_${action}`,
            {
                description: `${action === 'start' ? '启动' : action === 'stop' ? '停止' : '重启'}素材库服务`,
                inputSchema: { id: z.string().describe('素材库 ID') },
            },
            async (args) => {
                return run(async () => {
                    const client = ctx.getClient();
                    return await (client.libraries() as any)[action](args.id);
                });
            }
        );
    }
}
