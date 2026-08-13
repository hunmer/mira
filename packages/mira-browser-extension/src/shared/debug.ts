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
const CATEGORIES_STORAGE_KEY = 'mira_debug_categories';

export type DebugCategory = 'drag' | 'sniffer' | 'transfer' | 'capture' | 'image' | 'app';
export type DebugCategories = Record<DebugCategory, boolean>;

export const DEFAULT_DEBUG_CATEGORIES: DebugCategories = {
  drag: true,
  sniffer: true,
  transfer: true,
  capture: true,
  image: true,
  app: true,
};

const TAG_CATEGORIES: Record<string, DebugCategory> = {
  drag: 'drag',
  dragdrop: 'drag',
  inject: 'drag',
  'import-dialog': 'drag',
  content: 'drag',
  sniffer: 'sniffer',
  upload: 'transfer',
  download: 'transfer',
  staged: 'transfer',
  capture: 'capture',
  imu: 'image',
  bg: 'app',
  router: 'app',
  conn: 'app',
  'lib-tree': 'app',
};

let debugOn = false;
let categories: DebugCategories = { ...DEFAULT_DEBUG_CATEGORIES };

function normalizeCategories(value: unknown): DebugCategories {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DEBUG_CATEGORIES };
  return Object.fromEntries(
    Object.keys(DEFAULT_DEBUG_CATEGORIES).map(key => [
      key,
      (value as Partial<DebugCategories>)[key as DebugCategory] !== false,
    ]),
  ) as DebugCategories;
}

function shouldLog(tag: string): boolean {
  if (!debugOn) return false;
  const category = debugCategoryForTag(tag);
  return categories[category];
}

export function debugCategoryForTag(tag: string): DebugCategory {
  return TAG_CATEGORIES[tag] ?? 'app';
}

export interface DebugSettings {
  enabled: boolean;
  categories: DebugCategories;
}

/** 从 chrome.storage 读取调试总开关和分类开关。 */
export async function refreshDebugSettings(): Promise<DebugSettings> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return { enabled: debugOn, categories: { ...categories } };
    }
    const r = await chrome.storage.local.get([STORAGE_KEY, CATEGORIES_STORAGE_KEY]);
    debugOn = !!r[STORAGE_KEY];
    categories = normalizeCategories(r[CATEGORIES_STORAGE_KEY]);
  } catch {
    debugOn = false;
    categories = { ...DEFAULT_DEBUG_CATEGORIES };
  }
  return { enabled: debugOn, categories: { ...categories } };
}

/** 从 chrome.storage 读取 debug 开关(失败默认关) */
export async function refreshDebugFlag(): Promise<boolean> {
  return (await refreshDebugSettings()).enabled;
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

export function setDebugCategory(category: DebugCategory, enabled: boolean) {
  categories = { ...categories, [category]: enabled };
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [CATEGORIES_STORAGE_KEY]: categories }).catch(() => {});
    }
  } catch { /* 测试环境无 chrome */ }
}

export const dbg = {
  /** 常规调试日志(仅在 debug 开 on 时输出) */
  log(tag: string, ...args: any[]) {
    if (!shouldLog(tag)) return;
    console.log(`${PREFIX}[${tag}]`, ...args);
  },
  /** 关键流程里程碑(受调试总开关和分类开关控制) */
  info(tag: string, ...args: any[]) {
    if (!shouldLog(tag)) return;
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
refreshDebugSettings();
// 监听 debug 开关变化(测试环境无 chrome 时跳过)
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[STORAGE_KEY]) debugOn = !!changes[STORAGE_KEY].newValue;
    if (changes[CATEGORIES_STORAGE_KEY]) {
      categories = normalizeCategories(changes[CATEGORIES_STORAGE_KEY].newValue);
    }
  });
}
