import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mergeWithDefaults, STORAGE_KEYS, migrateServersIfNeeded } from './storage';
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

  it('mergeWithDefaults 把损坏的 tags/null/字符串 归一化为数组', () => {
    // null / undefined / 字符串 / 对象都不应漏过去(下游 .join 会崩);
    // 用 as any 模拟存储里的脏数据(类型层面不允许,但运行时可能存在)
    expect(mergeWithDefaults({ tags: null } as any).tags).toEqual([]);
    expect(mergeWithDefaults({ tags: undefined } as any).tags).toEqual([]);
    expect(mergeWithDefaults({ tags: 'a,b' } as any).tags).toEqual([]);
    expect(mergeWithDefaults({ tags: { 0: 'x' } } as any).tags).toEqual([]);
    // 正常数组原样保留
    expect(mergeWithDefaults({ tags: ['a', 'b'] }).tags).toEqual(['a', 'b']);
  });

  it('mergeWithDefaults 把损坏的 snifferKinds 归一化为数组', () => {
    expect(mergeWithDefaults({ snifferKinds: null } as any).snifferKinds).toEqual(DEFAULT_SETTINGS.snifferKinds);
    expect(mergeWithDefaults({ snifferKinds: ['image'] }).snifferKinds).toEqual(['image']);
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

  it('默认设置含多服务器字段(servers 空 / activeServerId 空)', () => {
    expect(DEFAULT_SETTINGS.servers).toEqual([]);
    expect(DEFAULT_SETTINGS.activeServerId).toBe('');
  });

  it('mergeWithDefaults 补齐多服务器字段', () => {
    const merged = mergeWithDefaults({ serverURL: 'http://x' });
    expect(merged.servers).toEqual([]);
    expect(merged.activeServerId).toBe('');
  });

  describe('migrateServersIfNeeded', () => {
    it('servers 已有内容时不迁移', async () => {
      localStore[STORAGE_KEYS.local] = {
        servers: [{ id: 's1', name: 'A', serverURL: 'http://a', username: 'u', password: 'p' }],
        activeServerId: 's1',
      };
      const { loadSettings } = await import('./storage');
      const before = await loadSettings();
      const after = await migrateServersIfNeeded(before);
      expect(after.servers.length).toBe(1);
      expect(after.servers[0].id).toBe('s1');
    });

    it('无旧凭据时不迁移(留给用户手动新增)', async () => {
      localStore[STORAGE_KEYS.local] = { serverURL: '' };
      const { loadSettings } = await import('./storage');
      const before = await loadSettings();
      const after = await migrateServersIfNeeded(before);
      expect(after.servers).toEqual([]);
      expect(after.activeServerId).toBe('');
    });

    it('有旧顶层凭据时迁移为首条服务器并激活', async () => {
      localStore[STORAGE_KEYS.local] = {
        serverURL: 'http://localhost:8081',
        username: 'admin',
        password: 'admin123',
      };
      const { loadSettings } = await import('./storage');
      const before = await loadSettings();
      const after = await migrateServersIfNeeded(before);
      expect(after.servers.length).toBe(1);
      expect(after.servers[0].serverURL).toBe('http://localhost:8081');
      expect(after.servers[0].username).toBe('admin');
      expect(after.activeServerId).toBe(after.servers[0].id);
      // 持久化到 storage
      const stored = await loadSettings();
      expect(stored.servers.length).toBe(1);
      expect(stored.activeServerId).toBe(after.servers[0].id);
    });
  });
});
