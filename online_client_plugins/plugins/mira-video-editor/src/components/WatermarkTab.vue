<template>
  <div class="watermark-tab">
    <Empty v-if="!video" class="tab-empty">
      <EmptyMedia><VideoIcon style="width: 24px; height: 24px" /></EmptyMedia>
      <EmptyTitle>请先选择一个视频</EmptyTitle>
      <EmptyDescription>在文件列表中选择视频后即可去水印</EmptyDescription>
    </Empty>

    <div v-else class="panel-content tab-card">
      <!-- 上下分栏布局 -->
      <div class="split-layout">
        <!-- 上方：截图和区域选择 -->
        <div class="left-panel">
          <div class="screenshot-panel">
            <!-- 截图控制 -->
            <div class="screenshot-header">
              <h4>视频截图</h4>
              <div class="screenshot-actions">
                <Button @click="openEditDialog" :disabled="!video" size="sm" variant="default">
                  <Pencil1Icon style="width: 12px; height: 12px" /> 编辑水印
                </Button>
              </div>
            </div>

            <!-- 截图显示区域 -->
            <div class="screenshot-display">
              <div v-if="isCapturing && !screenshotUrl" class="capturing-state">
                <div class="loading-spinner"><UpdateIcon style="width: 28px; height: 28px" /></div>
                <span>正在截取视频帧...</span>
              </div>
              <div v-else-if="screenshotUrl" class="screenshot-wrapper-container">
                <div
                  ref="screenshotContainerRef"
                  class="screenshot-wrapper"
                  @mousedown="handleSelectionStart"
                  @mousemove="handleSelectionMove"
                  @mouseup="handleSelectionEnd"
                  @mouseleave="handleSelectionLeave"
                >
                  <img
                    ref="screenshotImageRef"
                    :src="screenshotUrl"
                    alt="视频截图"
                    class="screenshot-image"
                    draggable="false"
                  />
                  <!-- 选择框 -->
                  <div
                    v-if="selectionRect"
                    class="selection-rect"
                    :style="selectionRectStyle"
                  />
                  <!-- 本次已选择的临时区域叠加层 -->
                  <div
                    v-for="(region, index) in tempRegions"
                    :key="'temp-' + index"
                    class="watermark-overlay-rect"
                    :style="getOverlayStyle(region)"
                  >
                    <span class="overlay-label">新{{ index + 1 }}</span>
                  </div>
                  <!-- 已保存的水印区域叠加层 -->
                  <div
                    v-for="(region, index) in regions"
                    :key="region.id"
                    class="watermark-overlay-rect saved"
                    :style="getOverlayStyle(region)"
                  >
                    <span class="overlay-label">{{ region.desc || `水印${index + 1}` }}</span>
                  </div>
                </div>
                <div class="selection-info">
                  <span v-if="selectionRect">
                    选择: {{ formatRectPercent(selectionRect) }}
                  </span>
                  <span v-else class="hint-text">在图片上拖拽选择水印区域</span>
                </div>
              </div>
              <div v-else class="no-screenshot-state">
                <div class="no-screenshot-content">
                  <span class="no-screenshot-icon"><CameraIcon style="width: 40px; height: 40px" /></span>
                  <span class="no-screenshot-text">点击上方按钮截取视频帧</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- 下方：控制面板和区域列表 -->
        <div class="right-panel">
          <!-- 启用开关 -->
          <div class="enable-section">
            <div class="flex items-center justify-between">
              <span class="toggle-text">启用水印去除</span>
              <Switch :model-value="enabled" @update:model-value="handleEnabledChange" />
            </div>
          </div>

          <!-- 本次选择的操作按钮 -->
          <div v-if="screenshotUrl" class="temp-selection-section">
            <div class="section-header">
              <h4>本次选择 ({{ tempRegions.length }})</h4>
            </div>
            <div class="temp-actions">
              <Button
                @click="confirmSelection"
                :disabled="tempRegions.length === 0"
                variant="default"
                class="flex-1"
              >
                <CheckIcon style="width: 14px; height: 14px" /> 添加到列表 ({{ tempRegions.length }})
              </Button>
              <Button
                @click="clearTempRegions"
                :disabled="tempRegions.length === 0"
                variant="outline"
              >
                清除本次
              </Button>
            </div>
          </div>

          <!-- 预设管理 -->
          <div class="preset-section">
            <div class="section-header">
              <h4>位置预设</h4>
            </div>
            <div class="preset-controls">
              <Select v-model="selectedPresetId">
                <SelectTrigger class="preset-select-trigger">
                  <SelectValue placeholder="-- 选择预设 --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="preset in presets" :key="preset.id" :value="preset.id">
                    {{ preset.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" @click="handleSavePreset" title="保存当前区域为预设">
                保存预设
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="handleDeletePreset"
                :disabled="!selectedPresetId || !canDeletePreset"
                title="删除当前预设"
              >
                删除预设
              </Button>
            </div>
          </div>

          <!-- 区域管理 -->
          <div class="region-section">
            <div class="section-header">
              <h4>已保存区域 ({{ regions.length }})</h4>
            </div>
            <div class="region-actions">
              <Button
                variant="outline"
                @click="handleClearRegions"
                :disabled="regions.length === 0"
                title="清空所有水印区域"
              >
                清空全部
              </Button>
            </div>
            <div class="region-list">
              <div
                v-for="(region, index) in regions"
                :key="region.id"
                :class="['region-item', { hovered: region.id === hoveredRegionId }]"
                @mouseenter="emit('hoverRegion', region.id)"
                @mouseleave="emit('hoverRegion', undefined)"
              >
                <div class="region-info">
                  <span class="region-name">{{ region.desc || `水印${index + 1}` }}</span>
                  <span class="region-coords">
                    x: {{ formatPercent(region.x) }} y: {{ formatPercent(region.y) }}
                    w: {{ formatPercent(region.w) }} h: {{ formatPercent(region.h) }}
                  </span>
                </div>
                <Button variant="ghost" size="icon" @click="handleDeleteRegion(region.id)" title="删除此区域" class="btn-delete">
                  <TrashIcon style="width: 14px; height: 14px" />
                </Button>
              </div>
              <div v-if="regions.length === 0" class="empty-regions">
                暂无水印区域，在上方截图上拖拽选择后点击"添加到列表"
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 结束上下分栏布局 -->

      <!-- 保存预设对话框 -->
      <Dialog v-model:open="showPresetDialog">
        <DialogContent class="preset-dialog">
          <DialogHeader>
            <h3>保存预设</h3>
          </DialogHeader>
          <div class="dialog-body">
            <Input
              v-model="newPresetName"
              placeholder="输入预设名称"
              @keyup.enter="confirmSavePreset"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showPresetDialog = false">取消</Button>
            <Button @click="confirmSavePreset" :disabled="!newPresetName.trim()">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- 删除确认对话框 -->
      <AlertDialog v-model:open="showDeleteConfirm">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {{ deleteConfirmMessage }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel @click="showDeleteConfirm = false">取消</AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete">确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- 编辑水印对话框 -->
      <WatermarkEditDialog
        v-model:open="showEditDialog"
        :video="video"
        :video-url="watermarkEditVideoUrl"
        :current-time="localCurrentTime"
        :saved-regions="regions"
        @confirm="handleEditDialogConfirm"
        @update:current-time="handleCurrentTimeUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WatermarkRegion, WatermarkPreset } from '@/types/watermark'
import type { VideoData } from '@/types/video-editor'
import { useWatermark } from '@/composables/useWatermark'
import { toast } from '@/lib/toast'
import { localVideoStorage } from '@/lib/localVideoStorage'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'mira-plugin-ui/src/components/ui/select'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from 'mira-plugin-ui/src/components/ui/empty'
import { Pencil1Icon, UpdateIcon, CameraIcon, CheckIcon, TrashIcon, VideoIcon } from '@radix-icons/vue'
import { Input } from 'mira-plugin-ui/src/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from 'mira-plugin-ui/src/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import WatermarkEditDialog from './WatermarkEditDialog.vue'
import { getTempDir } from '@/lib/exec'
import { generateThumbnail as ffmpegGenerateThumbnail } from '@/lib/ffmpeg'
import { isHostAvailable } from '@/lib/host'
import { pathJoin, toFileUrl, fromFileUrl } from '@/lib/path'

// Props
const props = defineProps<{
  video: VideoData | null
  listId?: string
  currentTime?: number // 当前播放时间
}>()

// Emits
const emit = defineEmits<{
  hoverRegion: [id: string | undefined]
  'update:video': [video: VideoData]
  'update:currentTime': [time: number]
}>()

// 本地 currentTime 状态，用于 v-model
const localCurrentTime = ref(props.currentTime ?? 0)

// 监听 props.currentTime 变化，同步到本地状态
watch(() => props.currentTime, (newTime) => {
  if (newTime !== undefined) {
    localCurrentTime.value = newTime
  }
})

// 使用水印 composable
const {
  enabled,
  regions,
  presets,
  selectedPresetId,
  hoveredRegionId,
  loadFromVideo,
  saveToVideo,
  addRegion,
  removeRegion,
  clearRegions,
  applyPreset,
  saveAsPreset,
  deletePreset,
  setHoveredRegion
} = useWatermark()

// 状态
const showPresetDialog = ref(false)
const newPresetName = ref('')
const showDeleteConfirm = ref(false)
const deleteConfirmMessage = ref('')
const pendingDeletePresetId = ref<string | null>(null)
const pendingClearRegions = ref(false)
const showEditDialog = ref(false)

// 截图选择相关状态
const isCapturing = ref(false)
const screenshotUrl = ref<string | null>(null)
const screenshotContainerRef = ref<HTMLElement | null>(null)
const screenshotImageRef = ref<HTMLImageElement | null>(null)
const selectionRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const isSelecting = ref(false)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const tempRegions = ref<Array<{ x: number; y: number; w: number; h: number }>>([])

// 计算属性
const canDeletePreset = computed(() => {
  if (!selectedPresetId.value) return false
  // 默认预设不可删除
  const defaultPresetIds = ['top-left', 'top-right', 'bottom-right', 'top-both']
  return !defaultPresetIds.includes(selectedPresetId.value)
})

const hasValidSelection = computed(() => {
  return tempRegions.value.length > 0
})

// 供 WatermarkEditDialog 使用的 videoUrl，将本地路径转换为 file:// URL
const watermarkEditVideoUrl = computed(() => {
  console.log('[WatermarkTab] watermarkEditVideoUrl - props.video:', props.video)
  if (!props.video) return null

  // 如果是 blob URL 或已经是 file:// URL，直接返回
  if (props.video.path?.startsWith('blob:') || props.video.path?.startsWith('file://')) {
    console.log('[WatermarkTab] watermarkEditVideoUrl - using original path (blob/file://):', props.video.path)
    return props.video.path
  }

  // 将本地文件路径转换为 file:// URL
  if (props.video.path) {
    return toFileUrl(props.video.path)
  }

  console.log('[WatermarkTab] watermarkEditVideoUrl - no valid path, returning null')
  return null
})

const selectionRectStyle = computed(() => {
  if (!selectionRect.value) return {}

  const img = screenshotImageRef.value
  const container = screenshotContainerRef.value
  if (!img || !container) return {}

  const imgRect = img.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // 计算图片相对于容器的偏移（考虑 object-fit: contain）
  const offsetX = imgRect.left - containerRect.left
  const offsetY = imgRect.top - containerRect.top

  const rect = selectionRect.value
  return {
    left: `${offsetX + rect.x}px`,
    top: `${offsetY + rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`
  }
})

// 格式化百分比
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

// 处理启用状态变化（Switch 传入新值；无参调用时自行取反）
function handleEnabledChange(value?: boolean) {
  const newValue = value ?? !enabled.value
  enabled.value = newValue
  if (props.video) {
    saveToVideo(props.video)
    // 持久化保存到本地存储
    if (props.listId) {
      localVideoStorage.updateVideoInLocalList(
        props.listId,
        props.video.id,
        { watermarks: props.video.watermarks }
      )
    }
    // 通知父组件更新视频对象以触发响应式更新
    emit('update:video', { ...props.video })
    if (newValue) {
      toast.info('水印去除已启用，导出时将自动处理', '提示')
    }
  }
}

// 处理保存预设
function handleSavePreset() {
  if (regions.value.length === 0) {
    toast.warning('请先添加水印区域', '提示')
    return
  }
  newPresetName.value = `预设${presets.value.length + 1}`
  showPresetDialog.value = true
}

// 确认保存预设
function confirmSavePreset() {
  const name = newPresetName.value.trim()
  if (!name) return

  saveAsPreset(name)
  showPresetDialog.value = false
  newPresetName.value = ''
  toast.success('预设已保存', '成功')
}

// 处理删除预设
function handleDeletePreset() {
  if (!selectedPresetId.value || !canDeletePreset.value) return

  const preset = presets.value.find(p => p.id === selectedPresetId.value)
  deleteConfirmMessage.value = `确定要删除预设 "${preset?.name}" 吗？`
  pendingDeletePresetId.value = selectedPresetId.value
  pendingClearRegions.value = false
  showDeleteConfirm.value = true
}

// 处理添加区域 - 已弃用，改为直接在截图上选择
function handleAddRegion() {
  // 不再需要此函数，用户直接在截图上拖拽选择
}

// 截取视频帧
async function handleCapture() {
  if (!props.video) {
    toast.warning('请先选择一个视频', '提示')
    return
  }

  // 检查宿主环境
  if (!isHostAvailable()) {
    toast.info('此功能需要在 Mira 客户端的插件窗口中使用', '提示')
    return
  }

  // 重置状态
  isCapturing.value = true
  screenshotUrl.value = null
  selectionRect.value = null
  tempRegions.value = []

  try {
    // 清理视频路径
    let videoPath = props.video.path
    if (/^(file|local-resource):\/\//i.test(videoPath)) {
      videoPath = fromFileUrl(videoPath)
    } else if (videoPath.startsWith('blob:')) {
      toast.error('无法为 Blob 视频生成截图', '提示')
      isCapturing.value = false
      return
    }

    // 获取临时目录
    const watermarkTempDir = await getTempDir('watermark-tab')

    // 生成截图文件名（使用当前播放时间，如果有的话）
    const timestamp = props.currentTime || 0
    const screenshotFileName = `watermark_${Date.now()}.jpg`
    const screenshotPath = pathJoin(watermarkTempDir, screenshotFileName)

    // 生成截图（使用原始视频尺寸）
    await ffmpegGenerateThumbnail({
      inputPath: videoPath,
      outputPath: screenshotPath,
      timestamp: timestamp,
      width: props.video.metadata?.width || 1920,
      height: props.video.metadata?.height || 1080
    })

    // 设置截图 URL
    screenshotUrl.value = toFileUrl(screenshotPath)
    toast.success('截图生成成功，请在图片上拖拽选择水印区域', '提示')
  } catch (error) {
    console.error('生成截图失败:', error)
    toast.error('生成截图失败: ' + (error as Error).message, '错误')
  } finally {
    isCapturing.value = false
  }
}

// 打开编辑水印对话框
function openEditDialog() {
  showEditDialog.value = true
}

// 处理编辑对话框中的 currentTime 更新
function handleCurrentTimeUpdate(newTime: number) {
  localCurrentTime.value = newTime
  emit('update:currentTime', newTime)
}

// 处理编辑水印对话框确认
function handleEditDialogConfirm(newRegions: Array<{ x: number; y: number; w: number; h: number }>) {
  // 添加所有新区域到已保存列表
  newRegions.forEach((region, index) => {
    addRegion({ ...region, desc: `水印${regions.value.length + index + 1}` })
  })

  // 保存到视频
  if (props.video) {
    saveToVideo(props.video)
    if (props.listId) {
      localVideoStorage.updateVideoInLocalList(
        props.listId,
        props.video.id,
        { watermarks: props.video.watermarks }
      )
    }
  }

  toast.success(`已添加 ${newRegions.length} 个水印区域`, '成功')
}

// 清除本次临时选择
function clearTempRegions() {
  tempRegions.value = []
  selectionRect.value = null
  toast.info('已清除本次选择', '提示')
}

// 开始选择
function handleSelectionStart(event: MouseEvent) {
  const img = screenshotImageRef.value
  if (!img) return

  const rect = img.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // 检查是否在图片范围内
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
    return
  }

  isSelecting.value = true
  selectionStart.value = { x, y }
  selectionRect.value = { x, y, w: 0, h: 0 }
}

// 移动选择
function handleSelectionMove(event: MouseEvent) {
  if (!isSelecting.value || !selectionStart.value) return

  const img = screenshotImageRef.value
  if (!img) return

  const rect = img.getBoundingClientRect()
  const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height))

  const startX = selectionStart.value.x
  const startY = selectionStart.value.y

  const x1 = Math.min(startX, x)
  const y1 = Math.min(startY, y)
  const x2 = Math.max(startX, x)
  const y2 = Math.max(startY, y)

  selectionRect.value = {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1
  }
}

