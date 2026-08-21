<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="watermark-edit-dialog !max-w-none !w-[80vw]">
      <DialogHeader>
        <div class="dialog-title-section">
          <h3>编辑水印区域</h3>
          <p class="dialog-description">在截图上拖拽框选水印位置，完成后点击确定添加到列表</p>
        </div>
      </DialogHeader>

      <div class="dialog-body">
        <!-- 截图区域 -->
        <div class="screenshot-section">
          <!-- Tab 导航 -->
          <div class="tab-nav">
            <button
              :class="['tab-button', { active: activeTab === 'edit' }]"
              @click="activeTab = 'edit'"
            >
              ✏️ 水印编辑
            </button>
            <button
              :class="['tab-button', { active: activeTab === 'preview', loading: isPreviewGenerating }]"
              @click="handlePreviewTabClick"
            >
              {{ isPreviewGenerating ? '生成中...' : '👁️ 水印预览' }}
            </button>
          </div>

          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner">⏳</div>
            <span>正在截取视频帧...</span>
          </div>
          <div v-else-if="screenshotUrl" class="screenshot-container">
            <!-- 编辑 Tab -->
            <div
              v-show="activeTab === 'edit'"
              ref="screenshotContainerRef"
              class="screenshot-wrapper"
              :key="'edit-' + (selectedRegions.length)"
              @mousedown="handleSelectionStart"
              @mousemove="handleSelectionMove"
              @mouseup="handleSelectionEnd"
              @mouseleave="handleSelectionLeave"
            >
              <img
                ref="screenshotImageRef"
                :src="screenshotUrl"
                :key="'img-' + activeTab"
                alt="视频截图"
                class="screenshot-image"
                draggable="false"
                @load="handleImageLoad"
              />
              <!-- 当前选择框 -->
              <div
                v-if="selectionRect"
                class="selection-rect"
                :style="selectionRectStyle"
              />
              <!-- 已框选的区域叠加层 -->
              <div
                v-for="(region, index) in selectedRegions"
                :key="'region-' + index + '-' + overlayKey"
                class="watermark-overlay-rect"
                :style="getOverlayStyle(region)"
              >
                <span class="overlay-label">{{ index + 1 }}</span>
                <button
                  class="overlay-delete"
                  @click.stop="removeRegion(index)"
                  title="删除此区域"
                >
                  ×
                </button>
              </div>
            </div>

            <!-- 预览 Tab -->
            <div v-show="activeTab === 'preview'" class="screenshot-wrapper preview-wrapper">
              <img
                v-if="previewImageUrl"
                :src="previewImageUrl"
                alt="水印预览效果"
                class="screenshot-image"
                draggable="false"
              />
              <div v-else class="no-preview-state">
                <span class="no-preview-icon">📷</span>
                <span class="no-preview-text">点击右上角"生成预览"按钮查看水印去除效果</span>
              </div>
            </div>
          </div>
          <div v-else class="error-state">
            <span class="error-icon">⚠️</span>
            <span class="error-text">无法生成截图，请重试</span>
          </div>

          <!-- 视频进度条（仅当有 videoUrl 时显示） -->
          <div v-if="encodedVideoUrl" class="video-progress-container">
            <video
              ref="videoElement"
              :src="encodedVideoUrl"
              class="hidden-video"
              @loadedmetadata="handleVideoLoaded"
              @canplay="handleVideoCanPlay"
              @error="handleVideoError"
            />
            <div class="video-progress-bar" @click="handleProgressClick">
              <div
                class="progress-thumb"
                :style="{ left: `${((props.currentTime || 0) / videoDuration) * 100}%` }"
              />
            </div>
            <div class="progress-time">
              <span>{{ formatTime(props.currentTime || 0) }}</span>
              <span>{{ formatTime(videoDuration) }}</span>
            </div>
          </div>
        </div>

        <!-- 框选列表（横向滚动） -->
        <div class="regions-list-section">
          <div class="regions-list-header">
            <h4>已框选区域 ({{ selectedRegions.length }})</h4>
            <Button
              @click="clearAllRegions"
              :disabled="selectedRegions.length === 0"
              variant="outline"
              size="sm"
            >
              清空全部
            </Button>
          </div>
          <div class="regions-list-scroll">
            <div v-if="selectedRegions.length === 0" class="empty-regions">
              暂无框选区域，在上方截图上拖拽选择
            </div>
            <div v-else class="regions-list">
              <div
                v-for="(region, index) in selectedRegions"
                :key="'list-' + index"
                class="region-item"
              >
                <div class="region-number">{{ index + 1 }}</div>
                <div class="region-info">
                  <span class="region-coords">
                    x:{{ formatPercent(region.x) }} y:{{ formatPercent(region.y) }}
                    w:{{ formatPercent(region.w) }} h:{{ formatPercent(region.h) }}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  @click="removeRegion(index)"
                  class="btn-delete"
                  title="删除"
                >
                  🗑️
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleCancel">取消</Button>
        <Button
          @click="handleConfirm"
          :disabled="selectedRegions.length === 0"
          variant="default"
        >
          确定 (添加 {{ selectedRegions.length }} 个区域)
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { VideoData } from '@/types/video-editor'
import type { WatermarkRegion } from '@/types/watermark'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from 'mira-plugin-ui/src/components/ui/dialog'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { toast } from '@/lib/toast'
import { getTempDir } from '@/lib/exec'
import { generateThumbnail as ffmpegGenerateThumbnail, generateWatermarkPreview as ffmpegWatermarkPreview } from '@/lib/ffmpeg'
import { isHostAvailable } from '@/lib/host'
import { pathJoin, toFileUrl, fromFileUrl } from '@/lib/path'

