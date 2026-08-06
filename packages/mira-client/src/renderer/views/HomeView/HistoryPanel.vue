<script setup lang="ts">
/**
 * HistoryPanel —— HomeView 右侧详情面板「历史」tab 的内容。
 *
 * 顶部一个两段式分段控件切换两种模式：
 *   - 最近添加：miraSDKService.listFiles(libraryId, { sort: 'imported_at', order: 'desc', limit })
 *   - 最近查看：useViewHistoryStore() 中按当前素材库过滤的浏览记录
 *
 * 列表项点击 → emit('open', item)，由父组件路由跳转到 /file-preview。
 *
 * 历史记录按素材库隔离（LibraryStorage 自动按库 key 分桶），切换素材库后自动重新加载。
 */
import { ref, computed, watch, onMounted } from 'vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useViewHistoryStore } from '@renderer/stores/viewHistory'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { FileInfo } from '../../../shared/types'

type Mode = 'recent_added' | 'recent_viewed'

const props = defineProps<{ libraryId: string }>()
const emit = defineEmits<{ (e: 'open', file: FileInfo | any): void }>()

const mode = ref<Mode>('recent_added')
const viewHistoryStore = useViewHistoryStore()

// 最近添加：远程拉取
const recentAdded = ref<FileInfo[]>([])
const loadingAdded = ref(false)
const addedError = ref('')

const isImageType = (mimeType?: string) => !!mimeType && mimeType.startsWith('image/')

const fetchRecentAdded = async (libraryId: string) => {
  if (!libraryId) {
    recentAdded.value = []
    return
  }
  loadingAdded.value = true
  addedError.value = ''
  try {
    const result = await miraSDKService.listFiles(libraryId, {
      sort: 'imported_at',
      order: 'desc',
      limit: 50,
      recycled: 0,
    })
    recentAdded.value = result.files || []
  } catch (e: any) {
    console.error('[HistoryPanel] 加载最近添加失败:', e)
    addedError.value = e?.message || '加载失败'
    recentAdded.value = []
  } finally {
    loadingAdded.value = false
  }
}

// 最近查看：来自浏览历史 store（按当前库过滤）
const recentViewed = computed(() => viewHistoryStore.getLibraryRecords(props.libraryId))

// 当前模式下的展示列表（统一成带 thumbnail/name/time 的结构）
interface DisplayRow {
  id: string
  name: string
  mimeType?: string
  thumbnailPath?: string
  url?: string
  path?: string
  size?: number
  time?: string // 用于相对时间显示
}

const displayRows = computed<DisplayRow[]>(() => {
  if (mode.value === 'recent_added') {
    return recentAdded.value.map(f => ({
      id: String(f.id),
      name: f.name,
      mimeType: f.mimeType,
      thumbnailPath: f.thumbnailPath,
      url: f.url,
      path: f.path,
      size: f.size,
      time: f.createdAt || (f as any).updatedAt,
    }))
  }
  return recentViewed.value.map(r => ({
    id: r.fileId,
    name: r.name,
    mimeType: r.mimeType,
    thumbnailPath: r.thumbnailPath,
    url: r.url,
    path: r.path,
    size: r.size,
    time: r.viewedAt,
  }))
})

const isEmpty = computed(() => displayRows.value.length === 0)
const isLoading = computed(() => mode.value === 'recent_added' && loadingAdded.value)

const handleRowClick = (row: DisplayRow) => {
  emit('open', {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType || '',
    thumbnailPath: row.thumbnailPath,
    url: row.url,
    path: row.path,
    size: row.size,
    libraryId: props.libraryId,
  } as FileInfo)
}

// 相对时间格式化（中文，轻量实现，避免引入额外依赖）
const formatRelative = (iso?: string): string => {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} 天前`
  // 超过一周回退到日期
  return new Date(t).toLocaleDateString('zh-CN')
}

const formatSize = (bytes?: number): string => {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

// 切换到「最近添加」时（首次或后续）拉取
const ensureRecentAdded = () => {
  if (mode.value === 'recent_added') fetchRecentAdded(props.libraryId)
}
watch(mode, (m) => {
  if (m === 'recent_added') fetchRecentAdded(props.libraryId)
})

// 切库重新加载
watch(
  () => props.libraryId,
  (lib) => {
    if (mode.value === 'recent_added') fetchRecentAdded(lib)
    // 最近查看模式：store 已按库隔离，computed 自动刷新
  }
)

onMounted(ensureRecentAdded)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 顶部分段控件 -->
    <div class="shrink-0 mb-3">
      <div class="inline-flex w-full p-0.5 rounded-lg bg-muted/70 text-xs">
        <button
          :class="[
            'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-colors',
            mode === 'recent_added'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="mode = 'recent_added'"
        >
          <span class="material-icons text-sm">schedule</span>
          <span>最近添加</span>
        </button>
        <button
          :class="[
            'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-colors',
            mode === 'recent_viewed'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="mode = 'recent_viewed'"
        >
          <span class="material-icons text-sm">history</span>
          <span>最近查看</span>
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
      <!-- 加载中 -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center h-full text-muted-foreground">
        <span class="material-icons animate-pulse mb-1">hourglass_top</span>
        <span class="text-xs">加载中...</span>
      </div>

      <!-- 错误 -->
      <div v-else-if="addedError && mode === 'recent_added'" class="flex flex-col items-center justify-center h-full text-center px-4">
        <span class="material-icons text-muted-foreground mb-1">cloud_off</span>
        <p class="text-xs text-muted-foreground mb-2">{{ addedError }}</p>
        <button class="text-xs text-primary hover:underline" @click="fetchRecentAdded(libraryId)">重试</button>
      </div>

      <!-- 空状态 -->
      <Empty v-else-if="isEmpty" class="flex-1">
        <EmptyMedia variant="icon">
          <span class="material-icons">{{ mode === 'recent_added' ? 'inbox' : 'history' }}</span>
        </EmptyMedia>
        <EmptyTitle>{{ mode === 'recent_added' ? '暂无文件' : '暂无浏览记录' }}</EmptyTitle>
      </Empty>

      <!-- 列表内容 -->
      <ul v-else class="space-y-1">
        <li
          v-for="row in displayRows"
          :key="row.id"
          class="group flex items-center gap-2 p-1.5 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors"
          :title="row.name"
          @click="handleRowClick(row)"
        >
          <!-- 缩略图 / 文件类型图标 -->
          <div class="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            <img
              v-if="row.thumbnailPath || row.url"
              :src="row.thumbnailPath || row.url"
              :alt="row.name"
              class="w-full h-full object-cover"
              @error="(e: any) => { e.target.style.display = 'none' }"
            />
            <img
              v-else
              :src="getExtIconUrl(row.name)"
              class="w-6 h-6 object-contain opacity-60"
            />
          </div>

          <!-- 文件名 + 时间 -->
          <div class="flex-1 min-w-0">
            <div class="text-xs text-foreground truncate">{{ row.name }}</div>
            <div class="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span v-if="row.time">{{ formatRelative(row.time) }}</span>
              <span v-if="row.size" class="truncate">· {{ formatSize(row.size) }}</span>
            </div>
          </div>

          <!-- 非图片类型角标 -->
          <span
            v-if="row.mimeType && !isImageType(row.mimeType)"
            class="shrink-0 material-icons text-muted-foreground text-sm"
          >insert_drive_file</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.material-icons {
  font-size: 16px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