// 结束选择
function handleSelectionEnd(event: MouseEvent) {
  if (!isSelecting.value || !selectionRect.value) return

  // 最小尺寸检查（至少 10x10 像素）
  if (selectionRect.value.w < 10 || selectionRect.value.h < 10) {
    selectionRect.value = null
    isSelecting.value = false
    selectionStart.value = null
    return
  }

  // 转换为归一化坐标（0-1），使用图片实际显示尺寸而非容器尺寸
  const img = screenshotImageRef.value
  const rect = img?.getBoundingClientRect()
  const imageWidth = rect?.width || 1
  const imageHeight = rect?.height || 1
  const normalizedRegion = {
    x: selectionRect.value.x / imageWidth,
    y: selectionRect.value.y / imageHeight,
    w: selectionRect.value.w / imageWidth,
    h: selectionRect.value.h / imageHeight
  }

  // 添加到临时区域列表
  tempRegions.value.push(normalizedRegion)

  // 重置选择状态
  selectionRect.value = null
  isSelecting.value = false
  selectionStart.value = null
}

// 鼠标离开容器
function handleSelectionLeave() {
  if (isSelecting.value) {
    // 如果正在选择，完成选择
    handleSelectionEnd(new MouseEvent('mouseup') as any)
  }
}

// 确认选择 - 将临时区域添加到已保存列表
function confirmSelection() {
  if (tempRegions.value.length === 0) return

  // 添加所有临时区域
  tempRegions.value.forEach(region => {
    addRegion({ ...region, desc: `水印${regions.value.length + 1}` })
  })

  // 保存到视频
  if (props.video) {
    saveToVideo(props.video)
    // 持久化保存到本地存储
    if (props.listId) {
      localVideoStorage.updateVideoInLocalList(
        props.listId,
        props.video.id,
        { watermarks: props.video.watermarks }
      )
    }
  }

  toast.success(`已添加 ${tempRegions.value.length} 个水印区域到列表`, '成功')
  // 清空临时选择
  tempRegions.value = []
}