// Props
const props = defineProps<{
  open: boolean
  video: VideoData | null
  currentTime?: number
  savedRegions?: WatermarkRegion[]
  videoUrl?: string  // 视频URL，用于显示进度条
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', regions: Array<{ x: number; y: number; w: number; h: number }>, isManualDraw: boolean): void
  (e: 'update:currentTime', value: number): void
}>()

// 状态
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const isLoading = ref(false)
const isPreviewGenerating = ref(false)
const activeTab = ref<'edit' | 'preview'>('edit')
const screenshotUrl = ref<string | null>(null)
const previewImageUrl = ref<string | null>(null)
const screenshotContainerRef = ref<HTMLElement | null>(null)
const screenshotImageRef = ref<HTMLImageElement | null>(null)
const selectionRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const isSelecting = ref(false)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const selectedRegions = ref<Array<{ x: number; y: number; w: number; h: number }>>([])
/** 标记当前区域是否是用户手动绘制的（用于区分手动绘制和应用预设） */
const isManualDraw = ref(true)
const overlayKey = ref(0) // 用于强制刷新叠加层
const videoDuration = ref<number>(0) // 视频总时长（秒）
const videoElement = ref<HTMLVideoElement | null>(null) // 用于获取视频时长的引用

// 图片显示尺寸的响应式状态
const imageDisplayState = ref({
  width: 0,
  height: 0,
  offsetX: 0,
  offsetY: 0
})

