import { DEFAULT_IMAGE_URL_RULES, DEFAULT_SETTINGS, type ExtensionSettings, type ImageUrlRule, type ServerConfig } from './types';

export const STORAGE_KEYS = {
  /** chrome.storage.local key —— 持久设置 */
  local: 'mira_settings',
  /** chrome.storage.session key —— token / password(运行期) */
  session: 'mira_session',
} as const;

/**
 * 生成服务器 id。优先用 crypto.randomUUID,不可用时回退时间戳+随机。
 */
export function newServerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface SessionData {
  token?: string;
  username?: string;
  password?: string;
}

/**
 * 用默认值合并部分设置,保证字段完整。
 *
 * 仅做浅合并:stored 里若存在某字段(哪怕是 null/错误类型),会覆盖默认值。
 * 故对已知「必须是数组」的字段做类型归一化 ——
 * 非数组或缺失时回退默认,避免下游 `tags.join(...)` 之类崩溃。
 */
export function mergeWithDefaults(partial: Partial<ExtensionSettings>): ExtensionSettings {
  const merged = { ...DEFAULT_SETTINGS, ...partial };
  // 非数组或缺失时回退默认,避免下游 .join / .map 之类崩溃
  const orDefault = <T>(v: unknown, fallback: T[]): T[] =>
    Array.isArray(v) ? v as T[] : fallback;
  const validRules = (v: unknown): ImageUrlRule[] => Array.isArray(v)
    ? v.filter(rule => {
      if (!rule || typeof rule !== 'object'
        || typeof (rule as ImageUrlRule).name !== 'string'
        || typeof (rule as ImageUrlRule).host !== 'string'
        || typeof (rule as ImageUrlRule).path !== 'string'
        || typeof (rule as ImageUrlRule).replacement !== 'string') return false;
      try {
        new RegExp((rule as ImageUrlRule).host);
        new RegExp((rule as ImageUrlRule).path);
        return true;
      } catch { return false; }
    }) as ImageUrlRule[]
    : DEFAULT_IMAGE_URL_RULES;
  merged.tags = orDefault(merged.tags, DEFAULT_SETTINGS.tags);
  merged.dragPopoverHosts = orDefault(merged.dragPopoverHosts, DEFAULT_SETTINGS.dragPopoverHosts);
  merged.snifferKinds = orDefault(merged.snifferKinds, DEFAULT_SETTINGS.snifferKinds);
  merged.snifferAspectRatios = orDefault(merged.snifferAspectRatios, DEFAULT_SETTINGS.snifferAspectRatios);
  merged.imuRules = validRules(merged.imuRules);
  merged.batchImportConcurrency = Math.min(10, Math.max(1,
    Math.floor(Number(merged.batchImportConcurrency) || DEFAULT_SETTINGS.batchImportConcurrency)
  ));
  return merged;
}

/**
 * 读取完整设置(local storage,合并默认值)
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.local);
  const stored = result[STORAGE_KEYS.local] as Partial<ExtensionSettings> | undefined;
  return mergeWithDefaults(stored ?? {});
}

/**
 * 保存部分设置(合并后整体写入,避免覆盖丢失字段)
 */
export async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const merged = mergeWithDefaults({ ...current, ...partial });
  await chrome.storage.local.set({ [STORAGE_KEYS.local]: merged });
  return merged;
}

/**
 * 读取 session 数据(token/password)
 */
export async function loadSession(): Promise<SessionData> {
  const result = await chrome.storage.session.get(STORAGE_KEYS.session);
  return (result[STORAGE_KEYS.session] as SessionData) ?? {};
}

/**
 * 保存部分 session 数据
 */
export async function saveSession(partial: Partial<SessionData>): Promise<SessionData> {
  const current = await loadSession();
  const merged = { ...current, ...partial };
  await chrome.storage.session.set({ [STORAGE_KEYS.session]: merged });
  return merged;
}

/**
 * 清除 session(登出)
 */
export async function clearSession(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEYS.session);
}

/**
 * 多服务器迁移:若 settings.servers 为空但存在旧顶层凭据(serverURL 非空),
 * 用旧凭据构造首条 ServerConfig 并设为激活;同时把顶层凭据保留为兼容字段。
 *
 * 幂等:servers 已有内容或旧 serverURL 为空时直接返回当前 settings。
 */
export async function migrateServersIfNeeded(settings: ExtensionSettings): Promise<ExtensionSettings> {
  // 已有服务器列表 → 无需迁移
  if (settings.servers.length > 0) return settings;
  // 无旧凭据 → 首次使用,留给用户在连接界面手动新增
  if (!settings.serverURL) return settings;

  const server: ServerConfig = {
    id: settings.activeServerId || newServerId(),
    name: '默认服务器',
    serverURL: settings.serverURL,
    username: settings.username,
    password: settings.password,
  };
  const merged: ExtensionSettings = {
    ...settings,
    servers: [server],
    activeServerId: server.id,
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.local]: merged });
  return merged;
}