// 格式化选择区域百分比，使用图片实际显示尺寸而非容器尺寸
function formatRectPercent(rect: { x: number; y: number; w: number; h: number }): string {
  const img = screenshotImageRef.value
  const imgRect = img?.getBoundingClientRect()
  const imageWidth = imgRect?.width || 1
  const imageHeight = imgRect?.height || 1

  const x = Math.round((rect.x / imageWidth) * 100)
  const y = Math.round((rect.y / imageHeight) * 100)
  const w = Math.round((rect.w / imageWidth) * 100)
  const h = Math.round((rect.h / imageHeight) * 100)

  return `x:${x}% y:${y}% w:${w}% h:${h}%`
}

// 获取水印区域叠加层样式，使用图片实际显示尺寸而非容器尺寸
function getOverlayStyle(region: { x: number; y: number; w: number; h: number }) {
  const img = screenshotImageRef.value
  const container = screenshotContainerRef.value
  const imgRect = img?.getBoundingClientRect()
  const containerRect = container?.getBoundingClientRect()
  const imageWidth = imgRect?.width || 1
  const imageHeight = imgRect?.height || 1

  // 计算图片相对于容器的偏移（考虑 object-fit: contain）
  const offsetX = imgRect ? imgRect.left - containerRect.left : 0
  const offsetY = imgRect ? imgRect.top - containerRect.top : 0

  return {
    left: `${offsetX + region.x * imageWidth}px`,
    top: `${offsetY + region.y * imageHeight}px`,
    width: `${region.w * imageWidth}px`,
    height: `${region.h * imageHeight}px`
  }
}

