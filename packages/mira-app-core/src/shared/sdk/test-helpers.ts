/**
 * SDK 集成测试公共辅助
 *
 * 通过环境变量配置目标服务器与凭据，默认连接本机运行中的 mira-app-server。
 *   - MIRA_BASE_URL  服务器地址（默认 http://localhost:8081）
 *   - MIRA_USERNAME  登录用户名（默认 admin）
 *   - MIRA_PASSWORD  登录密码  （默认 admin123）
 *   - MIRA_LIBRARY_ID 测试用素材库ID（默认 1779810479725）
 *
 * 若服务器不可用，所有依赖它的测试会整体 skip，而不是挂在第一个请求上。
 */
import { MiraClient } from './client/MiraClient';

export const BASE_URL = process.env.MIRA_BASE_URL || 'http://localhost:8081';
export const USERNAME = process.env.MIRA_USERNAME || 'admin';
export const PASSWORD = process.env.MIRA_PASSWORD || 'admin123';
export const LIBRARY_ID = process.env.MIRA_LIBRARY_ID || '1779810479725';

/** 测试用的唯一前缀，便于按前缀查询并清理产生的临时数据。 */
export const TEST_PREFIX = '__sdk_test__';

/**
 * 创建一个已登录的 MiraClient。
 * 失败会抛出，由调用方 beforeAll 捕获后决定是否 skip。
 */
export async function createLoggedInClient(): Promise<MiraClient> {
    const client = new MiraClient(BASE_URL);
    await client.login(USERNAME, PASSWORD);
    return client;
}

/** 生成带时间戳+随机数的唯一临时名，确保并发/重跑不冲突。 */
export function uniqueName(base: string = 'item'): string {
    return `${TEST_PREFIX}${base}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 在 beforeAll 中调用：检测服务器是否可用。
 * 不可用时返回 false，调用方据此用 -1 个 skip 标记跳过整个 suite。
 */
export async function isServerReachable(): Promise<boolean> {
    const client = new MiraClient(BASE_URL);
    return client.isConnected();
}