// 对视频URL进行编码处理，确保 # 等特殊字符被正确编码
const encodedVideoUrl = computed(() => {
  if (!props.videoUrl) return null
  // 直接替换 # 为 %23，避免被浏览器解析为URL片段标识符
  return props.videoUrl.replace(/#/g, '%23')
})

// 计算属性
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

// 格式化时间（秒 -> MM:SS）
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 处理视频元数据加载
function handleVideoLoaded() {
  const video = videoElement.value
  console.log('[WatermarkEditDialog] handleVideoLoaded - video:', video, 'duration:', video?.duration)
  if (video) {
    videoDuration.value = video.duration
  }
}

// 处理视频可以播放
function handleVideoCanPlay(event: Event) {
  const video = event.target as HTMLVideoElement
  console.log('[WatermarkEditDialog] handleVideoCanPlay - video:', video, 'duration:', video?.duration)
  if (video && video.duration > 0) {
    videoDuration.value = video.duration
  }
}

// 处理视频加载错误
function handleVideoError(event: Event) {
  const video = event.target as HTMLVideoElement
  console.error('[WatermarkEditDialog] Video load error:', video?.error)
  console.error('[WatermarkEditDialog] Video src:', video?.src)
  toast.error('视频加载失败，无法显示进度条', '错误')
}

// 处理进度条点击
async function handleProgressClick(event: MouseEvent) {
  const progressBar = event.currentTarget as HTMLElement
  if (!progressBar || videoDuration.value === 0) return

  // 计算点击位置对应的时间
  const rect = progressBar.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = Math.max(0, Math.min(1, clickX / rect.width))
  const newTime = percentage * videoDuration.value

  // 通知父组件更新当前时间
  emit('update:currentTime', newTime)

  // 生成新时间点的截图
  await captureScreenshotAtTime(newTime)
}

// 在指定时间截取视频帧
async function captureScreenshotAtTime(timestamp: number): Promise<void> {
  if (!props.video) {
    toast.warning('请先选择一个视频', '提示')
    return
  }

  // 检查是否在 Electron 环境中
  if (!isHostAvailable()) {
    toast.info('此功能需要在 Mira 客户端的插件窗口中使用', '提示')
    return
  }

  isLoading.value = true

  try {
    // 清理视频路径
    let videoPath = props.video.path
    if (!videoPath) {
      throw new Error('视频路径未设置，请确保文件是通过文件对话框添加的')
    }
    if (/^(file|local-resource):\/\//i.test(videoPath)) {
      videoPath = fromFileUrl(videoPath)
    } else if (videoPath.startsWith('blob:')) {
      toast.error('无法为 Blob 视频生成截图', '提示')
      isLoading.value = false
      return
    }

    // 获取临时目录
    const editTempDir = await getTempDir('watermark-edit')

    // 生成截图文件名
    const screenshotFileName = `edit_${Date.now()}.jpg`
    const screenshotPath = pathJoin(editTempDir, screenshotFileName)

    // 调用 IPC 生成截图
    await ffmpegGenerateThumbnail({
      inputPath: videoPath,
      outputPath: screenshotPath,
      timestamp: timestamp
    })

    // 设置截图 URL
    screenshotUrl.value = toFileUrl(screenshotPath)
    toast.success(`已截取 ${formatTime(timestamp)} 的视频帧`, '提示')

    // 等待 DOM 更新，确保新 URL 已应用到 img 元素
    await nextTick()

    // 等待新图片加载完成
    await new Promise<void>((resolve) => {
      const img = screenshotImageRef.value
      if (!img) {
        resolve()
        return
      }

      // 如果图片已经加载完成（自然宽度大于0），直接返回
      if (img.complete && img.naturalWidth > 0) {
        resolve()
        return
      }

      // 等待图片加载事件
      const onLoad = () => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onError)
        resolve()
      }

      const onError = () => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onError)
        resolve()
      }

      img.addEventListener('load', onLoad)
      img.addEventListener('error', onError)
    })
    // 水印叠加层位置由 img @load 事件自动更新
  } catch (error) {
    console.error('生成截图失败:', error)
    toast.error('生成截图失败: ' + (error as Error).message, '错误')
  } finally {
    isLoading.value = false
  }
}

// 获取水印区域叠加层样式，使用图片实际显示尺寸
function getOverlayStyle(region: { x: number; y: number; w: number; h: number }) {
  const { width, height, offsetX, offsetY } = imageDisplayState.value

  // 如果尺寸为0，返回隐藏样式
  if (width === 0 || height === 0) {
    return {
      display: 'none'
    }
  }

  // 归一化坐标转换为显示尺寸像素值
  return {
    left: `${offsetX + region.x * width}px`,
    top: `${offsetY + region.y * height}px`,
    width: `${region.w * width}px`,
    height: `${region.h * height}px`
  }
}

// 更新图片显示状态（尺寸和偏移）
function updateImageDisplayState() {
  const img = screenshotImageRef.value
  const container = screenshotContainerRef.value

  if (!img || !container) {
    imageDisplayState.value = { width: 0, height: 0, offsetX: 0, offsetY: 0 }
    return
  }

  const imgRect = img.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  imageDisplayState.value = {
    width: imgRect.width,
    height: imgRect.height,
    offsetX: imgRect.left - containerRect.left,
    offsetY: imgRect.top - containerRect.top
  }
}

// 图片加载完成后更新水印叠加层位置
function handleImageLoad() {
  updateImageDisplayState()
  overlayKey.value++
}

