import { MiraClient } from 'mira-app-core/shared/sdk';
import { loadSettings, loadSession, saveSession } from '@/shared/storage';
import { STORAGE_KEYS } from '@/shared/storage';
import type { ServerConfig } from '@/shared/types';

/**
 * 判断错误是否为认证失效(401 / token 过期)
 */
export function isAuthError(e: any): boolean {
  if (!e) return false;
  // axios 原始错误
  if (e.response?.status === 401) return true;
  // SDK 标准化 ErrorResponse
  if (e.error === 'AUTH_ERROR' || e.error === 'UNAUTHORIZED') return true;
  const msg = (e.message || '').toLowerCase();
  return msg.includes('token') || msg.includes('unauthorized') || msg.includes('expired');
}

let currentClient: MiraClient | null = null;
let currentServerURL = '';

/**
 * 同步缓存最近一次从 storage 读取到的 token。
 *
 * ClientConfig.getToken 签名是 `() => string | undefined`(同步),
 * 而 chrome.storage.session 读取是异步的。为避免在 getToken 上做 async cast,
 * 用一个模块级变量缓存 token:ensureClient/login/autoRelogin 在异步上下文中
 * 写入它,SDK 的 getToken 闭包同步返回它。
 */
let cachedToken: string | undefined;

/**
 * 从 settings 解析当前激活服务器的 serverURL。
 * 多服务器改造后,优先按 activeServerId 在 servers 里查找;找不到(含首次迁移期)
 * 回退顶层兼容字段 serverURL,保证旧路径仍可用。
 */
export async function resolveActiveServerURL(settings: { servers: ServerConfig[]; activeServerId: string; serverURL: string }): Promise<string> {
  const active = settings.servers.find(s => s.id === settings.activeServerId);
  return active?.serverURL || settings.serverURL;
}

/**
 * 构建/获取 MiraClient(service worker 重启后按需重建)
 *
 * 多服务器改造后:serverURL 来自激活服务器(找不到则顶层兼容字段)。
 * 每次调用都会刷新 cachedToken —— 即便 service worker 已重启用旧 cachedToken,
 * 下一次 ensureClient 都会用最新 storage 中的 token 重建闭包读取源。
 * currentClient 仅在 serverURL 变化或首次构建时重新构造,避免冗余的二次实例化。
 */
export async function ensureClient(): Promise<MiraClient> {
  const settings = await loadSettings();
  const session = await loadSession();
  cachedToken = session.token;
  const serverURL = await resolveActiveServerURL(settings);

  if (!currentClient || currentServerURL !== serverURL) {
    currentClient = new MiraClient(serverURL, {
      getToken: () => cachedToken,
    });
    currentServerURL = serverURL;
  }
  return currentClient;
}

/**
 * 登录并缓存 token / 凭据到 session storage
 */
export async function login(username: string, password: string): Promise<void> {
  const client = await ensureClient();
  const res = await client.auth().login(username, password);
  cachedToken = res.accessToken;
  await saveSession({ token: res.accessToken, username, password });
}

/**
 * 临时登录到指定服务器(不依赖 settings,不污染全局 client/session)。
 *
 * 用于「测试连接」与「切换服务器后立即可用」:用一个独立的 MiraClient 实例登录,
 * 仅返回是否成功(及其错误)。激活后真正写入 token/凭据由 activateServer + login 负责。
 */
export async function loginTo(serverURL: string, username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = new MiraClient(serverURL, { getToken: () => undefined });
    await client.auth().login(username, password);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

/**
 * token 失效时自动重登(session 凭据优先,浏览器重启后回退持久设置)
 * @throws 'AUTH_EXPIRED' 若无可用凭据
 */
export async function autoRelogin(): Promise<MiraClient> {
  const session = await loadSession();
  const credentials = session.username && session.password ? session : await loadSettings();
  if (!credentials.username || !credentials.password) {
    throw new Error('AUTH_EXPIRED');
  }
  await login(credentials.username, credentials.password);
  return ensureClient();
}

/**
 * 包裹任意 SDK 操作:遇到认证错误自动重登重试一次
 */
export async function withAuth<T>(op: (client: MiraClient) => Promise<T>): Promise<T> {
  const client = await ensureClient();
  try {
    return await op(client);
  } catch (e) {
    if (isAuthError(e)) {
      await autoRelogin();
      const fresh = await ensureClient();
      return op(fresh);
    }
    throw e;
  }
}

/**
 * 激活某个服务器:写入 activeServerId + 把其凭据同步到顶层兼容字段 +
 * 清空 session/token + 重置 client,使下一次 withAuth 用新服务器重新登录。
 *
 * @returns 更新后的 settings;id 不存在时不改任何内容并返回原 settings。
 */
export async function activateServer(id: string, settings: {
  servers: ServerConfig[];
  activeServerId: string;
  serverURL: string;
  username: string;
  password: string;
}): Promise<typeof settings> {
  const server = settings.servers.find(s => s.id === id);
  if (!server) return settings;
  const merged = {
    ...settings,
    activeServerId: id,
    serverURL: server.serverURL,
    username: server.username,
    password: server.password,
  };
  // 清 session token + 重置 client,触发后续重登到新服务器
  await chrome.storage.session.remove(STORAGE_KEYS.session);
  currentClient = null;
  currentServerURL = '';
  cachedToken = undefined;
  return merged;
}

/**
 * 登出:清除 session,重置 client + token
 */
export async function logout(): Promise<void> {
  try {
    const client = await ensureClient();
    await client.auth().logout();
  } catch {
    // 忽略:token 可能已失效
  }
  await chrome.storage.session.remove(STORAGE_KEYS.session);
  currentClient = null;
  currentServerURL = '';
  cachedToken = undefined;
}
