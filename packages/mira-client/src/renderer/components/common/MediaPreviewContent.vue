<template>
  <div
    class="media-preview-content flex items-center justify-center overflow-hidden rounded-lg"
    :class="{ 'bg-black': kind !== 'image' }"
    :style="{ width: containerSize.width + 'px', height: containerSize.height + 'px' }"
  >
    <div v-if="customHoverCard && !selectedViewer" ref="customContainer" class="h-full w-full" />

    <!-- 插件预览器 -->
    <template v-if="selectedViewer">
      <iframe
        :src="selectedViewer.iframeUrl"
        class="h-full w-full border-0 bg-white"
        :title="selectedViewer.title"
      />
      <div
        v-if="viewers.length > 1"
        class="absolute right-1 top-1 bottom-1 flex flex-col gap-1 rounded bg-black/50 p-1"
      >
        <button
          v-for="(viewer, index) in viewers"
          :key="viewer.viewerId"
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded text-white transition-colors hover:bg-white/20"
          :class="{ 'bg-white/25': index === selectedViewerIndex }"
          :title="viewer.title"
          :aria-label="viewer.title"
          @click.stop="selectedViewerIndex = index"
        >
          <PluginIcon
            :plugin-id="viewer.pluginId"
            :icon="viewer.icon"
            :name="viewer.pluginName"
            :size="20"
          />
        </button>
      </div>
    </template>

    <!-- 图片预览：viewerjs 内嵌查看器，支持滚轮缩放 -->
    <VViewer
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded && kind === 'image'"
      :key="imageSrc"
      :options="viewerOptions"
      class="media-preview-viewer h-full w-full"
    >
      <img :src="imageSrc" :alt="item.name" class="media-preview-viewer-source" />
    </VViewer>

    <!-- 视频预览：复用 VideoPreview（Plyr 驱动，自动循环播放）-->
    <VideoPreview
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded && kind === 'video'"
      ref="videoPreviewRef"
      :src="videoSrc"
      :muted="muted"
      fit="contain"
      class="h-full w-full"
      @error="onVideoError"
    />

    <!-- 文本文档预览：txt/md/json 等直接展示内容 -->
    <div
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded && kind === 'document' && isTextDocument"
      class="media-preview-text h-full w-full overflow-auto bg-white text-left"
      @click="onTextClick"
    >
      <MdPreview
        v-if="isMarkdown"
        :model-value="textContent"
        preview-theme="github"
        :sanitize="sanitizeHtml"
      />
      <pre v-else class="text-content-pre">{{ textContent }}</pre>
    </div>

    <!-- 文档预览：服务端生成的缩略图（pdf 等由 ImageMagick/Ghostscript 产出）-->
    <div
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded && kind === 'document' && documentThumbSrc"
      class="flex h-full w-full items-center justify-center"
    >
      <img :src="documentThumbSrc" :alt="item.name" class="max-h-full max-w-full object-contain" />
    </div>

    <!-- 音频预览：原生 audio（与项目音频卡片一致，不引入 Plyr）-->
    <div
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded && kind === 'audio'"
      class="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-white"
    >
      <span class="material-icons text-primary" style="font-size: 3rem;">volume_up</span>
      <p class="max-w-full truncate text-xs text-muted-foreground" :title="item.name">{{ item.name }}</p>
      <audio :src="videoSrc" controls preload="metadata" class="w-full max-w-xs" />
    </div>

    <!-- 未知类型：文件类型图标 + 文件名 -->
    <div
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded"
      class="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center text-white"
    >
      <img
        v-if="extIconUrl"
        :src="extIconUrl"
        class="h-16 w-16 object-contain opacity-80"
      />
      <span v-else class="material-icons text-muted-foreground" style="font-size: 3rem;">{{ fallbackIcon }}</span>
      <p class="max-w-full truncate text-xs text-muted-foreground" :title="item.name">{{ item.name }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import type { FileInfo } from '../../../shared/types'
import type { PreviewViewer } from 'mira-app-core/shared/sdk'
import { component as VViewer } from 'v-viewer'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import VideoPreview from '@renderer/components/common/VideoPreview.vue'
import PluginIcon from '@renderer/components/common/PluginIcon.vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import {
  getCacheBustedPreviewImageSource,
  getMediaFileUrl,
  getFileTypeIcon,
  getFileExtension,
  toFileUrl,
} from '@renderer/utils/fileUtils'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'
import { getPluginFileFormat } from '@renderer/plugins/instanceManager'

interface Props {
  item: FileInfo
  /** 预览区域宽度（px） */
  width?: number
  /** 预览区域高度（px） */
  height?: number
  /** 视频是否静音 */
  muted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 480,
  height: 320,
  muted: true,
})

