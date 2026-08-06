/**
 * 统一调试日志:所有日志带 `[mira-ext]` 前缀,便于在 console 过滤。
 * 通过设置页的 debug 开关控制详尽程度;关键错误日志始终输出。
 *
 * 用法:
 *   import { dbg } from '@/shared/debug';
 *   dbg.log('capture', 'visible captured', { tabId, len });
 *   dbg.error('capture', 'failed', e);
 */

const PREFIX = '[mira-ext]';
const STORAGE_KEY = 'mira_debug';

let debugOn = false;

/** 从 chrome.storage 读取 debug 开关(失败默认关) */
export async function refreshDebugFlag(): Promise<boolean> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
    const r = await chrome.storage.local.get(STORAGE_KEY);
    debugOn = !!r[STORAGE_KEY];
  } catch {
    debugOn = false;
  }
  return debugOn;
}

/** 手动开关(设置页用) */
export function setDebug(on: boolean) {
  debugOn = on;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: on }).catch(() => {});
    }
  } catch { /* 测试环境无 chrome */ }
}

export const dbg = {
  /** 常规调试日志(仅在 debug 开 on 时输出) */
  log(tag: string, ...args: any[]) {
    if (!debugOn) return;
    console.log(`${PREFIX}[${tag}]`, ...args);
  },
  /** 关键流程里程碑(始终输出,便于定位"到底走到哪一步") */
  info(tag: string, ...args: any[]) {
    console.log(`${PREFIX}[${tag}]`, ...args);
  },
  /** 警告(始终输出) */
  warn(tag: string, ...args: any[]) {
    console.warn(`${PREFIX}[${tag}]`, ...args);
  },
  /** 错误(始终输出) */
  error(tag: string, ...args: any[]) {
    console.error(`${PREFIX}[${tag}]`, ...args);
  },
};

// 启动时读一次(storage 异步,后续 setDebug/refreshDebugFlag 更新)
refreshDebugFlag();
// 监听 debug 开关变化(测试环境无 chrome 时跳过)
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) debugOn = !!changes[STORAGE_KEY].newValue;
  });
}
