/**
 * auth 模块工具：登录 / whoami / profile 管理
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../server';
import { run } from '../helpers';
import {
    DEFAULT_PROFILE_NAME,
    getCurrentProfile,
    listProfiles,
    getProfile,
    saveProfile,
    setCurrent,
    removeProfile,
    clearCurrentToken,
    CredentialProfile,
} from '../../cli/credentials';
import { MiraClient } from 'mira-app-core/shared/sdk';
import { DEFAULT_SERVER } from '../../cli/client';

export function registerAuthTools(mcp: McpServer, ctx: ToolContext): void {
    // auth_login —— 登录并保存凭证到本地 profile（之后工具自动复用）
    mcp.registerTool(
        'auth_login',
        {
            description:
                '登录到 Mira 服务器，凭证保存到本地 profile（之后其它工具自动复用该 token）。' +
                '默认 server 为 http://localhost:8081，可用 server 参数覆盖。',
            inputSchema: {
                username: z.string().describe('用户名'),
                password: z.string().describe('密码'),
                server: z
                    .string()
                    .optional()
                    .describe('服务器地址，默认 http://localhost:8081'),
                profile: z
                    .string()
                    .optional()
                    .describe('保存到的 profile 名（默认 "default"）'),
            },
        },
        async (args) => {
            return run(async () => {
                const server = args.server || DEFAULT_SERVER;
                const profileName = args.profile || DEFAULT_PROFILE_NAME;
                const client = new MiraClient(server);

                // 先检查连通性
                const available = await client.system().isServerAvailable();
                if (!available) {
                    throw new Error(`无法连接到服务器 ${server}`);
                }
                const health = await client.system().getHealth();
                if (health.authRequired !== false) {
                    await client.auth().login(args.username, args.password);
                }
                const userInfo = await client.user().getInfo();

                const profile: CredentialProfile = {
                    server,
                    token: client.getConfig().token || '',
                    username: userInfo.username || args.username,
                };
                saveProfile(profileName, profile);
                // 更新运行时上下文，使后续工具立即生效
                ctx.token = profile.token;
                ctx.server = server;

                return {
                    profile: profileName,
                    server,
                    user: userInfo,
                    message: '登录成功，后续工具将自动复用此凭证',
                };
            });
        }
    );

    // auth_whoami
    mcp.registerTool(
        'auth_whoami',
        {
            description: '显示当前登录用户信息（验证 token 是否有效）',
            inputSchema: {},
        },
        async () => {
            return run(async () => {
                const client = ctx.getClient();
                const info = await client.user().getInfo();
                return { server: ctx.server, user: info };
            });
        }
    );

    // auth_list_profiles
    mcp.registerTool(
        'auth_list_profiles',
        {
            description: '列出本地保存的所有凭证 profile（* 标记当前激活项）',
            inputSchema: {},
        },
        async () => {
            return run(async () => {
                const current = getCurrentProfile()?.name;
                return listProfiles().map(name => {
                    const p = getProfile(name)!;
                    return {
                        profile: name,
                        current: name === current ? '*' : '',
                        server: p.server,
                        username: p.username || '',
                        updated: p.updatedAt || '',
                    };
                });
            });
        }
    );

    // auth_use_profile
    mcp.registerTool(
        'auth_use_profile',
        {
            description: '切换当前激活的 profile（之后工具使用该 profile 的 server+token）',
            inputSchema: {
                name: z.string().describe('要切换到的 profile 名'),
            },
        },
        async (args) => {
            return run(async () => {
                if (!setCurrent(args.name)) {
                    throw new Error(`profile "${args.name}" 不存在`);
                }
                const p = getProfile(args.name)!;
                ctx.server = p.server;
                ctx.token = p.token;
                return { switchedTo: args.name, server: p.server };
            });
        }
    );

    // auth_logout
    mcp.registerTool(
        'auth_logout',
        {
            description: '登出当前 profile（清除本地保存的 token）',
            inputSchema: {},
        },
        async () => {
            return run(async () => {
                try {
                    const client = ctx.getClient(false);
                    if (client.getConfig().token) {
                        await client.auth().logout();
                    }
                } catch {
                    // 忽略服务器端登出错误
                }
                const name = getCurrentProfile()?.name;
                if (name) clearCurrentToken();
                ctx.token = undefined;
                return { loggedOut: name || '(无 profile)' };
            });
        }
    );
}
