<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { CircleAlert, ImageDown, ImageOff, ImagePlus, Loader2, WifiOff, X } from '@lucide/vue'
import { SelectionBox } from '@hunmer/vue-selection-box'
import '@hunmer/vue-selection-box/style.css'
// 细路径导入:经 library/index 入口会把 MediaBrowser 等未用大组件拖进 chunk
import MediaWaterfall from 'mira-plugin-ui/src/library/MediaWaterfall.vue'
import { resolveMiraServerConfig } from 'mira-plugin-ui/src/library/serverAuth'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from 'mira-plugin-ui/src/components/ui/empty'
import { t } from '@/lib/i18n'
import { DEMO_MEDIA, logError } from '@/lib/mira'
import { getLargeUrl } from '@/lib/pinterest'
import { addTasks, currentTask, loadMore, retryTask } from '@/stores/tasks'
import ResultCard from './ResultCard.vue'
import type { ResultItem } from '@/types'

// 批量导入对话框异步加载：BatchUploadForm/LibraryTreeView/SDK 等大依赖拆出主 chunk
const BatchImportDialog = defineAsyncComponent(() => import('./BatchImportDialog.vue'))

/**
 * 右栏结果区：按当前任务状态切换空态/瀑布流；瀑布流布局复用
 * mira-plugin-ui 的通用 MediaWaterfall（columnWidth=缩放列宽，触底 reach-bottom
 * 触发 loadMore 以结果养结果）；切换任务时恢复各自滚动位置。
 *
 * 结果卡片内置 SelectionBox 多选（点选 / Ctrl 加选 / Shift 连选 / 空白拖拽框选，
 * 与 MediaBrowser 同一交互），选中后底部浮动操作条可批量导入素材库：
 * 先并发抓取原图转 File，再弹 BatchImportDialog（BatchUploadDialog + SDK 上传）。
 */
const task = currentTask
const panel = ref<HTMLElement>()

const props = defineProps<{ scale: number }>()

function getAspectOf(item: ResultItem): string | undefined {
  return item.width > 0 && item.height > 0 ? `${item.width}:${item.height}` : undefined
}

function onScroll() {
  if (task.value && panel.value) task.value.scroll = panel.value.scrollTop
}

watch(
  () => task.value?.id,
  async () => {
    selectedKeys.value = []
    await nextTick()
    if (panel.value && task.value) panel.value.scrollTop = task.value.scroll
  },
)

onMounted(() => {
  if (panel.value && task.value) panel.value.scrollTop = task.value.scroll
})

// ── 多选（SelectionBox；与 MediaBrowser 同款交互） ─────────────────
const selectedKeys = ref<string[]>([])
const selectionBoxRef = ref<InstanceType<typeof SelectionBox>>()

const selectedItems = computed(() =>
  (task.value?.results || []).filter((item) => selectedKeys.value.includes(item.key)),
)

/** 卡片点击:批量收集语义(默认多选)——无修饰键/Ctrl=toggle(点未选加入/已选移除,
 *  不清空其他),Alt=减选;Shift 连选交 SelectionBox(锚点由其维护) */
function onCardClick(item: ResultItem, event: MouseEvent) {
  const id = item.key
  if (event.shiftKey) {
    selectionBoxRef.value?.handleItemClick(id, event)
    return
  }
  const set = new Set(selectedKeys.value)
  if (event.altKey || set.has(id)) set.delete(id)
  else set.add(id)
  selectedKeys.value = [...set]
}

// ── 批量导入素材库（直接导入 = 记忆位置快速入库；导入到 = 弹对话框选位置） ──
const importOpen = ref(false)
const importFiles = ref<File[]>([])
/** 抓取/上传进度（两按钮共用） */
const busy = reactive({ active: false, phase: 'fetch' as 'fetch' | 'upload', done: 0, total: 0 })

/** 直接导入的目标位置记忆（来自上次「导入到」或直接导入时的首库兜底） */
const TARGET_KEY = 'mira-pinterest-search-v2:import-target'
interface ImportTarget { libraryId: string; folderId?: string; tags?: string[] }

function loadTarget(): ImportTarget | null {
  try {
    const raw = localStorage.getItem(TARGET_KEY)
    const target = raw ? JSON.parse(raw) : null
    return target?.libraryId ? target : null
  } catch {
    return null
  }
}

function saveTarget(target: ImportTarget) {
  localStorage.setItem(TARGET_KEY, JSON.stringify(target))
}

