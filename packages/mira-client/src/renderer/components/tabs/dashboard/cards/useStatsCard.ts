import { ref, computed, watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'

/**
 * 统计卡片公共逻辑：
 * - 从卡片配置解析统计范围 days（select 控件存标量 number）
 * - 跟随当前素材库切换 / days 变化自动重新拉取
 * - 统一 loading / error 状态与点击重试
 *
 * 数据来源与 mira-dashboard-next 的统计页一致：miraSDKService.statistics()
 * 对应服务端 /api/statistics/*。
 */
export function useStatsCard<T>(
  config: Ref<Record<string, any> | undefined>,
  fetcher: (libraryId: string, days: number) => Promise<T>,
) {
  const { t } = useI18n()
  const libraryStore = useLibraryStore()
  const loading = ref(true)
  const error = ref('')
  const data = ref<T | null>(null)

  /** 统计范围（天），非法配置回退 30 */
  const days = computed(() => {
    const v = config.value?.days
    return typeof v === 'number' && v > 0 ? Math.floor(v) : 30
  })

  /** 无素材库时的占位文案 */
  const noLibrary = computed(() => t('tabs.statisticsCards.noLibrary'))

  async function load() {
    const libraryId = libraryStore.currentLibrary?.id
    if (!libraryId) {
      data.value = null
      error.value = ''
      loading.value = false
      return
    }
    loading.value = true
    error.value = ''
    try {
      const res = await fetcher(libraryId, days.value)
      data.value = Array.isArray(res) ? res : ((res as any)?.data ?? res)
    } catch (e: any) {
      console.error('[StatsCard] load failed:', e)
      error.value = e?.message || t('tabs.statisticsCards.loadFailed')
      data.value = null
    } finally {
      loading.value = false
    }
  }

  watch([() => libraryStore.currentLibrary?.id, days], load)
  onMounted(load)

  const libraryId = computed(() => libraryStore.currentLibrary?.id)

  return { loading, error, data, days, noLibrary, load, libraryId }
}

/** 上传人员排行行（statistics/upload 接口） */
export interface UploaderRow {
  uploader: number | null
  uploaderName: string
  fileCount: number
  totalSize: number
}

/** 文件类型行（statistics/file-types 接口） */
export interface FileTypeRow {
  type: string
  file_count: number
  total_size: number
}

/** 按日统计行（statistics/upload/daily 接口） */
export interface DailyRow {
  date: string
  file_count: number
  total_size: number
}

/** 最近上传事件（statistics/recent-uploads 接口） */
export interface RecentUploadDay {
  date: string
  items: Array<{
    userName: string
    uploader: number | null
    target: string
    targetType: string
    targetId: number | null
    fileCount: number
  }>
}

/** 文件类型色板（与 dashboard 统计页保持一致） */
export const fileTypeColorMap: Record<string, string> = {
  image: 'hsl(220, 70%, 55%)',
  video: 'hsl(160, 60%, 45%)',
  audio: 'hsl(40, 80%, 50%)',
  pdf: 'hsl(340, 65%, 50%)',
  doc: 'hsl(260, 55%, 55%)',
  xls: 'hsl(210, 70%, 50%)',
  ppt: 'hsl(280, 60%, 55%)',
  archive: 'hsl(30, 80%, 55%)',
  text: 'hsl(150, 50%, 45%)',
  other: 'hsl(0, 0%, 60%)',
}

/** 用户名 → 稳定哈希色（与 dashboard 统计页保持一致） */
export function nameToColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = ((hash % 360) + 360) % 360
  return `hsl(${h}, 65%, 50%)`
}

/** 字节数格式化 */
export function formatSize(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

/** statistics 模块快捷引用（未连接时抛错，由 useStatsCard 捕获展示） */
export function stats() {
  return miraSDKService.statistics
}
