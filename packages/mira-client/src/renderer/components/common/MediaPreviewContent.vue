<template>
  <div
    class="media-preview-content flex items-center justify-center overflow-hidden rounded-lg bg-black"
    :style="{ width: width + 'px', height: height + 'px' }"
  >
    <!-- 图片预览：复用 MediaThumbnail（懒加载 / fallback / 缩略图更新事件）-->
    <MediaThumbnail
      v-if="kind === 'image'"
      :file-id="item.id"
      :src="imageSrc"
      :filename="item.name"
      :alt="item.name"
      img-class="max-w-full max-h-full w-auto h-auto object-contain"
    />

    <!-- 视频预览：复用 VideoPreview（Plyr 驱动，自动循环播放）-->
    <VideoPreview
      v-else-if="kind === 'video'"
      ref="videoPreviewRef"
      :src="videoSrc"
      :muted="muted"
      class="h-full w-full"
      @error="onVideoError"
    />

    <!-- 音频预览：原生 audio（与项目音频卡片一致，不引入 Plyr）-->
    <div
      v-else-if="kind === 'audio'"
      class="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-white"
    >
      <span class="material-icons text-primary" style="font-size: 3rem;">volume_up</span>
      <p class="max-w-full truncate text-xs text-muted-foreground" :title="item.name">{{ item.name }}</p>
      <audio :src="videoSrc" controls preload="metadata" class="w-full max-w-xs" />
    </div>

    <!-- 未知类型：文件类型图标 + 文件名 -->
    <div
      v-else
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
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import VideoPreview from '@renderer/components/common/VideoPreview.vue'
import {
  getCacheBustedPreviewImageSource,
  getMediaFileUrl,
  getFileTypeIcon,
} from '@renderer/utils/fileUtils'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'

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
  if (kind.value === 'video') {
    nextTick(() => setTimeout(playVideo, 100))
  }
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
  pauseVideo()
})
</script>

<style scoped>
.media-preview-content {
  /* 让 portal 内容渲染在卡片之上 */
  position: relative;
}
</style>
