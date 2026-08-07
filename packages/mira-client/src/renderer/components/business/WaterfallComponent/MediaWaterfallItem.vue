<template>
  <div
    :data-selectable-id="item.id"
    :data-file="getLocalFile(item)"
    :class="[
      'waterfall-card media-waterfall-item group relative cursor-pointer transition-all duration-200 rounded-xl overflow-hidden h-full w-full',
      isSelected
        ? 'is-selected'
        : 'shadow-sm hover:shadow-[0_12px_36px_rgba(99,102,241,0.15)] hover:-translate-y-0.5'
    ]"
    @click="handleClick"
  >
    <!-- 图片/视频容器 - Masonry 已通过定位框给定精确高度，内部直接 h-full 填满 -->
    <div
      class="relative w-full h-full"
      :style="mediaContainerStyle"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent="handleContextMenu"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @mousemove="handleMouseMove"
      @pointerdown="handlePointerDown"
    >
      <!-- 图片/缩略图容器 (始终占用空间，视频播放时透明) -->
      <div
        class="absolute inset-0 overflow-hidden"
        :class="{ 'opacity-0': isVideoPlaying }"
      >
        <MediaThumbnail
          :file-id="item.id"
          :src="url"
          :preload="preload"
          :filename="item.name"
          :alt="item.name"
          img-class="w-full h-full object-contain"
          @error="$emit('image-error', url)"
        />
      </div>

      <!-- 视频预览组件插槽 (绝对定位覆盖在缩略图上，pointer-events-none 确保鼠标事件穿透到父容器) -->
      <div
        class="absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-200"
        :class="isVideoPlaying ? 'opacity-100' : 'opacity-0'"
      >
        <slot
          name="video-preview"
          :item="item"
          :is-playing="isVideoPlaying"
        />
      </div>

      <!-- 视频静音切换按钮 (仅在视频预览时显示，pointer-events-auto 恢复点击) -->
      <button
        v-show="isVideoPlaying"
        @click.stop="$emit('toggle-mute')"
        class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70 transition-colors z-10 pointer-events-auto"
      >
        <span class="material-icons text-sm">
          {{ isMuted ? 'volume_off' : 'volume_up' }}
        </span>
      </button>

      <!-- 选择框 -->
      <div
        v-if="isSelected"
        class="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10"
      >
        <span class="material-icons text-white text-sm">check</span>
      </div>

      <!-- 文件类型标识 (非视频预览状态时显示) -->
      <div
        v-show="!isVideoPlaying"
        class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded"
      >
        {{ fileExtension }}
      </div>

      <!-- 预览放大镜按钮：hover 时显示，悬浮按钮弹出 hovercard 预览 -->
      <!-- 注意：v-show 不能放在 <HoverCard> 上 —— HoverCard 根节点是 fragment（PopperRoot 仅 renderSlot），
           在 fragment 上应用指令会触发 "Runtime directive used on component with non-element root node" 警告且不生效。
           故放到真实 <button> 元素上。 -->
      <HoverCard
        :open-delay="200"
        :close-delay="150"
      >
        <HoverCardTrigger as-child>
          <button
            v-show="!isVideoPlaying"
            class="absolute bottom-12 right-2 z-10 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/75 transition-opacity"
            title="预览"
            @click.stop
            @pointerdown.stop
          >
            <span class="material-icons text-base">search</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="end"
          :side-offset="8"
          class="w-auto max-w-[480px] max-h-[320px] border-0 bg-transparent p-0 shadow-none"
        >
          <img
            :src="previewSrc"
            :alt="item.name"
            class="block max-w-[480px] max-h-[320px] w-auto h-auto object-contain rounded-lg ring-1 ring-black/10 shadow-lg"
          />
        </HoverCardContent>
      </HoverCard>

      <!-- 视频播放图标 -->
      <div
        v-show="isVideo && !isVideoPlaying"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="bg-black/50 rounded-full p-3">
          <span class="material-icons text-white text-2xl">play_arrow</span>
        </div>
      </div>

      <!-- 视频进度条 (仅在视频预览时显示) -->
      <div
        v-show="isVideoPlaying"
        class="absolute bottom-0 left-0 right-0 h-1 bg-black/30 z-10"
      >
        <div
          class="h-full bg-primary transition-all duration-100"
          :style="{ width: `${progress * 100}%` }"
        ></div>
      </div>

      <!-- 文件名 (玻璃浮层，非视频预览时显示) -->
      <div
        v-show="!isVideoPlaying"
        class="absolute bottom-0 left-0 right-0 p-2 rounded-b-xl"
        :class="isSelected ? 'bg-primary/90' : 'bg-white/80 dark:bg-muted/80 backdrop-blur'"
      >
        <h3
          class="text-sm font-medium truncate"
          :class="isSelected ? 'text-white' : 'text-foreground dark:text-muted-foreground'"
        >
          {{ item.name }}
        </h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { getCacheBustedPreviewImageSource } from '@renderer/utils/fileUtils'
import type { FileInfo } from '../../../../shared/types'
import { useMediaItem, type MediaItemEmits } from '@renderer/composables/useMediaItem'

interface Props {
  item: FileInfo
  url: string
  ratio?: number
  isSelected: boolean
  isVideoPlaying?: boolean
  isMuted?: boolean
  progress?: number
  /** Masonry 已进入预加载区，立即请求缩略图。 */
  preload?: boolean
}

interface Emits extends MediaItemEmits {
  (e: 'image-error', url: string): void
  (e: 'toggle-mute'): void
}

const props = withDefaults(defineProps<Props>(), {
  isVideoPlaying: false,
  isMuted: false,
  progress: 0,
  ratio: 1,
  preload: false
})

const emit = defineEmits<Emits>()

const mediaContainerStyle = computed(() => ({
  aspectRatio: `${props.ratio} / 1`
}))

// hovercard 预览图：优先原图（带缓存破坏），保证清晰
const previewSrc = computed(() => getCacheBustedPreviewImageSource(props.item) || props.url || '')

// 调试：监控视频播放状态变化
watch(() => props.isVideoPlaying, (isPlaying) => {
  if (isPlaying) {
    console.log('🎬 MediaWaterfallItem video playing:', {
      id: props.item.id,
      name: props.item.name,
      path: props.item.path,
      hasPath: !!props.item.path
    })
  }
})

// 使用媒体项逻辑
const {
  fileExtension,
  isVideo,
  getLocalFile,
  handleClick,
  handleDoubleClick,
  handleContextMenu,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handlePointerDown
} = useMediaItem({
  item: toRef(props, 'item'),
  emit
})
</script>

<style scoped>
.media-waterfall-item.is-selected::after {
  position: absolute;
  inset: 0;
  z-index: 20;
  border: 2px solid var(--primary);
  border-radius: inherit;
  pointer-events: none;
  content: '';
}
</style>
