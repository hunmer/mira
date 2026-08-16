/**
 * 素材库本地偏好
 *
 * 按素材库隔离存储（与 TabPersistence 相同的 scope：serverUrl::libraryId），
 * 目前存放「默认视图选项」（网格 / 列表 / 瀑布流 / 使用上次）、默认分组、
 * 已保存的过滤器列表与默认过滤器。
 */

import { reactive } from 'vue'
import ConfigStorage from '@renderer/utils/ConfigStorage'
import { tabPersistence } from './TabPersistence'
import type { FilterRule } from '@/renderer/types/filter'

export type LibraryDefaultViewMode = 'grid' | 'list' | 'waterfall' | 'last'
type ResolvedViewMode = 'grid' | 'list' | 'waterfall'
export type MediaGroupingMode = 'none' | 'tags' | 'folders' | 'types'
export type LibraryDefaultGroupingMode = MediaGroupingMode | 'last'

/** 已保存的过滤器（FilterBar 当前条件快照） */
export interface SavedFilter {
  id: string
  name: string
  rules: FilterRule[]
  createdAt: number
}

interface LibraryPrefsData {
  defaultViewMode: LibraryDefaultViewMode
  defaultGroupingMode: LibraryDefaultGroupingMode
  lastGroupingMode: MediaGroupingMode | null
  tabGroupingModes: Record<string, MediaGroupingMode>
  /** 默认过滤器 id，空串表示不使用 */
  defaultFilterId: string
  savedFilters: SavedFilter[]
}

const STORAGE_KEY_PREFIX = 'mira-library-prefs'
const VALID_MODES: LibraryDefaultViewMode[] = ['grid', 'list', 'waterfall', 'last']
const VALID_GROUPING_MODES: LibraryDefaultGroupingMode[] = ['none', 'tags', 'folders', 'types', 'last']

// 内存缓存（响应式，供设置面板 / FilterBar 直接读取；库切换时随 loadLibraryPrefs 重新加载）
const state = reactive<LibraryPrefsData>({
  defaultViewMode: 'grid',
  defaultGroupingMode: 'none',
  lastGroupingMode: null,
  tabGroupingModes: {},
  defaultFilterId: '',
  savedFilters: []
})

const getStorageKey = () => `${STORAGE_KEY_PREFIX}-${tabPersistence.getScopeId() || 'default'}`

// 随机 id（优先 UUID），保证保存的过滤器可被精准匹配
const generateFilterId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `filter-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const persist = async () => {
  await ConfigStorage.setItem(getStorageKey(), JSON.stringify({
    defaultViewMode: state.defaultViewMode,
    defaultGroupingMode: state.defaultGroupingMode,
    lastGroupingMode: state.lastGroupingMode,
    tabGroupingModes: state.tabGroupingModes,
    defaultFilterId: state.defaultFilterId,
    savedFilters: state.savedFilters
  }))
}

const parsePrefs = (raw: string): Partial<LibraryPrefsData> | null => {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * 从当前素材库本地配置加载偏好（切换库 / 初始化时调用）
 */
export async function loadLibraryPrefs(): Promise<void> {
  try {
    const stored = await ConfigStorage.getItem(getStorageKey())
    const parsed = stored ? parsePrefs(stored) : null
    const rawMode = parsed?.defaultViewMode
    state.defaultViewMode = rawMode && VALID_MODES.includes(rawMode as LibraryDefaultViewMode)
      ? rawMode as LibraryDefaultViewMode
      : 'grid'
    const rawGrouping = parsed?.defaultGroupingMode
    state.defaultGroupingMode = rawGrouping && VALID_GROUPING_MODES.includes(rawGrouping as LibraryDefaultGroupingMode)
      ? rawGrouping as LibraryDefaultGroupingMode
      : 'none'
    state.lastGroupingMode = parsed?.lastGroupingMode && ['none', 'tags', 'folders', 'types'].includes(parsed.lastGroupingMode)
      ? parsed.lastGroupingMode as MediaGroupingMode
      : null
    state.tabGroupingModes = parsed?.tabGroupingModes && typeof parsed.tabGroupingModes === 'object'
      ? Object.fromEntries(Object.entries(parsed.tabGroupingModes).filter(([, value]) => ['none', 'tags', 'folders', 'types'].includes(value as string))) as Record<string, MediaGroupingMode>
      : {}
    state.defaultFilterId = typeof parsed?.defaultFilterId === 'string' ? parsed.defaultFilterId : ''
    state.savedFilters = Array.isArray(parsed?.savedFilters)
      ? parsed.savedFilters.filter((f: any) => f && f.id && f.name && Array.isArray(f.rules))
      : []
  } catch (error) {
    console.error('Failed to load library prefs:', error)
  }
}

/** 当前素材库偏好（响应式缓存，仅供读取/展示，修改请用下方方法） */
export function getLibraryPrefs(): LibraryPrefsData {
  return state
}

/** 同步读取已保存的过滤器列表 */
export function getSavedFilters(): SavedFilter[] {
  return state.savedFilters
}

/**
 * 保存默认视图选项到当前素材库本地配置
 */
export async function saveLibraryDefaultViewMode(mode: LibraryDefaultViewMode): Promise<void> {
  state.defaultViewMode = mode
  await persist()
}

export async function saveLibraryDefaultGroupingMode(mode: LibraryDefaultGroupingMode): Promise<void> {
  state.defaultGroupingMode = mode
  await persist()
}

export function getTabGroupingMode(tabId: string): MediaGroupingMode | null {
  return state.tabGroupingModes[tabId] || null
}

export async function saveTabGroupingMode(tabId: string, mode: MediaGroupingMode): Promise<void> {
  state.tabGroupingModes[tabId] = mode
  state.lastGroupingMode = mode
  await persist()
}

/** 设置默认过滤器（传空串清除） */
export async function setDefaultFilterId(id: string): Promise<void> {
  state.defaultFilterId = id
  await persist()
}

/** 新增过滤器（快照当前 FilterBar 规则） */
export async function addSavedFilter(name: string, rules: FilterRule[]): Promise<SavedFilter> {
  const saved: SavedFilter = {
    id: generateFilterId(),
    name,
    rules: JSON.parse(JSON.stringify(rules)),
    createdAt: Date.now()
  }
  state.savedFilters.push(saved)
  await persist()
  return saved
}

/** 更新过滤器（名称与规则均以当前 FilterBar 状态为准） */
export async function updateSavedFilter(id: string, name: string, rules: FilterRule[]): Promise<void> {
  const target = state.savedFilters.find(f => f.id === id)
  if (!target) return
  target.name = name
  target.rules = JSON.parse(JSON.stringify(rules))
  await persist()
}

/** 删除过滤器（若是默认过滤器则同时清除默认引用） */
export async function removeSavedFilter(id: string): Promise<void> {
  const index = state.savedFilters.findIndex(f => f.id === id)
  if (index === -1) return
  state.savedFilters.splice(index, 1)
  if (state.defaultFilterId === id) {
    state.defaultFilterId = ''
  }
  await persist()
}

/** 当前库的默认视图选项（同步读缓存） */
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

export function resolveDefaultGroupingMode(): MediaGroupingMode {
  if (state.defaultGroupingMode === 'last') return state.lastGroupingMode || 'none'
  return state.defaultGroupingMode
}
