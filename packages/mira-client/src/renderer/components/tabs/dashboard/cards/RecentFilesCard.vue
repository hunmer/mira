<template>
  <div ref="rootEl" class="flex h-full w-full">
    <!-- 加载中 -->
    <div v-if="isLoading" class="flex flex-1 flex-col items-center justify-center text-muted-foreground">
      <span class="material-icons animate-pulse mb-1">hourglass_top</span>
      <span class="text-xs">{{ $t('views.sidebarHistoryModule.loading') }}</span>
    </div>

    <!-- 错误（仅最新添加模式会请求远端） -->
    <div
      v-else-if="error"
      class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-3 text-center"
      @click="load"
    >
      <span class="material-icons text-xl text-muted-foreground">cloud_off</span>
      <span class="text-xs text-muted-foreground">{{ error }}</span>
      <span class="text-xs text-primary">{{ $t('views.sidebarHistoryModule.retry') }}</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="isEmpty" class="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
      <span class="material-icons text-xl">{{ isRecentAdded ? 'new_releases' : 'history' }}</span>
      <span class="text-xs">
        {{ $t(isRecentAdded ? 'views.sidebarHistoryModule.emptyFiles' : 'views.sidebarHistoryModule.emptyHistory') }}
      </span>
    </div>

    <!-- 纵向列表（与 HomeSidebar 的历史模块同款行 UI） -->
    <div v-else-if="!horizontal" class="max-h-full w-full overflow-y-auto px-1.5 py-1.5">
      <ul class="space-y-1">
        <li
          v-for="row in displayRows"
          :key="row.id"
          class="group flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-primary/10"
          :title="row.name"
          @click="openPreview(row)"
        >
          <!-- 缩略图 / 文件类型图标（hover 弹出大图预览） -->
          <HoverCard :open-delay="300" :close-delay="150">
            <HoverCardTrigger as-child>
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
                :class="{ 'cursor-pointer hover:ring-2 hover:ring-primary/40': row.thumbnailPath || row.url }"
              >
                <img
                  v-if="row.thumbnailPath || row.url"
                  :src="row.thumbnailPath || row.url"
                  :alt="row.name"
                  class="h-full w-full object-cover"
                  @error="(e: any) => { e.target.style.display = 'none' }"
                />
                <img v-else :src="getExtIconUrl(row.name)" class="h-6 w-6 object-contain opacity-60" />
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              v-if="row.thumbnailPath || row.url"
              side="right"
              align="start"
              :side-offset="8"
              class="max-h-[320px] w-auto max-w-[320px] border-0 bg-transparent p-0 shadow-none"
            >
              <img
                :src="row.thumbnailPath || row.url"
                :alt="row.name"
                class="block h-auto max-h-[320px] w-auto max-w-[320px] rounded-lg object-contain shadow-lg ring-1 ring-black/10"
              />
            </HoverCardContent>
          </HoverCard>

          <!-- 文件名 + 时间 -->
          <div class="min-w-0 flex-1">
            <div class="truncate text-xs text-foreground">{{ row.name }}</div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span v-if="row.time">{{ formatRelative(row.time) }}</span>
              <span v-if="row.size" class="truncate">· {{ formatSize(row.size) }}</span>
            </div>
          </div>

          <!-- 非图片类型角标 -->
          <span v-if="row.mimeType && !isImageType(row.mimeType)" class="material-icons shrink-0 text-sm text-muted-foreground">
            insert_drive_file
          </span>
        </li>
      </ul>
    </div>

    <!-- 横向模式（卡片宽 > 高）：大图小字，横向滚动 -->
    <div v-else class="flex h-full w-full items-stretch gap-2 overflow-x-auto p-2">
      <div
        v-for="row in displayRows"
        :key="row.id"
        class="flex h-full w-24 shrink-0 cursor-pointer flex-col overflow-hidden rounded-md bg-muted/40 transition-shadow hover:shadow-md hover:ring-2 hover:ring-primary/40"
        :title="row.name"
        @click="openPreview(row)"
      >
        <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted">
          <img
            v-if="row.thumbnailPath || row.url"
            :src="row.thumbnailPath || row.url"
            :alt="row.name"
            class="h-full w-full object-cover"
            @error="(e: any) => { e.target.style.display = 'none' }"
          />
          <img v-else :src="getExtIconUrl(row.name)" class="h-8 w-8 object-contain opacity-60" />
          <!-- 非图片类型角标 -->
          <span
            v-if="row.mimeType && !isImageType(row.mimeType)"
            class="material-icons absolute right-1 top-1 rounded bg-black/40 p-0.5 text-xs text-white/90"
          >
            insert_drive_file
          </span>
        </div>
        <div class="shrink-0 px-1.5 py-1">
          <div class="truncate text-[11px] leading-tight">{{ row.name }}</div>
          <div class="truncate text-[10px] leading-tight text-muted-foreground">
            {{ formatRelative(row.time) }}<template v-if="row.size"> · {{ formatSize(row.size) }}</template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useViewHistoryStore } from '@renderer/stores/viewHistory'