/** 原图 URL / blob → File（文件名取 Pin 标题，非法字符清理，缺省 pin-{id}） */
function toFile(item: ResultItem, url: string, blob: Blob): File {
  const ext = (url.match(/\.(png|jpe?g|webp|gif|bmp)(?:\?|$)/i)?.[1] || blob.type.split('/')[1] || 'jpg').toLowerCase()
  const safeTitle = (item.title || '').replace(/[\\/:*?"<>|#%&{}$!'@+`=?~]/g, '').trim()
  const name = `${safeTitle || `pin-${item.id}`}.${ext === 'jpeg' ? 'jpg' : ext}`
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

/** 并发(3)抓取选中项原图（探测 originals 优先）；失败项跳过计数，进度写 busy */
async function fetchSelectedImages(): Promise<{ files: File[]; failed: number }> {
  const items = selectedItems.value
  const files: File[] = []
  let failed = 0
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const item = items[cursor++]
      try {
        const url = await getLargeUrl(item.largeUrl || item.url)
        const response = await fetch(url)
        if (!response.ok) throw new Error(String(response.status))
        files.push(toFile(item, url, await response.blob()))
      } catch (error) {
        failed++
        logError('[mira-pinterest-search-v2] fetch image failed:', item.id, error)
      }
      busy.done++
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return { files, failed }
}

/** 校验连接并置忙;返回 server 配置(不可用返回 null) */
function beginBusy(): { server: string; token: string } | null {
  if (busy.active) return null
  const { server, token } = resolveMiraServerConfig()
  if (!server || !token) {
    window.alert(t('main.selection.noServer'))
    return null
  }
  busy.active = true
  busy.phase = 'fetch'
  busy.done = 0
  busy.total = selectedItems.value.length
  return { server, token }
}

/** 导入到…：抓取完成后弹 BatchImportDialog 选库/文件夹/标签 */
async function importTo() {
  if (!selectedItems.value.length) return
  const config = beginBusy()
  if (!config) return
  try {
    const { files, failed } = await fetchSelectedImages()
    if (!files.length) {
      window.alert(t('main.selection.fetchAllFailed'))
      return
    }
    if (failed) window.alert(t('main.selection.fetchFailed', { n: failed }))
    importFiles.value = files
    importOpen.value = true
  } finally {
    busy.active = false
  }
}

/** 直接导入：抓取后按记忆位置（缺省首库根目录）并发上传，不弹对话框 */
async function quickImport() {
  if (!selectedItems.value.length) return
  const config = beginBusy()
  if (!config) return
  try {
    const { files, failed } = await fetchSelectedImages()
    if (!files.length) {
      window.alert(t('main.selection.fetchAllFailed'))
      return
    }
    const client = new MiraClient(config.server)
    client.setToken(config.token)
    let target = loadTarget()
    if (!target) {
      const libraries = ((await client.libraries().getAll()) as any[]) || []
      if (!libraries.length) {
        window.alert(t('main.picker.noLibrary'))
        return
      }
      target = { libraryId: String(libraries[0].id) }
      saveTarget(target)
    }
    busy.phase = 'upload'
    busy.done = 0
    busy.total = files.length
    let cursor = 0
    let uploadFailed = 0
    const worker = async () => {
      while (cursor < files.length) {
        const file = files[cursor++]
        try {
          await client.files().uploadFiles([file], target.libraryId, {
            folderId: target.folderId,
            tags: target.tags,
          })
        } catch (error) {
          uploadFailed++
          logError('[mira-pinterest-search-v2] upload failed:', file.name, error)
        }
        busy.done++
      }
    }
    await Promise.all([worker(), worker(), worker()])
    if (!failed && !uploadFailed) markSelectedSaved()
    showToast(t('main.selection.importedToast', {
      ok: files.length - uploadFailed,
      failedSuffix: uploadFailed ? t('main.selection.importedFailedSuffix', { n: uploadFailed }) : '',
    }))
  } finally {
    busy.active = false
  }
}

/** 全部成功时回写 saved 徽标并清空选择 */
function markSelectedSaved() {
  const keys = new Set(selectedKeys.value)
  task.value?.results.forEach((item) => {
    if (keys.has(item.key)) item.saved = true
  })
  selectedKeys.value = []
}

/** 对话框上传队列结束：记忆导入位置;全部成功回写 saved 并清空选择（个别失败留给对话框内重试） */
function onImported({ failed, libraryId, folderId, tags }: { total: number; failed: number; libraryId?: string; folderId?: string; tags?: string[] }) {
  if (libraryId) saveTarget({ libraryId, folderId, tags })
  if (!failed) markSelectedSaved()
}

// ── 轻量结果提示（直接导入完成） ─────────────────────────────────
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 3500)
}
</script>

<template>
  <section
    ref="panel"
    class="min-w-0 flex-1 overflow-y-auto bg-muted/30"
    @scroll.passive="onScroll"
  >
    <!-- 无任务 -->
    <div v-if="!task" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md">
        <EmptyHeader>
          <EmptyMedia><ImagePlus /></EmptyMedia>
          <EmptyTitle>{{ t('main.empty.title') }}</EmptyTitle>
          <EmptyDescription>{{ t('main.empty.content') }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" @click="addTasks(DEMO_MEDIA)">{{ t('main.empty.demo') }}</Button>
        </EmptyContent>
      </Empty>
    </div>

    <!-- 搜索中 -->
    <div v-else-if="task.state === 'waiting' || task.state === 'processing'" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia><Loader2 class="animate-spin" /></EmptyMedia>
          <EmptyTitle>{{ t('main.waiting.title') }}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </div>

    <!-- 失败：网络 / 未登录 / 其它 -->
    <div v-else-if="task.state === 'failed'" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia>
            <WifiOff v-if="task.error === 'Failed to fetch'" />
            <CircleAlert v-else />
          </EmptyMedia>
          <EmptyTitle>
            {{ task.error === 'Failed to fetch'
              ? t('main.connectError.title')
              : task.error === '401' ? t('main.authError.title') : t('main.error.title') }}
          </EmptyTitle>
          <EmptyDescription>
            {{ task.error === 'Failed to fetch'
              ? t('main.connectError.content')
              : task.error === '401' ? t('main.authError.content') : task.error }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" @click="retryTask(task)">{{ t('main.connectError.retry') }}</Button>
        </EmptyContent>
      </Empty>
    </div>

    <!-- 成功但无结果 -->
    <div v-else-if="!task.results.length" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia><ImageOff /></EmptyMedia>
          <EmptyTitle>{{ t('main.noResult.title') }}</EmptyTitle>
          <EmptyDescription>{{ t('main.noResult.content') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>

    <!-- 瀑布流（MediaWaterfall + SelectionBox 多选：触底自动加载） -->
    <template v-else>
      <div class="p-4 pb-16">
        <SelectionBox
          ref="selectionBoxRef"
          v-model="selectedKeys"
          :min-selection-size="8"
          @clear-selection="selectedKeys = []"
        >
          <MediaWaterfall
            :items="task.results"
            :column-width="props.scale"
            :gap="16"
            :get-key="(item: ResultItem) => item.key"
            :get-aspect="getAspectOf"
            lazy
            @reach-bottom="loadMore(task)"
          >
            <template #default="{ item }">
              <ResultCard
                :item="item"
                :big="props.scale >= 400"
                :selected="selectedKeys.includes(item.key)"
                @card-click="(event: MouseEvent) => onCardClick(item, event)"
              />
            </template>
          </MediaWaterfall>
        </SelectionBox>
      </div>
      <div v-if="task.loadingMore" class="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 class="size-4 animate-spin" />
        {{ t('main.loadingMore') }}
      </div>

      <!-- 底部浮动操作条：已选计数 + 直接导入(记忆位置)/导入到(选位置) / 清空；busy 时显示进度 -->
      <div
        v-if="selectedKeys.length || busy.active"
        class="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur"
      >
        <Loader2 v-if="busy.active" class="size-4 animate-spin text-muted-foreground" />
        <span class="px-1 text-xs tabular-nums">
          {{ busy.active
            ? (busy.phase === 'fetch'
                ? t('main.selection.fetching', { done: busy.done, total: busy.total })
                : t('main.selection.uploading', { done: busy.done, total: busy.total }))
            : t('main.selection.count', { n: selectedKeys.length }) }}
        </span>
        <template v-if="!busy.active">
          <Button size="sm" class="h-7 rounded-full px-3" :disabled="!selectedKeys.length" @click="quickImport">
            <ImageDown class="size-3.5" />
            {{ t('main.selection.quickImport') }}
          </Button>
          <Button size="sm" variant="outline" class="h-7 rounded-full px-3" :disabled="!selectedKeys.length" @click="importTo">
            {{ t('main.selection.importTo') }}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="size-7 rounded-full"
            :title="t('main.selection.clear')"
            @click="selectedKeys = []"
          >
            <X class="size-3.5" />
          </Button>
        </template>
      </div>

      <!-- 直接导入结果提示 -->
      <div
        v-else-if="toast"
        class="sticky bottom-4 z-30 mx-auto w-fit rounded-full border bg-background/95 px-4 py-1.5 text-xs shadow-lg backdrop-blur"
      >
        {{ toast }}
      </div>
    </template>

    <!-- 批量导入素材库（BatchUploadDialog 包装：库/树数据 + SDK 上传） -->
    <BatchImportDialog v-model:open="importOpen" :files="importFiles" @uploaded="onImported" />
  </section>
</template>