const viewers = ref<PreviewViewer[]>([])
const selectedViewerIndex = ref(0)
const viewersLoaded = ref(false)
const selectedViewer = computed(() => viewers.value[selectedViewerIndex.value])

async function loadPreviewViewers() {
  viewersLoaded.value = false
  viewers.value = []
  selectedViewerIndex.value = 0
  if (!props.item.libraryId) {
    viewersLoaded.value = true
    return
  }
  try {
    viewers.value = await miraSDKService.getPreviewViewers(props.item.libraryId, props.item.id)
  } catch (error) {
    console.warn('MediaPreviewContent: failed to load preview viewers', error)
  } finally {
    viewersLoaded.value = true
  }
}

const customContainer = ref<HTMLElement | null>(null)
let customCleanup: (() => void) | void
const customHoverCard = computed(() => getPluginFileFormat(props.item)?.renderHoverCard)

function renderCustomHoverCard() {
  customCleanup?.()
  customCleanup = undefined
  if (!customContainer.value || !customHoverCard.value) return
  try {
    customCleanup = customHoverCard.value(customContainer.value, props.item)
  } catch (error) {
    console.error('Plugin hovercard renderer failed:', error)
  }
}

/** 文档扩展名：库中文件 mimeType 常缺失/为 octet-stream，以后缀为准 */
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf']

/** 按 mime/扩展名分发预览内容（document 判定与 FilePreviewView 保持一致）*/
const kind = computed<'image' | 'video' | 'audio' | 'document' | 'unknown'>(() => {
  const mime = (props.item.mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (DOCUMENT_EXTENSIONS.includes(getFileExtension(props.item.name || ''))
    || mime.includes('pdf') || mime.includes('document') || mime.startsWith('text/')) {
    return 'document'
  }
  return 'unknown'
})

/** 图片预览源：原图（带缓存破坏），保证预览清晰而非使用裁切缩略图 */
const imageSrc = computed(() => getCacheBustedPreviewImageSource(props.item) || '')

/** 文档预览源：服务端生成的缩略图，无缩略图时回落到文件图标兜底 */
const documentThumbSrc = computed(() => toFileUrl(props.item.thumbnailPath) || '')

// ---- 文本文档（txt/md/json 等）内容预览 ----
const TEXT_DOCUMENT_EXTENSIONS = ['txt', 'md', 'json', 'xml', 'csv', 'log']
const MAX_TEXT_PREVIEW_LENGTH = 100_000

const isTextDocument = computed(() => {
  const mime = (props.item.mimeType || '').toLowerCase()
  if (mime.startsWith('text/')) return true
  return TEXT_DOCUMENT_EXTENSIONS.includes(getFileExtension(props.item.name || ''))
})

const isMarkdown = computed(() => {
  const mime = (props.item.mimeType || '').toLowerCase()
  return getFileExtension(props.item.name || '') === 'md' || mime === 'text/markdown'
})

const textContent = ref('')

function applyTextContent(content: string) {
  textContent.value = content.length > MAX_TEXT_PREVIEW_LENGTH
    ? `${content.slice(0, MAX_TEXT_PREVIEW_LENGTH)}\n...`
    : content
}

async function loadTextContent() {
  textContent.value = ''
  if (kind.value !== 'document' || !isTextDocument.value) return
  try {
    // 优先走 HTTP 源；file:// 无法在 renderer fetch，回落 SDK 下载
    const remote = props.item.path || props.item.url
    if (remote && /^https?:\/\//.test(remote)) {
      const response = await fetch(remote)
      if (response.ok) {
        applyTextContent(await response.text())
        return
      }
    }
    if (props.item.libraryId && props.item.id) {
      const blob = await miraSDKService.downloadFile(props.item.libraryId, props.item.id)
      applyTextContent(await blob.text())
    }
  } catch (error) {
    console.warn('MediaPreviewContent: failed to load text content', error)
  }
}

// md-editor-v3 的 sanitize 默认恒等，官方要求调用方注入清洗逻辑
const sanitizeHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, style, link, meta, form').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name)
      } else if (['href', 'src', 'xlink:href'].includes(attr.name) && !/^(https?:|mailto:|#)/i.test(attr.value.trim())) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

// 链接统一新窗口打开，避免劫持当前 webContents 导航
const onTextClick = (e: MouseEvent) => {
  const anchor = (e.target as HTMLElement).closest('a[href]')
  if (!anchor) return
  const href = anchor.getAttribute('href') || ''
  if (/^https?:\/\//i.test(href)) {
    e.preventDefault()
    window.open(href, '_blank')
  }
}

/** 图片自然尺寸（预加载得到），用于容器等比缩放 */
const imageDim = ref<{ w: number; h: number } | null>(null)

watch([imageSrc, documentThumbSrc, kind], () => {
  imageDim.value = null
  if (kind.value !== 'image' && kind.value !== 'document') return
  const src = kind.value === 'document' ? documentThumbSrc.value : imageSrc.value
  if (!src) return
  const img = new Image()
  img.onload = () => {
    imageDim.value = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height }
  }
  img.src = src
}, { immediate: true })

/** 容器尺寸：图片和视频按媒体比例缩放到 width/height 上限内。 */
const containerSize = computed(() => {
  if (kind.value === 'video') {
    const width = Number(props.item.metadata?.width)
    const height = Number(props.item.metadata?.height)
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
      const ratio = Math.min(props.width / width, props.height / height)
      return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
      }
    }
  }

  if ((kind.value !== 'image' && kind.value !== 'document') || !imageDim.value || !imageDim.value.w || !imageDim.value.h) {
    return { width: props.width, height: props.height }
  }
  const ratio = Math.min(props.width / imageDim.value.w, props.height / imageDim.value.h, 1)
  return {
    width: Math.round(imageDim.value.w * ratio),
    height: Math.round(imageDim.value.h * ratio),
  }
})

