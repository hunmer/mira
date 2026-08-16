/**
 * 素材库本地偏好
 *
 * 按素材库隔离存储（与 TabPersistence 相同的 scope：serverUrl::libraryId），
 * 目前存放「默认视图选项」：网格 / 列表 / 瀑布流 / 使用上次。
 */

import ConfigStorage from '@renderer/utils/ConfigStorage'
import { tabPersistence } from './TabPersistence'

export type LibraryDefaultViewMode = 'grid' | 'list' | 'waterfall' | 'last'
type ResolvedViewMode = 'grid' | 'list' | 'waterfall'

const STORAGE_KEY_PREFIX = 'mira-library-prefs'
const VALID_MODES: LibraryDefaultViewMode[] = ['grid', 'list', 'waterfall', 'last']

// 内存缓存（库切换时随 loadLibraryPrefs 重新加载）
const state = {
  defaultViewMode: 'grid' as LibraryDefaultViewMode
}

const getStorageKey = () => `${STORAGE_KEY_PREFIX}-${tabPersistence.getScopeId() || 'default'}`

/**
 * 从当前素材库本地配置加载偏好（切换库 / 初始化时调用）
 */
export async function loadLibraryPrefs(): Promise<void> {
  try {
    const stored = await ConfigStorage.getItem(getStorageKey())
    if (stored) {
      const parsed = JSON.parse(stored)
      if (VALID_MODES.includes(parsed?.defaultViewMode)) {
        state.defaultViewMode = parsed.defaultViewMode
        return
      }
    }
    state.defaultViewMode = 'grid'
  } catch (error) {
    console.error('Failed to load library prefs:', error)
  }
}

/**
 * 保存默认视图选项到当前素材库本地配置
 */
export async function saveLibraryDefaultViewMode(mode: LibraryDefaultViewMode): Promise<void> {
  state.defaultViewMode = mode
  await ConfigStorage.setItem(getStorageKey(), JSON.stringify({ defaultViewMode: mode }))
}

/** 当前素材库的默认视图选项（同步读缓存） */
export function getLibraryDefaultViewMode(): LibraryDefaultViewMode {
  return state.defaultViewMode
}

/**
 * 解析新建媒体 Tab 应使用的实际视图模式：
 * 前三种为固定值，「使用上次」取当前素材库上次使用的视图（无记录时回退网格）
 */
export function resolveDefaultViewMode(): ResolvedViewMode {
  const pref = state.defaultViewMode
  if (pref === 'last') {
    return tabPersistence.getLastViewMode() || 'grid'
  }
  return pref
}
