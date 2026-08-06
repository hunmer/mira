/**
 * Mira MCP Server
 *
 * 把 mira-app-core/shared/sdk 的全部能力暴露为 MCP tools，通过 stdio 与
 * MCP 客户端（如 Claude / 其它 agent）通信。鉴权复用 CLI 的 profile 体系：
 * 工具默认使用当前 profile 的 server+token；未登录时返回清晰的错误提示。
 *
 * 启动方式：mira-app-server --mcp [--server <url>] [--token <token>] [--debug]
 *
 * 重要：MCP 协议要求 stdout 仅承载 JSON-RPC，所有日志必须走 stderr。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MiraClient } from 'mira-app-core/shared/sdk';
import { resolveConnection } from '../cli/client';
import { registerAuthTools } from './tools/auth';
import { registerSystemTools } from './tools/system';
import { registerLibraryTools } from './tools/libraries';
import { registerFileTools } from './tools/files';
import { registerTagTools } from './tools/tags';
import { registerFolderTools } from './tools/folders';
import { registerPluginTools } from './tools/plugins';
import { registerDeviceTools } from './tools/devices';
import { registerDatabaseTools } from './tools/database';

/** MCP 启动选项 */
export interface McpServerOptions {
    /** 覆盖目标服务器地址 */
    server?: string;
    /** 覆盖访问令牌 */
    token?: string;
    /** 调试日志（写到 stderr） */
    debug?: boolean;
}

/** 工具上下文：每个工具 handler 通过它拿到已鉴权的 client 与连接信息 */
export interface ToolContext {
    /** 当前使用的服务器地址 */
    server: string;
    /** 当前 token（可能为空 = 未登录） */
    token?: string;
    /**
     * 获取一个 MiraClient。requireAuth=true 且无 token 时抛出清晰错误。
     */
    getClient: (requireAuth?: boolean) => MiraClient;
    /** 调试日志 */
    debug: (msg: string) => void;
}

/** 工具注册函数签名 */
export type ToolRegistrar = (server: McpServer, ctx: ToolContext) => void;

/** 读取 package 版本（编译产物位于 dist/，package.json 在其上一级目录） */
function getVersion(): string {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require(path.resolve(__dirname, '..', 'package.json'));
        return pkg.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

import path from 'path';

/**
 * 启动 MCP 服务（stdio 传输）。进程会持续运行直到 stdin 关闭或客户端断开。
 */
export async function startMcpServer(options: McpServerOptions = {}): Promise<void> {
    const debug = options.debug || process.env.MIRA_MCP_DEBUG === '1';
    const log = (msg: string) => {
        if (debug) process.stderr.write(`[mira-mcp] ${msg}\n`);
    };

    // 解析连接：命令行覆盖 > 当前 profile > 默认
    const conn = resolveConnection({
        server: options.server,
        token: options.token,
    });

    log(`target server=${conn.server} token=${conn.token ? '(set)' : '(none)'}`);

    // getClient：每次调用都新建一个 MiraClient（轻量），按需注入 token。
    // 这样 auth_login 修改 profile 后，后续调用能拿到新 token。
    const ctx: ToolContext = {
        server: conn.server,
        token: conn.token,
        debug: log,
        getClient: (requireAuth: boolean = true): MiraClient => {
            // 每次都重新解析，以便感知 auth_login 等改动
            const c = resolveConnection({ server: options.server, token: options.token });
            if (requireAuth && !c.token) {
                throw new Error(
                    '未登录：请先调用 auth_login 工具登录，或在启动 MCP 前用 `mira-app-server login` 登录'
                );
            }
            const client = new MiraClient(c.server);
            if (c.token) client.setToken(c.token);
            return client;
        },
    };

    const mcp = new McpServer(
        { name: 'mira-app-server', version: getVersion() }
        // 不传 capabilities 选项：工具能力由 registerTool 内部自动声明
    );

    // 注册各模块工具
    const registrars: ToolRegistrar[] = [
        registerAuthTools,
        registerSystemTools,
        registerLibraryTools,
        registerFileTools,
        registerTagTools,
        registerFolderTools,
        registerPluginTools,
        registerDeviceTools,
        registerDatabaseTools,
    ];
    registrars.forEach(fn => fn(mcp, ctx));
    log(`registered tools from ${registrars.length} modules`);

    // 通过 stdio 传输连接
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    log('MCP server connected on stdio');

    // transport 关闭（客户端断开 / stdin EOF）时退出进程
    transport.onclose = () => {
        log('transport closed, exiting');
        process.exit(0);
    };
}
