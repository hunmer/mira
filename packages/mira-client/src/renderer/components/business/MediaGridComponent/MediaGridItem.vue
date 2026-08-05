<template>
  <div
    :data-selectable-id="item.id"
    :data-file="getLocalFile(item)"
    :class="[
      'media-item group relative cursor-pointer transition-all',
      { 'selected': isSelected }
    ]"
    @click="handleClick"
  >
    <div
      class="w-full h-[200px] relative"
      @dblclick="handleDoubleClick"
      @contextmenu="handleContextMenu"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @mousemove="handleMouseMove"
      @pointerdown="handlePointerDown"
    >
      <!-- 图片/缩略图容器 (视频播放时隐藏) -->
      <div
        v-show="!isVideoPlaying"
        class="relative w-full h-[200px] rounded-lg overflow-hidden"
      >
        <!-- 懒加载图片 -->
        <MediaThumbnail
          :file-id="item.id"
          :src="imageSrcComputed"
          :filename="item.name"
          :alt="item.name"
          img-class="w-full h-full object-cover transition-opacity duration-300 lazy-image"
        />
      </div>

      <!-- 视频预览组件插槽 (绝对定位覆盖在缩略图上) -->
      <div
        v-show="isVideoPlaying"
        class="absolute inset-0 rounded-lg overflow-hidden"
        @pointerdown="handlePointerDown"
        @contextmenu="handleContextMenu"
      >
        <slot
          name="video-preview"
          :item="item"
          :is-playing="isVideoPlaying"
        />
      </div>

      <!-- 视频静音切换按钮 (仅在视频预览时显示) -->
      <button
        v-show="isVideoPlaying"
        @click.stop="$emit('toggle-mute')"
        class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70 transition-colors z-10"
      >
        <span class="material-icons text-sm">
          {{ isMuted ? 'volume_off' : 'volume_up' }}
        </span>
      </button>

      <!-- 文件类型标识 (非视频预览状态时显示) -->
      <div
        v-show="!isVideoPlaying"
        class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded"
      >
        {{ fileExtension }}
      </div>

      <!-- 预览放大镜按钮：悬浮卡片时显示，悬浮按钮弹出 hovercard 预览 -->
      <HoverCard
        v-show="!isVideoPlaying"
        :open-delay="200"
        :close-delay="150"
      >
        <HoverCardTrigger as-child>
          <button
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
          class="w-auto border-0 bg-transparent p-0 shadow-none"
        >
          <MediaPreviewContent :item="item" />
        </HoverCardContent>
      </HoverCard>

      <!-- 选择框 -->
      <div
        v-if="isSelected"
        class="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
      >
        <span class="material-icons text-white text-sm">check</span>
      </div>

      <!-- 视频进度条 (仅在视频预览时显示) -->
      <div
        v-show="isVideoPlaying"
        class="absolute bottom-0 left-0 right-0 h-1 bg-black/30 rounded-b-lg z-10"
      >
        <div
          class="h-full bg-primary rounded-b-lg transition-all duration-100"
          :style="{ width: `${progress * 100}%` }"
        ></div>
      </div>

      <!-- 文件名 (非视频预览时显示) -->
      <div
        v-show="!isVideoPlaying"
        class="absolute bottom-0 left-0 right-0 p-2 rounded-b-lg"
        :class="isSelected ? 'bg-primary/90' : 'bg-white/90 dark:bg-muted/90'"
      >
        <h3
          class="text-sm font-semibold truncate"
          :class="isSelected ? 'text-white' : 'text-foreground dark:text-muted-foreground'"
        >
          {{ item.name }}
        </h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import type { FileInfo } from '../../../../shared/types'
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import MediaPreviewContent from '@renderer/components/common/MediaPreviewContent.vue'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { useMediaItem, type MediaItemEmits } from '@renderer/composables/useMediaItem'

interface Props {
  item: FileInfo
  isSelected: boolean
  isVideoPlaying?: boolean
  isMuted?: boolean
  progress?: number
}

interface Emits extends MediaItemEmits {
  (e: 'toggle-mute'): void
}

const props = withDefaults(defineProps<Props>(), {
  isVideoPlaying: false,
  isMuted: false,
  progress: 0
})

const emit = defineEmits<Emits>()

// 记录图片加载失败状态

// 使用媒体项逻辑
const {
  imageSrc: imageSrcComputed,
  fileExtension,
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
.material-icons {
  font-size: 18px;
}

:deep(.lazy-image[lazy]),
:deep(.lazy-image[lazy=loading]),
:deep(.lazy-image[lazy=loaded]),
:deep(.lazy-image[lazy=error]) {
  pointer-events: none;
}
</style>
