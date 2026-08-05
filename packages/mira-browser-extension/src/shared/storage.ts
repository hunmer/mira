import { DEFAULT_SETTINGS, type ExtensionSettings } from './types';

export const STORAGE_KEYS = {
  /** chrome.storage.local key —— 持久设置 */
  local: 'mira_settings',
  /** chrome.storage.session key —— token / password(运行期) */
  session: 'mira_session',
} as const;

export interface SessionData {
  token?: string;
  username?: string;
  password?: string;
}

/**
 * 用默认值合并部分设置,保证字段完整
 */
export function mergeWithDefaults(partial: Partial<ExtensionSettings>): ExtensionSettings {
  return { ...DEFAULT_SETTINGS, ...partial };
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
