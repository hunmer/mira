<template>
  <div v-if="selectedVideo" class="split-container tab-card">
    <!-- 分割设置对话框 -->
    <Dialog :open="showSplitSettingsDialog" @update:open="$emit('update:showSplitSettingsDialog', $event)">
      <DialogContent class="max-w-md">
        <div class="p-2 space-y-4">
          <h3 class="text-lg font-semibold">场景分割设置</h3>

          <div v-if="isValidClipTime" class="checkbox-group">
            <Checkbox
              :id="`use-selected-range-${selectedVideo?.id}`"
              :model-value="useSelectedRange"
              @update:model-value="$emit('update:useSelectedRange', $event)"
            />
            <label
              :for="`use-selected-range-${selectedVideo?.id}`"
              class="checkbox-label"
            >
              使用当前选中范围 ({{ formatTime(clipStartTime) }} - {{ formatTime(clipEndTime) }})
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">最短场景时长 (秒)</label>
            <div class="input-group">
              <Input
                :model-value="minSceneDuration"
                @update:model-value="$emit('update:minSceneDuration', $event)"
                type="number"
                :min="0"
                :max="60"
                step="0.5"
                placeholder="0"
                class="duration-input"
              />
              <span class="help-text">
                过滤掉短于此时长的场景
              </span>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button @click="$emit('closeSplitSettings')" variant="outline">
              取消
            </Button>
            <Button
              @click="$emit('startSceneDetection')"
              variant="default"
            >
              开始分割
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <div v-if="sceneSegments.length === 0" class="split-controls">
      <Button
        @click="isSplitting ? $emit('cancelSceneDetection') : $emit('openSplitSettings')"
        variant="default"
        class="split-btn"
        :class="{ 'canceling': isSplitting }"
      >
        <Cross1Icon v-if="isSplitting" style="width: 14px; height: 14px" />
        <VideoIcon v-else style="width: 14px; height: 14px" />
        {{ isSplitting ? '取消分割' : '开始分割' }}
      </Button>
    </div>

    <!-- 分割进度 -->
    <div v-if="isSplitting" class="split-progress">
      <div class="progress-info">
        <span>{{ splitProgress.message }}</span>
        <span v-if="splitProgress.percent >= 0">{{ splitProgress.percent }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: splitProgress.percent + '%' }"></div>
      </div>
    </div>

    <!-- 分割结果 -->
    <div v-if="sceneSegments.length > 0" class="split-results">
      <div class="results-header">
        <div class="results-actions">
          <Button
            @click="$emit('selectAllScenes')"
            variant="ghost"
            size="sm"
            :disabled="selectedScenes.length === sceneSegments.length"
          >
            全选
          </Button>
          <Button
            @click="$emit('clearAllScenes')"
            variant="ghost"
            size="sm"
          >
            清空
          </Button>
          <Button
            @click="$emit('clearSceneSelection')"
            variant="ghost"
            size="sm"
            :disabled="selectedScenes.length === 0"
          >
            清除选择
          </Button>
          <Button
            @click="$emit('addSelectedScenesToClips')"
            variant="default"
            size="sm"
            :disabled="selectedScenes.length === 0"
          >
            <PlusIcon style="width: 14px; height: 14px" /> 添加到列表 ({{ selectedScenes.length }})
          </Button>
        </div>
      </div>

      <div ref="scenesGridRef" class="scenes-grid">
        <div
          v-for="(scene, index) in pagedScenes"
          :key="scene.id"
          class="scene-item"
          :class="{ selected: selectedScenes.includes(scene.id) }"
          @click="$emit('previewScene', scene)"
          @contextmenu.prevent="$emit('handleSceneContextMenu', $event, scene)"
        >
          <div class="scene-thumbnail">
            <img
              v-if="scene.thumbnail"
              :src="formatThumbnailUrl(scene.thumbnail)"
              :alt="`场景 ${pageOffset + index + 1}`"
              @error="$emit('handleThumbnailError', scene)"
            />
            <div v-else class="thumbnail-placeholder">
              <VideoIcon style="width: 24px; height: 24px" />
            </div>
            <div class="scene-checkbox">
              <input
                type="checkbox"
                :checked="selectedScenes.includes(scene.id)"
                @click.stop="(e) => e.shiftKey ? $emit('shiftClickScene', scene.id) : $emit('toggleSceneSelection', scene.id)"
              />
            </div>
          </div>
          <div class="scene-info">
            <div class="scene-title">
              <template v-if="scene.isMerged">
                <Link2Icon style="width: 11px; height: 11px; vertical-align: -1px" /> 已合并 {{ scene.mergedIds?.length || 0 }} 个场景
              </template>
              <template v-else>{{ pageOffset + index + 1 }}</template>
            </div>
            <div class="scene-duration">
              {{ formatTime(scene.startTime) }} - {{ formatTime(scene.endTime) }}
              ({{ formatDuration(scene.endTime - scene.startTime) }})
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <Button variant="ghost" class="icon-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)" title="上一页">
          <ChevronLeftIcon style="width: 16px; height: 16px" />
        </Button>
        <span class="pagination-info">{{ currentPage }} / {{ totalPages }} (共 {{ sceneSegments.length }} 个场景)</span>
        <Button variant="ghost" class="icon-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)" title="下一页">
          <ChevronRightIcon style="width: 16px; height: 16px" />
        </Button>
      </div>
    </div>
  </div>
  <Empty v-else class="tab-empty">
    <EmptyMedia><VideoIcon style="width: 24px; height: 24px" /></EmptyMedia>
    <EmptyTitle>请先选择一个视频</EmptyTitle>
    <EmptyDescription>在文件列表中选择视频后即可智能分割场景</EmptyDescription>
  </Empty>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Input } from 'mira-plugin-ui/src/components/ui/input'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from 'mira-plugin-ui/src/components/ui/empty'