/** viewerjs 内嵌查看器配置：zoomable + 默认 zoomOnWheel 启用滚轮缩放 */
const viewerOptions = {
  inline: true,
  button: false,
  navbar: false,
  title: false,
  toolbar: false,
  tooltip: false,
  movable: true,
  zoomable: true,
  zoomOnWheel: true,
  rotatable: true,
  scalable: true,
  transition: false,
  keyboard: false,
  backdrop: true,
  focus: true,
}

/** 视频/音频预览源 */
const videoSrc = computed(() => getMediaFileUrl(props.item))

const fallbackIcon = computed(() => getFileTypeIcon(props.item.name || ''))
const extIconUrl = computed(() => getExtIconUrl(props.item.name || ''))

// ---- 视频自动播放 / 暂停 ----
type VideoPreviewAPI = { play?: () => unknown; pause?: () => void }
const videoPreviewRef = ref<VideoPreviewAPI | null>(null)

const playVideo = () => {
  try {
    videoPreviewRef.value?.play?.()
  } catch (error) {
    console.warn('MediaPreviewContent: video play failed', error)
  }
}

const pauseVideo = () => {
  try {
    videoPreviewRef.value?.pause?.()
  } catch (error) {
    // ignore
  }
}

const onVideoError = (error: Event) => {
  console.error('MediaPreviewContent: video error', error)
}

// 挂载后给 Plyr 一拍初始化时间再播放
onMounted(() => {
  loadPreviewViewers()
  loadTextContent()
  renderCustomHoverCard()
  if (kind.value === 'video') {
    nextTick(() => setTimeout(playVideo, 100))
  }
})

watch([customHoverCard, () => props.item.id], async () => {
  await loadPreviewViewers()
  loadTextContent()
  await nextTick()
  renderCustomHoverCard()
})

// 切换 item 时重置播放
watch(
  () => props.item.id,
  () => {
    if (kind.value === 'video') {
      nextTick(() => setTimeout(playVideo, 100))
    }
  }
)

onBeforeUnmount(() => {
  customCleanup?.()
  pauseVideo()
})
</script>

<style scoped>
.media-preview-content {
  /* 让 portal 内容渲染在卡片之上 */
  position: relative;
}

/* viewerjs 内嵌查看器：撑满容器，圆角跟随外层裁剪 */
.media-preview-viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
}
/* trigger 图片本身不参与显示 */
.media-preview-viewer-source {
  display: none;
}
.media-preview-viewer :deep(.viewer-container) {
  background: transparent;
  border-radius: inherit;
}
.media-preview-viewer :deep(.viewer-canvas) {
  background: transparent;
}

/* 文本文档预览：MdPreview 默认带主题背景色和大 padding，收窄以适配小卡片 */
.media-preview-text {
  --md-bk-color: transparent;
  font-size: 12px;
}
.media-preview-text :deep(.md-editor-preview-wrapper) {
  padding: 8px 12px;
}
.media-preview-text :deep(.md-editor-preview) {
  font-size: 12px;
  line-height: 1.6;
  color: #1f2937;
}
.media-preview-text :deep(.md-editor-preview :first-child) {
  margin-top: 0;
}
.media-preview-text :deep(.md-editor-preview :last-child) {
  margin-bottom: 0;
}
.media-preview-text .text-content-pre {
  margin: 0;
  padding: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #1f2937;
}
</style>
