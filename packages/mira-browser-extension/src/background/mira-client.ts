import { MiraClient } from 'mira-app-core/shared/sdk';
import { loadSettings, loadSession, saveSession } from '@/shared/storage';
import { STORAGE_KEYS } from '@/shared/storage';

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
 * 构建/获取 MiraClient(service worker 重启后按需重建)
 *
 * 注意:每次调用都会刷新 cachedToken —— 这样即便 service worker 已重启用旧
 * cachedToken,下一次 ensureClient 都会用最新 storage 中的 token 重建闭包读取源。
 * currentClient 仅在 serverURL 变化或首次构建时重新构造,避免冗余的二次实例化。
 */
export async function ensureClient(): Promise<MiraClient> {
  const settings = await loadSettings();
  const session = await loadSession();
  cachedToken = session.token;

  if (!currentClient || currentServerURL !== settings.serverURL) {
    currentClient = new MiraClient(settings.serverURL, {
      getToken: () => cachedToken,
    });
    currentServerURL = settings.serverURL;
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
 * token 失效时自动重登(用缓存的凭据)
 * @throws 'AUTH_EXPIRED' 若无缓存凭据
 */
export async function autoRelogin(): Promise<MiraClient> {
  const session = await loadSession();
  if (!session.username || !session.password) {
    throw new Error('AUTH_EXPIRED');
  }
  await login(session.username, session.password);
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
