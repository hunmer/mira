<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { CircleAlert, ImageDown, ImageOff, ImagePlus, Loader2, WifiOff, X } from '@lucide/vue'
import { SelectionBox } from '@hunmer/vue-selection-box'
import '@hunmer/vue-selection-box/style.css'
import { MediaWaterfall } from 'mira-plugin-ui/library'
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
import { readServerConfig } from '@/lib/server'
import { addTasks, currentTask, loadMore, retryTask } from '@/stores/tasks'
import BatchImportDialog from './BatchImportDialog.vue'
import ResultCard from './ResultCard.vue'
import type { ResultItem } from '@/types'

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

/** 卡片点击：经 SelectionBox 处理（无修饰键单选 / Ctrl 加选 / Shift 连选 / Alt 减选） */
function onCardClick(item: ResultItem, event: MouseEvent) {
  selectionBoxRef.value?.handleItemClick(item.key, event)
}

// ── 批量导入素材库 ───────────────────────────────────────────────
const importOpen = ref(false)
const importFiles = ref<File[]>([])
const fetching = reactive({ active: false, done: 0, total: 0 })

/** 原图 URL / blob → File（文件名取 Pin 标题，非法字符清理，缺省 pin-{id}） */
function toFile(item: ResultItem, url: string, blob: Blob): File {
  const ext = (url.match(/\.(png|jpe?g|webp|gif|bmp)(?:\?|$)/i)?.[1] || blob.type.split('/')[1] || 'jpg').toLowerCase()
  const safeTitle = (item.title || '').replace(/[\\/:*?"<>|#%&{}$!'@+`=?~]/g, '').trim()
  const name = `${safeTitle || `pin-${item.id}`}.${ext === 'jpeg' ? 'jpg' : ext}`
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

/** 并发抓取选中项原图（探测 originals 优先），完成后弹 BatchImportDialog */
async function startImport() {
  const items = selectedItems.value
  if (!items.length || fetching.active) return
  if (!readServerConfig().token) {
    window.alert(t('main.selection.noServer'))
    return
  }
  fetching.active = true
  fetching.done = 0
  fetching.total = items.length
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
      fetching.done++
    }
  }
  await Promise.all([worker(), worker(), worker()])
  fetching.active = false
  if (!files.length) {
    window.alert(t('main.selection.fetchAllFailed'))
    return
  }
  if (failed) window.alert(t('main.selection.fetchFailed', { n: failed }))
  importFiles.value = files
  importOpen.value = true
}

/** 上传队列结束：全部成功时回写 saved 徽标并清空选择（个别失败留给对话框内重试） */
function onImported({ failed }: { total: number; failed: number }) {
  if (!failed) {
    const keys = new Set(selectedKeys.value)
    task.value?.results.forEach((item) => {
      if (keys.has(item.key)) item.saved = true
    })
    selectedKeys.value = []
  }
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

      <!-- 底部浮动操作条：已选计数 + 批量导入 / 清空 -->
      <div
        v-if="selectedKeys.length || fetching.active"
        class="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur"
      >
        <Loader2 v-if="fetching.active" class="size-4 animate-spin text-muted-foreground" />
        <span class="px-1 text-xs tabular-nums">
          {{ fetching.active
            ? t('main.selection.fetching', { done: fetching.done, total: fetching.total })
            : t('main.selection.count', { n: selectedKeys.length }) }}
        </span>
        <template v-if="!fetching.active">
          <Button size="sm" class="h-7 rounded-full px-3" :disabled="!selectedKeys.length" @click="startImport">
            <ImageDown class="size-3.5" />
            {{ t('main.selection.import') }}
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
    </template>

    <!-- 批量导入素材库（BatchUploadDialog 包装：库/树数据 + SDK 上传） -->
    <BatchImportDialog v-model:open="importOpen" :files="importFiles" @uploaded="onImported" />
  </section>
</template>
