import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mergeWithDefaults, STORAGE_KEYS } from './storage';
import { DEFAULT_SETTINGS } from './types';

// mock chrome.storage(在测试里用一个内存实现)
const localStore: Record<string, any> = {};
const sessionStore: Record<string, any> = {};

// chrome.storage.local.get 的真实签名接受 string | string[] | null;
// 实现里传入单个 string key,这里 mock 同时兼容 string 和 string[] 两种形式。
const toArray = (keys: string | string[]): string[] => (Array.isArray(keys) ? keys : [keys]);

globalThis.chrome = {
  storage: {
    local: {
      get: async (keys: string | string[]) =>
        Object.fromEntries(toArray(keys).filter(k => k in localStore).map(k => [k, localStore[k]])),
      set: async (items: Record<string, any>) => { Object.assign(localStore, items); },
    },
    session: {
      get: async (keys: string | string[]) =>
        Object.fromEntries(toArray(keys).filter(k => k in sessionStore).map(k => [k, sessionStore[k]])),
      set: async (items: Record<string, any>) => { Object.assign(sessionStore, items); },
    },
  },
} as any;

describe('storage', () => {
  beforeEach(() => {
    Object.keys(localStore).forEach(k => delete localStore[k]);
    Object.keys(sessionStore).forEach(k => delete sessionStore[k]);
  });

  it('STORAGE_KEYS 区分 local 和 session', () => {
    expect(STORAGE_KEYS.local).toBe('mira_settings');
    expect(STORAGE_KEYS.session).toBe('mira_session');
  });

  it('mergeWithDefaults 用默认值填充缺失字段', () => {
    const merged = mergeWithDefaults({ serverURL: 'http://x', username: 'u' });
    expect(merged.serverURL).toBe('http://x');
    expect(merged.uiMode).toBe(DEFAULT_SETTINGS.uiMode);
    expect(merged.snifferEnabled).toBe(false);
  });

  it('loadSettings 返回合并默认值的完整设置', async () => {
    localStore[STORAGE_KEYS.local] = { serverURL: 'http://y' };
    const { loadSettings } = await import('./storage');
    const settings = await loadSettings();
    expect(settings.serverURL).toBe('http://y');
    expect(settings.dropZoneEnabled).toBe(true);
  });

  it('saveSettings 写入 local storage', async () => {
    const { saveSettings, loadSettings } = await import('./storage');
    await saveSettings({ serverURL: 'http://z' });
    expect(localStore[STORAGE_KEYS.local].serverURL).toBe('http://z');
  });

  it('saveSession 写入 session storage', async () => {
    const { saveSession, loadSession } = await import('./storage');
    await saveSession({ token: 'tok123' });
    const sess = await loadSession();
    expect(sess.token).toBe('tok123');
  });
});
