/**
 * node-last-used 行为验证:touch → 合并写 → read 闭环。
 * mock chrome.storage.local(vitest 环境无扩展 API)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {}),
      set: async (items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) store.set(k, v);
      },
    },
  },
});

import { readNodeLastUsed, touchNodeLastUsed } from './node-last-used';

describe('node-last-used(最后使用记录)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('touch 后延迟落盘,read 读回同 key', async () => {
    touchNodeLastUsed('lib1', { folderId: 12, tags: ['3', '5'] });
    // 合并窗口内未落盘
    expect(store.size).toBe(0);
    vi.advanceTimersByTime(250);
    await vi.runAllTimersAsync();

    const used = await readNodeLastUsed();
    expect(used.folder['lib1:12']).toBeTypeOf('number');
    expect(used.tag['lib1:3']).toBeTypeOf('number');
    expect(used.tag['lib1:5']).toBeTypeOf('number');
  });

  it('同批多次 touch 合并一次写,时间戳取最后一次', async () => {
    touchNodeLastUsed('lib1', { folderId: 1 });
    vi.advanceTimersByTime(100);
    touchNodeLastUsed('lib1', { folderId: 2, tags: ['9'] });
    vi.advanceTimersByTime(250);
    await vi.runAllTimersAsync();

    const used = await readNodeLastUsed();
    expect(Object.keys(used.folder).sort()).toEqual(['lib1:1', 'lib1:2']);
    expect(used.tag['lib1:9']).toBeTypeOf('number');
  });

  it('空 libraryId / 无落点不写', async () => {
    touchNodeLastUsed(undefined, { folderId: 1, tags: ['a'] });
    touchNodeLastUsed('lib1', {});
    vi.advanceTimersByTime(250);
    await vi.runAllTimersAsync();
    expect(store.size).toBe(0);
  });
});
