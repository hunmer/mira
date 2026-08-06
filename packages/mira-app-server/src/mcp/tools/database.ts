/**
 * database 模块工具
 *
 * 服务端的数据库路由都需要 libraryId 查询参数（每个素材库独立 SQLite DB），
 * 这里通过 HttpClient 直接拼查询串调用。
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';

export function registerDatabaseTools(mcp: McpServer, ctx: ToolContext): void {
    mcp.registerTool(
        'db_tables',
        {
            description: '列出素材库的所有数据表（名称+行数）',
            inputSchema: { libraryId: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client
                    .getHttpClient()
                    .get<any[]>(`/api/database/tables?libraryId=${encodeURIComponent(args.libraryId)}`);
            });
        }
    );

    mcp.registerTool(
        'db_schema',
        {
            description: '查看指定表的列结构',
            inputSchema: {
                libraryId: z.string(),
                table: z.string().describe('表名'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client
                    .getHttpClient()
                    .get<any[]>(
                        `/api/database/tables/${encodeURIComponent(args.table)}/schema?libraryId=${encodeURIComponent(args.libraryId)}`
                    );
            });
        }
    );

    mcp.registerTool(
        'db_data',
        {
            description: '查看指定表的行数据',
            inputSchema: {
                libraryId: z.string(),
                table: z.string(),
                limit: z.number().optional().describe('限制返回行数'),
            },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                const data = await client
                    .getHttpClient()
                    .get<any[]>(
                        `/api/database/tables/${encodeURIComponent(args.table)}/data?libraryId=${encodeURIComponent(args.libraryId)}`
                    );
                return args.limit ? data.slice(0, args.limit) : data;
            });
        }
    );

    mcp.registerTool(
        'db_info',
        {
            description: '查看素材库所有表的基本信息（名称+行数）',
            inputSchema: { libraryId: z.string() },
        },
        async (args) => {
            return run(async () => {
                const client = ctx.getClient();
                return await client
                    .getHttpClient()
                    .get<any[]>(`/api/database/tables?libraryId=${encodeURIComponent(args.libraryId)}`);
            });
        }
    );
}
