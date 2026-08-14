<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { SearchIcon, XIcon } from '@lucide/vue'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { createFloatingWindowBridge, type FloatingWindowBridge } from '../floating-window/bridge'

/** 主渲染进程回传的搜索结果条目 */
interface SearchResultItem {
  type?: string
  title?: string
  path?: string
  thumbnail?: string
  size?: string
  itemCount?: number | string
  count?: number | string
  modifiedTime?: string
  localFile?: string
}

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE = 300

const searchKeyword = ref('')
const allResults = ref<SearchResultItem[]>([])
const isSearching = ref(false)
const activeTab = ref('files')
const currentPage = ref(1)

const availableTabs = [
  { id: 'files', title: '文件', icon: 'insert_drive_file' },
  { id: 'tags', title: '标签', icon: 'label' },
  { id: 'folders', title: '文件夹', icon: 'folder' },
]

let bridge: FloatingWindowBridge | null = null
let searchTimeout: number | null = null

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return allResults.value.slice(start, start + PAGE_SIZE)
})

const totalPages = computed(() => Math.ceil(allResults.value.length / PAGE_SIZE))

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE + 1
  const end = Math.min(start + PAGE_SIZE - 1, allResults.value.length)
  return `${start}-${end} / ${allResults.value.length}`
})

/** 未输入且无结果时显示初始引导 */
const showInitialState = computed(
  () => !searchKeyword.value.trim() && allResults.value.length === 0 && !isSearching.value
)

// ============ 通信 ============

function handleBridgeMessage(data: any): void {
  if (data?.type === 'search-results') {
    isSearching.value = false
    allResults.value = data.results || []
    currentPage.value = 1
  } else if (data?.type === 'search-error') {
    isSearching.value = false
    console.error('[SearchWindow] 搜索错误:', data.error)
  }
}

// ============ 搜索 ============

function sendSearchRequest(): void {
  isSearching.value = true
  // 不清空现有结果，等获取到新结果再更新
  bridge?.send({
    type: 'search-request',
    keyword: searchKeyword.value,
    searchType: activeTab.value,
    timestamp: Date.now(),
  })
}

/** CommandInput 输入回调（300ms 防抖） */
function onSearchInput(value: string): void {
  searchKeyword.value = typeof value === 'string' ? value : ''
  if (searchTimeout !== null) {
    window.clearTimeout(searchTimeout)
    searchTimeout = null
  }
  if (searchKeyword.value.trim()) {
    searchTimeout = window.setTimeout(() => {
      currentPage.value = 1
      sendSearchRequest()
    }, SEARCH_DEBOUNCE)
  } else {
    allResults.value = []
    isSearching.value = false
    currentPage.value = 1
  }
}

function onTabChange(tabId: string | number): void {
  activeTab.value = String(tabId)
  currentPage.value = 1
  if (searchKeyword.value.trim()) {
    onSearchInput(searchKeyword.value)
  } else {
    allResults.value = []
  }
}

function handleItemClick(item: SearchResultItem): void {
  bridge?.send({
    type: 'open-item',
    item: JSON.parse(JSON.stringify(item)), // 深拷贝防止结构化克隆错误
    timestamp: Date.now(),
  })
  hideSearchWindow()
}

/** 结果项拖拽：阻止默认行为，转发主渲染进程启动原生拖拽 */
function handleItemDragStart(event: DragEvent, item: SearchResultItem): void {
  const localFile = item.localFile
  if (!localFile) {
    event.preventDefault()
    return
  }
  event.preventDefault()
  bridge?.send({
    type: 'drag-file',
    filePath: localFile,
    fileName: item.title,
    timestamp: Date.now(),
  })
}

/** 有搜索内容时清除；否则关闭窗口 */
function handleClearOrClose(): void {
  if (searchKeyword.value.trim()) {
    searchKeyword.value = ''
    allResults.value = []
    isSearching.value = false
    currentPage.value = 1
  } else {
    hideSearchWindow()
  }
}

function hideSearchWindow(): void {
  bridge?.requestClose()
}

function goToPage(page: number): void {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// ============ 键盘 ============

function handleGlobalKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClearOrClose()
  } else if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
    event.preventDefault()
    hideSearchWindow()
  } else if (event.key === 'F12') {
    event.preventDefault()
    bridge?.toggleDevtools()
  }
}

// ============ 展示辅助 ============

function getResultIcon(type?: string): string {
  switch (type) {
    case 'file':
      return 'insert_drive_file'
    case 'folder':
      return 'folder'
    case 'tag':
      return 'label'
    default:
      return 'description'
  }
}

function formatResultSubtitle(item: SearchResultItem): string {
  if (item.path) return item.path
  if (item.type === 'tag') return `标签 - ${item.count || 0} 个文件`
  return item.modifiedTime || '未知时间'
}

function handleThumbnailError(event: Event): void {
  ;(event.target as HTMLElement).style.display = 'none'
}

function preventDefault(e: Event): void {
  e.preventDefault()
}

// ============ 生命周期 ============

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeyDown)
  document.addEventListener('contextmenu', preventDefault)
  document.addEventListener('dragover', preventDefault)
  document.addEventListener('drop', preventDefault)

  bridge = createFloatingWindowBridge({
    role: 'search',
    onMessage: handleBridgeMessage,
    onReady: () => {
      bridge?.send({ type: 'search-window-ready', timestamp: Date.now() })
    },
  })
  bridge.start()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown)
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('dragover', preventDefault)
  document.removeEventListener('drop', preventDefault)
  if (searchTimeout !== null) {
    window.clearTimeout(searchTimeout)
    searchTimeout = null
  }
})
</script>

