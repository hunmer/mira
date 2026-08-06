/**
 * MiraClient 工厂与 server 解析
 *
 * 统一从全局选项 / 当前 profile / 默认值解析出 server 与 token，
 * 为各命令提供已配置好鉴权的 MiraClient 实例。
 */

import { program } from 'commander';
import { MiraClient } from 'mira-app-core/shared/sdk';
import {
    getCurrentProfile,
    getProfile,
    CredentialProfile,
} from './credentials';

/** 默认服务器地址 */
export const DEFAULT_SERVER = 'http://localhost:8081';

/**
 * 解析目标 server 地址：
 * 1. 全局 --server 参数
 * 2. --profile 指定的 profile 的 server
 * 3. 当前 profile 的 server
 * 4. 默认 DEFAULT_SERVER
 */
export function resolveServer(opts?: {
    server?: string;
    profile?: string;
}): string {
    if (opts?.server) return opts.server;

    if (opts?.profile) {
        const profile = getProfile(opts.profile);
        if (profile?.server) return profile.server;
    }

    const current = getCurrentProfile();
    if (current?.profile.server) return current.profile.server;

    return DEFAULT_SERVER;
}

/**
 * 解析 token：
 * 1. 全局 --token 参数
 * 2. --profile 指定的 profile 的 token
 * 3. 当前 profile 的 token
 */
export function resolveToken(opts?: {
    token?: string;
    profile?: string;
}): string | undefined {
    if (opts?.token) return opts.token;

    if (opts?.profile) {
        return getProfile(opts.profile)?.token;
    }

    return getCurrentProfile()?.profile.token;
}

/**
 * 解析后的连接信息
 */
export interface ResolvedConnection {
    server: string;
    token?: string;
    profile?: CredentialProfile;
}

/**
 * 解析出完整的连接信息（server + token + 来源 profile）
 */
export function resolveConnection(opts?: {
    server?: string;
    token?: string;
    profile?: string;
}): ResolvedConnection {
    // 确定 profile 来源
    let profile: CredentialProfile | undefined;
    if (opts?.profile) {
        profile = getProfile(opts.profile);
    } else {
        profile = getCurrentProfile()?.profile;
    }

    const server = opts?.server || profile?.server || DEFAULT_SERVER;
    const token = opts?.token || profile?.token;

    return { server, token, profile };
}

/**
 * 从全局 program opts 读取连接覆盖项
 */
function readGlobalOpts(): { server?: string; token?: string; profile?: string } {
    const opts = program.opts() || {};
    return {
        server: opts.server,
        token: opts.token,
        profile: opts.profile,
    };
}

/**
 * 创建已配置鉴权的 MiraClient（合并全局选项）
 *
 * @param requireAuth 是否要求已登录（为 true 且无 token 时直接 fatal）
 * @param overrides 命令级行为覆盖（一般留空，从全局选项读取）
 */
export function getClient(
    requireAuth: boolean = true,
    overrides?: { server?: string; token?: string; profile?: string }
): { client: MiraClient; connection: ResolvedConnection } {
    const conn = resolveConnection({ ...readGlobalOpts(), ...overrides });

    if (requireAuth && !conn.token) {
        console.error('❌ 未登录，请先运行: mira-app-server login');
        process.exit(1);
    }

    const client = new MiraClient(conn.server);
    if (conn.token) {
        client.setToken(conn.token);
    }
    return { client, connection: conn };
}

/**
 * 创建无需鉴权的 MiraClient（用于 login/register/health 等公开接口）
 */
export function getAnonymousClient(
    overrides?: { server?: string }
): { client: MiraClient; connection: ResolvedConnection } {
    const globalOpts = readGlobalOpts();
    const server = overrides?.server || globalOpts.server || DEFAULT_SERVER;
    const client = new MiraClient(server);
    return { client, connection: { server } };
}