// 处理删除区域
function handleDeleteRegion(id: string) {
  removeRegion(id)
  if (props.video) {
    saveToVideo(props.video)
    // 持久化保存到本地存储
    if (props.listId) {
      localVideoStorage.updateVideoInLocalList(
        props.listId,
        props.video.id,
        { watermarks: props.video.watermarks }
      )
    }
  }
  toast.success('水印区域已删除', '成功')
}

// 处理清空区域
function handleClearRegions() {
  if (regions.value.length === 0) return
  deleteConfirmMessage.value = `确定要清空所有 ${regions.value.length} 个水印区域吗？`
  pendingDeletePresetId.value = null
  pendingClearRegions.value = true
  showDeleteConfirm.value = true
}

// 确认删除操作
function confirmDelete() {
  showDeleteConfirm.value = false

  if (pendingDeletePresetId.value) {
    deletePreset(pendingDeletePresetId.value)
    toast.success('预设已删除', '成功')
    pendingDeletePresetId.value = null
  }

  if (pendingClearRegions.value) {
    clearRegions()
    if (props.video) {
      saveToVideo(props.video)
      // 持久化保存到本地存储
      if (props.listId) {
        localVideoStorage.updateVideoInLocalList(
          props.listId,
          props.video.id,
          { watermarks: props.video.watermarks }
        )
      }
    }
    toast.success('所有水印区域已清空', '成功')
    pendingClearRegions.value = false
  }
}