<template>
  <div class="bg-background text-foreground flex h-screen w-screen flex-col overflow-hidden">
    <!-- iOS 风格拖拽条：原生 app-region + 请求主进程临时开启窗口拖拽 -->
    <div
      class="drag-handle flex h-5 shrink-0 cursor-move items-center justify-center border-b border-border/60 bg-black/[0.03] transition-colors hover:bg-black/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
      title="拖拽移动窗口"
      @mousedown="bridge?.requestDrag()"
      @touchstart="bridge?.requestDrag()"
    >
      <div class="h-[3px] w-9 rounded-full bg-black/20 dark:bg-white/30"></div>
    </div>

    <Command :should-filter="false" class="min-h-0 flex-1">
      <CommandInput
        placeholder="搜索 (支持拼音、模糊关键字)"
        @update:model-value="onSearchInput"
      />

      <!-- 搜索类型 Tabs + 清除/关闭 -->
      <div class="flex items-center justify-between gap-2 border-b px-3 py-2">
        <Tabs :model-value="activeTab" @update:model-value="onTabChange">
          <TabsList>
            <TabsTrigger v-for="tab in availableTabs" :key="tab.id" :value="tab.id">
              <span class="material-icons mr-1 text-base">{{ tab.icon }}</span>
              {{ tab.title }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="icon"
          class="size-7"
          :title="searchKeyword.trim() ? '清除搜索' : '关闭'"
          @click="handleClearOrClose"
        >
          <XIcon class="size-4" />
        </Button>
      </div>

      <CommandList class="min-h-0 max-h-none flex-1">
        <!-- 骨架占位（首次搜索等待结果） -->
        <div v-if="isSearching && allResults.length === 0" class="flex flex-col gap-1 p-2">
          <div
            v-for="n in 6"
            :key="'skeleton-' + n"
            class="flex items-center gap-3 rounded-sm px-2 py-1.5"
          >
            <Skeleton class="size-8 shrink-0 rounded" />
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton class="h-3.5 w-3/5" />
              <Skeleton class="h-3 w-2/5" />
            </div>
            <Skeleton class="h-5 w-12 shrink-0 rounded-full" />
          </div>
        </div>

        <CommandEmpty v-if="!isSearching">
          未找到"{{ searchKeyword }}"的结果，试试其他关键词或切换搜索类型
        </CommandEmpty>

        <CommandItem
          v-for="(item, index) in paginatedResults"
          :key="(item.localFile || item.path || item.title || '') + '-' + index"
          :value="String(index)"
          :draggable="!!item.localFile"
          class="gap-3 py-2"
          @select="handleItemClick(item)"
          @dragstart="handleItemDragStart($event, item)"
        >
          <img
            v-if="item.thumbnail && item.type === 'file'"
            :src="item.thumbnail"
            :alt="item.title"
            class="mr-1 size-8 shrink-0 rounded bg-accent object-cover"
            @error="handleThumbnailError"
          />
          <span v-else class="material-icons mr-1 shrink-0 text-xl text-muted-foreground">
            {{ getResultIcon(item.type) }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ item.title }}</div>
            <div class="text-muted-foreground truncate text-xs">{{ formatResultSubtitle(item) }}</div>
          </div>
          <Badge v-if="item.size" variant="secondary">{{ item.size }}</Badge>
          <Badge v-else-if="item.itemCount" variant="secondary">{{ item.itemCount }} 项</Badge>
          <Badge v-else-if="item.count" variant="secondary">{{ item.count }} 个文件</Badge>
        </CommandItem>

        <!-- 初始引导（未输入） -->
        <Empty v-if="showInitialState" class="gap-4">
          <EmptyMedia variant="icon">
            <SearchIcon class="size-6" />
          </EmptyMedia>
          <EmptyTitle>开始搜索</EmptyTitle>
          <EmptyDescription>输入关键词搜索文件、标签与文件夹</EmptyDescription>
        </Empty>
      </CommandList>

      <!-- 快捷键提示 + 分页 -->
      <div class="text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">移动 <kbd class="bg-muted rounded px-1.5 py-0.5">↑</kbd><kbd class="bg-muted rounded px-1.5 py-0.5">↓</kbd></span>
          <span class="flex items-center gap-1">选中 <kbd class="bg-muted rounded px-1.5 py-0.5">↵</kbd></span>
          <span class="flex items-center gap-1">关闭/清除 <kbd class="bg-muted rounded px-1.5 py-0.5">ESC</kbd></span>
        </div>
        <div v-if="allResults.length > PAGE_SIZE" class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            class="size-6 text-xs"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >‹</Button>
          <span class="px-1">{{ paginationInfo }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="size-6 text-xs"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >›</Button>
        </div>
      </div>
    </Command>
  </div>
</template>

<style>
/* Material Icons 本地字体（经 Vite 资源管线打包） */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url('../../assets/fonts/material-icons.ttf') format('truetype');
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}

/* 窗口拖拽条：原生拖拽区域，其余内容不受影响 */
.drag-handle {
  -webkit-app-region: drag;
}
</style>