import { useLibraryStore } from '@renderer/stores/library'
import { useRelativeTime } from '@renderer/composables/useRelativeTime'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'

/**
 * 历史列表小组件：UI 复用 HomeSidebar 的 SidebarHistoryModule。
 * - mode = 'recent_added'：最新添加（miraSDKService.listFiles 按 imported_at 倒序）
 * - mode = 'recent_viewed'：打开历史（useViewHistoryStore 按当前库过滤）
 * 布局自适应：卡片宽 > 高时切换为「大图小字」横向滚动条；否则为纵向行列表。
 */
interface Props {
  /** 数据源（由卡片注册的 defaultProps 注入） */
  mode?: 'recent_added' | 'recent_viewed'
  config?: { limit?: number[] | number }
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'recent_added',
})

const { t } = useI18n()
const { formatRelative } = useRelativeTime()
const router = useRouter()
const libraryStore = useLibraryStore()
const viewHistoryStore = useViewHistoryStore()

const isRecentAdded = computed(() => props.mode === 'recent_added')

/** 拉取/展示条数（滑条控件存 number[]，归一化为 number） */
const limit = computed(() => {
  const v = props.config?.limit
  const n = Array.isArray(v) ? v[0] : v
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 50
})

// ====== 最新添加：远程拉取 ======
const recentAdded = ref<any[]>([])
const loading = ref(false)
const error = ref('')

const isImageType = (mimeType?: string) => !!mimeType && mimeType.startsWith('image/')

async function load() {
  if (!isRecentAdded.value) return
  const libraryId = libraryStore.currentLibrary?.id
  if (!libraryId) {
    recentAdded.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await miraSDKService.listFiles(libraryId, {
      sort: 'imported_at',
      order: 'desc',
      limit: limit.value,
      recycled: 0,
    })
    recentAdded.value = result.files || []
  } catch (e: any) {
    console.error('[RecentFilesCard] 加载失败:', e)
    error.value = e?.message || t('views.common.unknownError')
    recentAdded.value = []
  } finally {
    loading.value = false
  }
}

// ====== 打开历史：浏览历史 store（按库隔离，computed 自动刷新） ======
const recentViewed = computed(() => {
  const libraryId = libraryStore.currentLibrary?.id
  if (!libraryId) return []
  return viewHistoryStore.getLibraryRecords(libraryId).slice(0, limit.value)
})

interface DisplayRow {
  id: string
  name: string
  mimeType?: string
  thumbnailPath?: string
  url?: string
  path?: string
  size?: number
  time?: string
}

const displayRows = computed<DisplayRow[]>(() => {
  if (isRecentAdded.value) {
    return recentAdded.value.map((f: any) => ({
      id: String(f.id),
      name: f.name,
      mimeType: f.mimeType,
      thumbnailPath: f.thumbnailPath,
      url: f.url,
      path: f.path,
      size: f.size,
      time: f.createdAt || f.updatedAt,
    }))
  }
  return recentViewed.value.map((r: any) => ({
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
const isLoading = computed(() => isRecentAdded.value && loading.value)

/** 点击 → 跳转预览路由（与 AlbumCard / HomeView openFilePreview 一致） */
function openPreview(row: DisplayRow) {
  router.push({
    path: '/file-preview',
    query: {
      id: row.id,
      libraryId: libraryStore.currentLibrary?.id || '',
      title: row.name,
      path: row.path || row.url || '',
      mimeType: row.mimeType || '',
    },
  })
}

function formatSize(bytes?: number): string {
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

// ====== 宽高比自适应：宽 > 高 时进入横向模式 ======
const rootEl = ref<HTMLElement | null>(null)
const horizontal = ref(false)
let ro: ResizeObserver | null = null

function measure() {
  if (!rootEl.value) return
  const { clientWidth: w, clientHeight: h } = rootEl.value
  horizontal.value = h > 0 && w > h
}

watch(() => libraryStore.currentLibrary?.id, () => load())
watch(limit, () => load())

onMounted(() => {
  load()
  if (rootEl.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(measure)
    ro.observe(rootEl.value)
  }
  measure()
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

defineExpose({ refresh: load })
</script>

<style scoped>
.material-icons {
  font-size: 16px;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
