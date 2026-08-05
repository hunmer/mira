import { loadSettings, saveSettings, STORAGE_KEYS } from '@/shared/storage';
import type { ExtensionSettings } from '@/shared/types';

export type SettingsChangeCallback = (settings: ExtensionSettings) => void;

const listeners = new Set<SettingsChangeCallback>();

/**
 * 读取当前设置(每次从 storage,不缓存 —— service worker 会重启)
 */
export async function getSettings(): Promise<ExtensionSettings> {
  return loadSettings();
}

/**
 * 更新部分设置并通知监听器
 *
 * chrome.storage.onChanged(在 initSettingsWatcher 中绑定)是唯一的广播源,
 * 同时覆盖本上下文与其他上下文的写入,因此此处不再手动通知监听器。
 */
export async function updateSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  return saveSettings(partial);
}

/**
 * 注册设置变更监听器
 */
export function onSettingsChange(cb: SettingsChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * 初始化:绑定 chrome.storage.onChanged → 广播给监听器
 * 在 service worker 启动时调用一次
 */
let watcherBound = false;
export function initSettingsWatcher(): void {
  if (watcherBound) return;
  watcherBound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.local]) {
      const settings = changes[STORAGE_KEYS.local].newValue as ExtensionSettings;
      listeners.forEach(cb => cb(settings));
    }
  });
}