import { Checkbox } from '@/components/ui/checkbox'
import { Cross1Icon, VideoIcon, PlusIcon, Link2Icon, ChevronLeftIcon, ChevronRightIcon } from '@radix-icons/vue'
import { Dialog, DialogContent } from 'mira-plugin-ui/src/components/ui/dialog'
import type { VideoData } from '@/types/video-editor'
import type { SceneSegment, SplitProgress } from '../types'
import { formatTime, formatDuration, formatThumbnailUrl } from '../utils/formatters'

const PAGE_SIZE = 200

const props = defineProps<{
  selectedVideo: VideoData | null
  clipStartTime: number
  clipEndTime: number
  isValidClipTime: boolean
  showSplitSettingsDialog: boolean
  useSelectedRange: boolean
  minSceneDuration: number
  isSplitting: boolean
  splitProgress: SplitProgress
  sceneSegments: SceneSegment[]
  selectedScenes: string[]
}>()

const emit = defineEmits<{
  'update:showSplitSettingsDialog': [value: boolean]
  'update:useSelectedRange': [value: boolean]
  'update:minSceneDuration': [value: number]
  openSplitSettings: []
  closeSplitSettings: []
  startSceneDetection: []
  cancelSceneDetection: []
  selectAllScenes: []
  clearAllScenes: []
  clearSceneSelection: []
  toggleSceneSelection: [sceneId: string]
  shiftClickScene: [sceneId: string]
  addSelectedScenesToClips: []
  handleSceneContextMenu: [event: MouseEvent, scene: SceneSegment]
  handleThumbnailError: [scene: { id: string; thumbnail?: string }]
  previewScene: [scene: { id: string; startTime: number; endTime: number }]
}>()

const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(props.sceneSegments.length / PAGE_SIZE)))

// 切换视频或场景数变化时，修正页码
watch(() => props.sceneSegments.length, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

const pagedScenes = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return props.sceneSegments.slice(start, start + PAGE_SIZE)
})

// 当前页在全局中的起始索引，用于显示正确的场景编号
const pageOffset = computed(() => (currentPage.value - 1) * PAGE_SIZE)

const scenesGridRef = ref<HTMLElement | null>(null)

function goToPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  scenesGridRef.value?.closest('.split-container')?.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.split-container {
  overflow: hidden;
}

.split-controls {
  flex-shrink: 0;
  padding: 12px;
  background: var(--color-background);
  border-radius: 8px;
}

.split-btn {
  width: 100%;
}

.split-btn.canceling {
  background-color: var(--color-destructive);
  border-color: var(--color-destructive);
  color: var(--color-destructive-foreground);
}

.split-btn.canceling:hover {
  background-color: var(--color-destructive-hover);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group :deep(input) {
  width: auto !important;
  flex: 1;
  min-width: 0;
}

.help-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.split-progress {
  flex-shrink: 0;
  padding: 12px;
  background: var(--color-background);
  border-radius: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--color-text);
}

.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  transition: width 0.3s ease;
}

.split-results {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.results-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.results-actions {
  display: flex;
  gap: 8px;
}

.scenes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  padding: 8px;
  align-content: start;
}

.scene-item {
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  cursor: pointer;
  background: var(--color-surface);
}

.scene-item:hover {
  border-color: var(--color-primary-light);
  transform: translateY(-1px);
}

.scene-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.scene-thumbnail {
  position: relative;
  width: 100%;
  height: 100px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.scene-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  font-size: 24px;
  color: var(--color-text-secondary);
}

.scene-checkbox {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.scene-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

.scene-play-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.scene-play-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.scene-info {
  padding: 12px;
}

.scene-title {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  font-size: 14px;
}

.scene-duration {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
}

.pagination-info {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
</style>
