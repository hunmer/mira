/**
 * devices 模块工具
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerDeviceTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'devices_list',
        {
            description: '获取所有设备连接信息（可按素材库筛选）',
            inputSchema: { libraryId: z.string().optional() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                if (args.libraryId) {
                    return await client.devices().getByLibrary(args.libraryId);
                }
                const byLib = (await client.devices().getAll()) as unknown as Record<string, any[]>;
                return byLib;
            });
        }
    );

    mcp.registerTool(
        'devices_stats',
        {
            description: '获取设备统计信息',
            inputSchema: {},
        },
        async () => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.devices().getStats();
            });
        }
    );

    mcp.registerTool(
        'devices_disconnect',
        {
            description: '断开指定设备的连接',
            inputSchema: {
                clientId: z.string(),
                libraryId: z.string(),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.devices().disconnect(args.clientId, args.libraryId);
            });
        }
    );

    mcp.registerTool(
        'devices_send',
        {
            description: '向指定设备发送消息',
            inputSchema: {
                clientId: z.string(),
                libraryId: z.string(),
                message: z.any().describe('消息内容（对象或字符串）'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client.devices().sendMessage(args.clientId, args.libraryId, args.message);
            });
        }
    );
}
