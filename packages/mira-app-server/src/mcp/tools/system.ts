/**
 * system 模块工具：健康检查、系统信息（无需鉴权）
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerSystemTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'system_health',
        {
            description: '获取服务器健康状态（status、uptime、version、authRequired 等）。无需登录。',
            inputSchema: {},
        },
        async () => {
            return run(async () => {
                const client = ctx.getClient(false);
                return await client.system().getHealth();
            });
        }
    );

    mcp.registerTool(
        'system_info',
        {
            description: '获取服务器版本与运行环境信息（uptime、version、nodeVersion、environment）',
            inputSchema: {},
        },
        async () => {
            return run(async () => {
                const client = ctx.getClient(false);
                return await client.system().getSystemInfo();
            });
        }
    );
}