// 生成截图
async function captureScreenshot(): Promise<void> {
  if (!props.video) {
    toast.warning('请先选择一个视频', '提示')
    return
  }

  // 检查是否在 Electron 环境中
  if (!isHostAvailable()) {
    toast.info('此功能需要在 Mira 客户端的插件窗口中使用', '提示')
    return
  }

  isLoading.value = true
  screenshotUrl.value = null
  // 注意：不在这里清空 selectedRegions，因为需要保留已保存的区域

  try {
    // 清理视频路径
    let videoPath = props.video.path
    // 检查视频路径是否存在
    if (!videoPath) {
      throw new Error('视频路径未设置，请确保文件是通过文件对话框添加的')
    }
    if (/^(file|local-resource):\/\//i.test(videoPath)) {
      videoPath = fromFileUrl(videoPath)
    } else if (videoPath.startsWith('blob:')) {
      toast.error('无法为 Blob 视频生成截图', '提示')
      isLoading.value = false
      return
    }

    // 获取临时目录
    const editTempDir = await getTempDir('watermark-edit')

    // 生成截图文件名
    const timestamp = props.currentTime || 0
    const screenshotFileName = `edit_${Date.now()}.jpg`
    const screenshotPath = pathJoin(editTempDir, screenshotFileName)

    // 调用 IPC 生成截图
    // 不指定尺寸，让 FFmpeg 使用视频原始尺寸，保持原始宽高比
    await ffmpegGenerateThumbnail({
      inputPath: videoPath,
      outputPath: screenshotPath,
      timestamp: timestamp
    })

    // 设置截图 URL
    screenshotUrl.value = toFileUrl(screenshotPath)
  } catch (error) {
    console.error('生成截图失败:', error)
    toast.error('生成截图失败: ' + (error as Error).message, '错误')
  } finally {
    isLoading.value = false
  }
}

// 截取视频帧并添加水印预览效果
async function handleCaptureWithPreview() {
  if (!props.video) {
    toast.warning('请先选择一个视频', '提示')
    return
  }

  // 检查是否在 Electron 环境中
  if (!isHostAvailable()) {
    toast.info('此功能需要在 Mira 客户端的插件窗口中使用', '提示')
    return
  }

  // 如果没有选择的水印区域，提示用户
  if (selectedRegions.value.length === 0) {
    toast.warning('请先框选水印区域', '提示')
    return
  }

  // 确保编辑截图已加载
  if (!screenshotUrl.value) {
    toast.warning('请等待截图加载完成', '提示')
    return
  }

  isPreviewGenerating.value = true

  try {
    // 清理视频路径
    let videoPath = props.video.path
    if (/^(file|local-resource):\/\//i.test(videoPath)) {
      videoPath = fromFileUrl(videoPath)
    } else if (videoPath.startsWith('blob:')) {
      toast.error('无法为 Blob 视频生成截图', '提示')
      isPreviewGenerating.value = false
      return
    }

    // 获取临时目录
    const editTempDir = await getTempDir('watermark-edit')

    // 生成截图文件名
    const timestamp = props.currentTime || 0
    const screenshotFileName = `watermark_preview_${Date.now()}.jpg`
    const screenshotPath = pathJoin(editTempDir, screenshotFileName)

    // 不指定尺寸，让 FFmpeg 使用视频原始尺寸，保持原始宽高比
    // 这样确保编辑截图和预览截图使用相同的原始尺寸
    await ffmpegWatermarkPreview({
      inputPath: videoPath,
      outputPath: screenshotPath,
      timestamp: timestamp,
      regions: selectedRegions.value.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }))
    })

    // 设置预览图片 URL
    previewImageUrl.value = toFileUrl(screenshotPath)
    // 自动切换到预览 tab
    activeTab.value = 'preview'
    toast.success('预览图生成成功，展示了水印去除效果', '提示')
  } catch (error) {
    console.error('生成预览截图失败:', error)
    toast.error('生成预览截图失败: ' + (error as Error).message, '错误')
  } finally {
    isPreviewGenerating.value = false
  }
}

// 处理点击预览 tab
async function handlePreviewTabClick() {
  if (activeTab.value === 'preview') {
    // 如果已经在预览 tab，切换回编辑 tab
    activeTab.value = 'edit'
    // 强制刷新叠加层样式
    await nextTick()
    overlayKey.value++
    return
  }

  // 检查是否在 Electron 环境中
  if (!isHostAvailable()) {
    toast.info('此功能需要在 Mira 客户端的插件窗口中使用', '提示')
    return
  }

  // 如果没有选择的水印区域，提示用户
  if (selectedRegions.value.length === 0) {
    toast.warning('请先框选水印区域', '提示')
    return
  }

  // 每次点击预览 tab 都重新生成预览，使用最新的框选区域
  await handleCaptureWithPreview()
}

