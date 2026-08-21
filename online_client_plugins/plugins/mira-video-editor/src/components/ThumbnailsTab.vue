<template>
  <div v-if="selectedVideo" class="thumbnails-container tab-card">
    <div class="thumbnails-header">
      <h3>缩略图预览</h3>
      <div class="thumbnails-actions">
        <label v-if="thumbnails.length > 0" class="auto-scroll-label">
          <Switch v-model:modelValue="autoScroll" />
          <span>自动滚动</span>
        </label>
        <Button
          v-if="thumbnails.length === 0"
          @click="$emit('loadThumbnails')"
          :disabled="isLoadingThumbnails"
          variant="default"
          size="sm"
        >
          {{ isLoadingThumbnails ? '生成中...' : '加载预览' }}
        </Button>
      </div>
    </div>
    <div class="thumbnails-hint">
      <small>Ctrl + 点击: 设置起点 | Alt + 点击: 设置终点并创建片段</small>
    </div>
    <div v-if="isLoadingThumbnails" class="thumbnails-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: thumbnailProgress + '%' }"></div>
      </div>
      <span>{{ thumbnailProgressMessage }}</span>
    </div>
    <div v-if="thumbnails.length > 0" ref="thumbnailsGridRef" class="thumbnails-grid">
      <div
        v-for="(thumb, index) in pagedThumbnails"
        :key="pageOffset + index"
        class="thumbnail-item"
        :class="{
          'selected-start': thumb.time === clipStartTime,
          'selected-end': thumb.time === clipEndTime,
          'in-clip': isInExistingClip(thumb.time),
          'current-play': autoScroll && Math.abs(thumb.time - currentPlayTime) < 1
        }"
        :title="`${formatTime(thumb.time)} (第${pageOffset + index + 1}秒)`"
        @click="$emit('handleThumbnailClick', thumb.time, $event)"
        @contextmenu.prevent="onThumbContextMenu(thumb.time, $event)"
      >
        <img :src="thumb.url" :alt="`第${pageOffset + index + 1}秒`" loading="lazy" />
      </div>

    <!-- 右键菜单 -->
    <div
      v-if="ctxMenu.visible"
      class="thumb-context-menu"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      @click.stop
    >
      <div class="thumb-context-menu-item" @click="onMenuDelete">
        删除片段
      </div>
    </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <Button variant="ghost" class="icon-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)" title="上一页">
        <ChevronLeftIcon style="width: 16px; height: 16px" />
      </Button>
      <span class="pagination-info">{{ currentPage }} / {{ totalPages }} (共 {{ thumbnails.length }} 帧)</span>
      <Button variant="ghost" class="icon-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)" title="下一页">
        <ChevronRightIcon style="width: 16px; height: 16px" />
      </Button>
    </div>

    <Empty v-else-if="!isLoadingThumbnails && thumbnails.length === 0" class="tab-empty">
      <EmptyMedia><ImageIcon style="width: 24px; height: 24px" /></EmptyMedia>
      <EmptyTitle>暂无缩略图</EmptyTitle>
      <EmptyDescription>点击"加载预览"生成视频缩略图</EmptyDescription>
    </Empty>
  </div>
  <Empty v-else class="tab-empty">
    <EmptyMedia><VideoIcon style="width: 24px; height: 24px" /></EmptyMedia>
    <EmptyTitle>请先选择一个视频</EmptyTitle>
    <EmptyDescription>在文件列表中选择视频后即可预览缩略图</EmptyDescription>
  </Empty>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from 'mira-plugin-ui/src/components/ui/empty'
import { Switch } from '@/components/ui/switch'
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, VideoIcon } from '@radix-icons/vue'
import type { VideoData } from '@/types/video-editor'
import type { ThumbnailItem } from '../types'
import { formatTime } from '../utils/formatters'

const PAGE_SIZE = 200

const props = defineProps<{
  selectedVideo: VideoData | null
  thumbnails: ThumbnailItem[]
  isLoadingThumbnails: boolean
  thumbnailProgress: number
  thumbnailProgressMessage: string
  clipStartTime: number
  clipEndTime: number
  currentPlayTime: number
  isInExistingClip: (time: number) => boolean
  findClipAtTime: (time: number) => { id: string } | null
}>()

const emit = defineEmits<{
  loadThumbnails: []
  handleThumbnailClick: [time: number, event: MouseEvent]
  deleteClip: [clipId: string]
}>()

// 右键菜单
const ctxMenu = reactive({ visible: false, x: 0, y: 0, clipId: '' })

function onThumbContextMenu(time: number, event: MouseEvent) {
  const found = props.findClipAtTime?.(time)
  if (!found) return
  ctxMenu.x = event.clientX
  ctxMenu.y = event.clientY
  ctxMenu.clipId = found.id
  ctxMenu.visible = true
}

function onMenuDelete() {
  if (ctxMenu.clipId) {
    emit('deleteClip', ctxMenu.clipId)
  }
  ctxMenu.visible = false
}

function closeCtxMenu() {
  ctxMenu.visible = false
}

onMounted(() => document.addEventListener('click', closeCtxMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeCtxMenu))

const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(props.thumbnails.length / PAGE_SIZE)))

watch(() => props.thumbnails.length, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

const pageOffset = computed(() => (currentPage.value - 1) * PAGE_SIZE)
const pagedThumbnails = computed(() => {
  const start = pageOffset.value
  return props.thumbnails.slice(start, start + PAGE_SIZE)
})

const thumbnailsGridRef = ref<HTMLElement | null>(null)
const autoScroll = ref(false)

watch(() => props.currentPlayTime, (time) => {
  if (!autoScroll.value || props.thumbnails.length === 0) return
  const idx = Math.min(Math.floor(time), props.thumbnails.length - 1)
  if (idx < 0) return
  const targetPage = Math.floor(idx / PAGE_SIZE) + 1
  if (targetPage !== currentPage.value) {
    currentPage.value = targetPage
  }
  nextTick(() => {
    const el = thumbnailsGridRef.value?.children[idx - pageOffset.value] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

function goToPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  thumbnailsGridRef.value?.scrollTo({ top: 0 })
}
</script>

<style scoped>
.thumbnails-container {
  overflow: hidden;
}

.thumbnails-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.thumbnails-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.thumbnails-actions {
  display: flex;
  gap: 8px;
}

.thumbnails-hint {
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  flex-shrink: 0;
}

.thumbnails-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  padding: 8px;
  align-content: start;
}

.thumbnail-item {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background: var(--color-surface);
  height: 0;
  padding-bottom: 56.25%;
}

.thumbnail-item:hover {
  border-color: var(--color-primary);
  transform: scale(1.02);
  z-index: 1;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.thumbnail-item.selected-start {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3);
}

.thumbnail-item.selected-end {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
}

.thumbnail-item.in-clip {
  opacity: 0.6;
  border-color: #f59e0b;
}

.thumbnail-item.in-clip::after {
  content: '✓';
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(245, 158, 11, 0.9);
  color: white;
  font-size: 12px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-item img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a1a;
}

.thumbnail-time {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 4px 4px;
  text-align: center;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
  flex-shrink: 0;
}

.pagination-info {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.thumb-context-menu {
  position: fixed;
  background: var(--color-popover, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 120px;
  padding: 4px 0;
}

.thumb-context-menu-item {
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-danger);
}

.thumb-context-menu-item:hover {
  background: var(--color-hover);
}

.auto-scroll-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.thumbnail-item.current-play {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
</style>
