<template>
  <div
    class="media-preview-content flex items-center justify-center overflow-hidden rounded-lg bg-black"
    :style="{ width: width + 'px', height: height + 'px' }"
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

    <!-- 图片预览：缩略图/原图 -->
    <MediaThumbnail
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded && kind === 'image'"
      :file-id="item.id"
      :file="item"
      :src="imageSrc"
      :filename="item.name"
      :alt="item.name"
      img-class="max-w-full max-h-full w-auto h-auto object-contain"
    >
      <template #fallback>
        <StatusImage name="load_failed" size="small" img-class="text-destructive" />
      </template>
    </MediaThumbnail>

    <!-- 视频预览：复用 VideoPreview（Plyr 驱动，自动循环播放）-->
    <VideoPreview
      v-else-if="!selectedViewer && !customHoverCard && viewersLoaded && kind === 'video'"
      ref="videoPreviewRef"
      :src="videoSrc"
      :muted="muted"
      class="h-full w-full"
      @error="onVideoError"
    />

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
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import VideoPreview from '@renderer/components/common/VideoPreview.vue'
import StatusImage from '@renderer/components/common/StatusImage.vue'
import PluginIcon from '@renderer/components/common/PluginIcon.vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import {
  getCacheBustedPreviewImageSource,
  getMediaFileUrl,
  getFileTypeIcon,
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

/** 按 mime 类型分发预览内容 */
const kind = computed<'image' | 'video' | 'audio' | 'unknown'>(() => {
  const mime = (props.item.mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'unknown'
})

/** 图片预览源：原图（带缓存破坏），保证预览清晰而非使用裁切缩略图 */
const imageSrc = computed(() => getCacheBustedPreviewImageSource(props.item) || '')

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
  renderCustomHoverCard()
  if (kind.value === 'video') {
    nextTick(() => setTimeout(playVideo, 100))
  }
})

watch([customHoverCard, () => props.item.id], async () => {
  await loadPreviewViewers()
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
</style>