// 开始选择
function handleSelectionStart(event: MouseEvent) {
  const img = screenshotImageRef.value
  if (!img) return

  const rect = img.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

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

  // 转换为归一化坐标（0-1），使用图片实际显示尺寸
  const img = screenshotImageRef.value
  const rect = img?.getBoundingClientRect()
  const displayWidth = rect?.width || 1
  const displayHeight = rect?.height || 1

  // 归一化坐标
  const normalizedRegion = {
    x: selectionRect.value.x / displayWidth,
    y: selectionRect.value.y / displayHeight,
    w: selectionRect.value.w / displayWidth,
    h: selectionRect.value.h / displayHeight
  }

  // 添加到已选择区域列表
  selectedRegions.value.push(normalizedRegion)
  // 标记为手动绘制
  isManualDraw.value = true

  // 重置选择状态
  selectionRect.value = null
  isSelecting.value = false
  selectionStart.value = null
}

// 鼠标离开容器
function handleSelectionLeave() {
  if (isSelecting.value) {
    handleSelectionEnd(new MouseEvent('mouseup') as any)
  }
}

// 删除单个区域
function removeRegion(index: number) {
  selectedRegions.value.splice(index, 1)
}

// 清空所有区域
function clearAllRegions() {
  selectedRegions.value = []
  toast.info('已清空所有框选区域', '提示')
}

// 确认
function handleConfirm() {
  emit('confirm', selectedRegions.value, isManualDraw.value)
  isOpen.value = false
}

// 取消
function handleCancel() {
  isOpen.value = false
}

// 等待图片加载完成
function waitForImageLoad(): Promise<void> {
  return new Promise((resolve) => {
    const img = screenshotImageRef.value
    if (!img) {
      resolve()
      return
    }

    // 如果图片已经加载完成，直接返回
    if (img.complete && img.naturalWidth > 0) {
      resolve()
      return
    }

    // 否则等待图片加载事件
    img.addEventListener('load', () => resolve(), { once: true })
    // 同时监听错误，避免无限等待
    img.addEventListener('error', () => resolve(), { once: true })
  })
}

// 监听对话框打开状态
watch(() => props.open, async (newValue) => {
  console.log('[WatermarkEditDialog] Dialog open state changed:', newValue)
  console.log('[WatermarkEditDialog] props.videoUrl:', props.videoUrl)
  console.log('[WatermarkEditDialog] props.video:', props.video)
  console.log('[WatermarkEditDialog] props.video?.path:', props.video?.path)

  if (newValue && props.video) {
    // 重置视频时长，确保使用新的视频信息
    videoDuration.value = 0
    console.log('[WatermarkEditDialog] Reset videoDuration to 0')

    // 加载已保存的区域并截图
    await nextTick()
    // 先截图，然后等待图片加载完成，最后加载已保存的区域
    await captureScreenshot()
    await waitForImageLoad()
    // 水印叠加层位置由 img @load 事件自动更新

    // 加载已保存的水印区域
    if (props.savedRegions && props.savedRegions.length > 0) {
      selectedRegions.value = props.savedRegions.map(r => ({
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h
      }))
      // 强制刷新叠加层样式
      await nextTick()
      overlayKey.value++
    }
  } else {
    // 对话框关闭时，清空数据
    selectedRegions.value = []
    isManualDraw.value = true // 重置为手动绘制模式
    screenshotUrl.value = null
    previewImageUrl.value = null
    selectionRect.value = null
    activeTab.value = 'edit'
    overlayKey.value = 0
    videoDuration.value = 0 // 重置视频时长
    imageDisplayState.value = { width: 0, height: 0, offsetX: 0, offsetY: 0 } // 重置图片显示状态
  }
})

// 监控 videoElement 引用变化
watch(videoElement, (newElement) => {
  console.log('[WatermarkEditDialog] videoElement changed:', newElement)
  if (newElement) {
    console.log('[WatermarkEditDialog] videoElement src:', newElement.src)
    console.log('[WatermarkEditDialog] videoElement readyState:', newElement.readyState)
  }
})

// 监控 props.videoUrl 和编码后URL的变化
watch(() => props.videoUrl, (newUrl) => {
  console.log('[WatermarkEditDialog] props.videoUrl changed:', newUrl)
  console.log('[WatermarkEditDialog] encodedVideoUrl:', encodedVideoUrl.value)
  console.log('[WatermarkEditDialog] current videoDuration:', videoDuration.value)
  console.log('[WatermarkEditDialog] Should show progress bar:', !!(encodedVideoUrl.value && videoDuration.value > 0))
}, { immediate: true })

// 窗口大小变化时更新图片显示状态
function handleResize() {
  if (screenshotUrl.value && activeTab.value === 'edit') {
    updateImageDisplayState()
    overlayKey.value++
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

</script>

<style scoped src="./WatermarkEditDialog.css"></style>