// 监听视频变化
watch(() => props.video, (newVideo) => {
  if (newVideo) {
    loadFromVideo(newVideo)
  }
}, { immediate: true })

// 监听 hover 状态变化（从遮罩层同步过来）
watch(hoveredRegionId, (newId) => {
  emit('hoverRegion', newId)
})

// 监听预设选择变化
watch(selectedPresetId, (newValue, oldValue) => {
  // 避免初始化时和相同值时重复触发
  if (newValue && newValue !== oldValue) {
    const preset = presets.value.find(p => p.id === newValue)
    if (preset) {
      regions.value = preset.regions.map(r => ({
        ...r,
        id: `wm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
      if (props.video) {
        saveToVideo(props.video)
        // 持久化保存到本地存储
        if (props.listId) {
          localVideoStorage.updateVideoInLocalList(
            props.listId,
            props.video.id,
            { watermarks: props.video.watermarks }
          )
        }
      }
    }
  }
})

// 暴露方法供父组件调用
defineExpose({
  addRegionFromOverlay: (region: Omit<WatermarkRegion, 'id'>) => {
    addRegion(region)
    if (props.video) {
      saveToVideo(props.video)
      // 持久化保存到本地存储
      if (props.listId) {
        localVideoStorage.updateVideoInLocalList(
          props.listId,
          props.video.id,
          { watermarks: props.video.watermarks }
        )
      }
    }
    toast.success('水印区域已添加', '成功')
  }
})
</script>

<style scoped src="./WatermarkTab.css"></style>
