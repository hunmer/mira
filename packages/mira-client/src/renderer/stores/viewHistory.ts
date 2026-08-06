import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { LibraryStorage } from '../utils/LibraryStorage'

/**
 * 浏览历史记录接口
 * 记录用户在预览路由（/file-preview）中查看过的文件，
 * 用于 HomeView 右侧详情面板「最近查看」列表。
 */
export interface ViewRecord {
  fileId: string
  libraryId: string
  name: string
  mimeType: string
  thumbnailPath?: string
  url?: string
  path?: string
  size?: number
  viewedAt: string // ISO 时间字符串，便于序列化持久化
}

// 单库历史最大保留条数
const MAX_RECORDS = 100
// 持久化前缀：LibraryStorage 会自动拼成 `${libraryId}_mira_view-history`，
// 因此记录天然按素材库隔离，无需手工按库过滤。
const STORAGE_PREFIX = 'view-history'

export const useViewHistoryStore = defineStore('viewHistory', () => {
  // 状态：按 libraryId 分组保存，避免一次加载所有库的记录
  const recordsByLibrary = ref<Record<string, ViewRecord[]>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 全部记录（合并各库），按查看时间倒序
  const allRecords = computed(() => {
    return Object.values(recordsByLibrary.value)
      .flat()
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
  })

  /**
   * 获取指定库的历史记录（按查看时间倒序）
   */
  const getLibraryRecords = (libraryId: string): ViewRecord[] => {
    return (recordsByLibrary.value[libraryId] || [])
      .slice()
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
  }

  /**
   * 计算属性工厂：返回响应式的「某库历史」
   * 列表组件可用 const recent = computed(() => store.recordsOf(libraryId))
   */
  const recordsOf = computed(() => (libraryId: string) => getLibraryRecords(libraryId))

  /**
   * 记录一次浏览（去重：同 fileId 提到队首并刷新 viewedAt，超出上限裁剪）
   * file 放宽为 any 以兼容 FilePreviewView 里 enrich 出来的 fileInfo（含 title 等扩展字段）
   */
  const addViewRecord = async (file: any, libraryId: string) => {
    if (!file?.id || !libraryId) return

    const record: ViewRecord = {
      fileId: String(file.id),
      libraryId,
      name: file.name || file.title || '未知文件',
      mimeType: file.mimeType || '',
      thumbnailPath: file.thumbnailPath,
      url: file.url,
      path: file.path,
      size: file.size,
      viewedAt: new Date().toISOString(),
    }

    const list = recordsByLibrary.value[libraryId]
      ? [...recordsByLibrary.value[libraryId]]
      : []

    // 去重：移除同 fileId 的旧记录
    const filtered = list.filter(r => r.fileId !== record.fileId)
    // 新记录置顶
    filtered.unshift(record)
    // 裁剪上限
    if (filtered.length > MAX_RECORDS) filtered.length = MAX_RECORDS

    recordsByLibrary.value = {
      ...recordsByLibrary.value,
      [libraryId]: filtered,
    }

    await persistToStorage(libraryId)
  }

  /**
   * 清空指定库的记录
   */
  const clearLibraryRecords = async (libraryId: string) => {
    if (!recordsByLibrary.value[libraryId]) return
    const next = { ...recordsByLibrary.value }
    delete next[libraryId]
    recordsByLibrary.value = next
    await LibraryStorage.removeItem(STORAGE_PREFIX, libraryId)
  }

  /**
   * 持久化指定库的记录到本地存储
   */
  const persistToStorage = async (libraryId: string) => {
    try {
      const data = {
        records: recordsByLibrary.value[libraryId] || [],
        lastUpdated: new Date().toISOString(),
      }
      await LibraryStorage.setItem(STORAGE_PREFIX, JSON.stringify(data), libraryId)
    } catch (err) {
      console.error('Failed to persist view history:', err)
      error.value = 'Failed to save view history'
    }
  }

  /**
   * 从本地存储恢复指定库的记录
   * 不传 libraryId 时恢复当前激活库（由 LibraryStorage 自动解析）
   */
  const restoreFromStorage = async (libraryId?: string) => {
    try {
      isLoading.value = true
      const stored = await LibraryStorage.getItem(STORAGE_PREFIX, libraryId)
      if (!stored) return

      const data = JSON.parse(stored)
      const records: ViewRecord[] = Array.isArray(data?.records) ? data.records : []
      if (records.length === 0) return

      // 推断这条记录归属的库：优先取记录自带的 libraryId，再退化到传入的 libraryId
      const lib = records[0]?.libraryId || libraryId
      if (!lib) return

      recordsByLibrary.value = {
        ...recordsByLibrary.value,
        [lib]: records,
      }
      error.value = null
    } catch (err) {
      console.error('Failed to restore view history:', err)
      error.value = 'Failed to load view history'
    } finally {
      isLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    recordsByLibrary,
    isLoading,
    error,

    // 计算属性
    allRecords,
    recordsOf,

    // 方法
    getLibraryRecords,
    addViewRecord,
    clearLibraryRecords,
    persistToStorage,
    restoreFromStorage,
    clearError,
  }
})
