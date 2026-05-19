<template>
  <div
    :data-selectable-id="item.id"
    :data-file="getLocalFile(item)"
    :class="[
      'media-item group relative cursor-pointer',
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
        <img
          v-lazy="actualImageSrc"
          :alt="item.name"
          class="w-full h-full object-cover transition-opacity duration-300 lazy-image"
          @error="handleImageError"
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

      <!-- 视频播放图标 -->
      <div
        v-show="isVideo && !isVideoPlaying"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="bg-black/50 rounded-full p-3">
          <span class="material-icons text-white text-2xl">play_arrow</span>
        </div>
      </div>

      <!-- 选择框 -->
      <div
        v-if="isSelected"
        class="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
      >
        <span class="material-icons text-white text-sm">check</span>
      </div>

      <!-- 视频进度条 (仅在视频预览时显示) -->
      <div
        v-show="isVideoPlaying"
        class="absolute bottom-0 left-0 right-0 h-1 bg-black/30 rounded-b-lg z-10"
      >
        <div
          class="h-full bg-blue-500 rounded-b-lg transition-all duration-100"
          :style="{ width: `${progress * 100}%` }"
        ></div>
      </div>

      <!-- 文件名 (非视频预览时显示) -->
      <div
        v-show="!isVideoPlaying"
        class="absolute bottom-0 left-0 right-0 p-2 rounded-b-lg"
        :class="isSelected ? 'bg-blue-500/90' : 'bg-white/90'"
      >
        <h3
          class="text-sm font-semibold truncate"
          :class="isSelected ? 'text-white' : 'text-gray-900'"
        >
          {{ item.name }}
        </h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef, ref, computed } from 'vue'
import type { FileInfo } from '../../../../shared/types'
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
const hasLoadError = ref(false)

// 使用媒体项逻辑
const {
  imageSrc: imageSrcComputed,
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

// 存储原始的 imageSrc，并在计算时添加加载失败检查
const actualImageSrc = computed(() => {
  if (hasLoadError.value) {
    return '' // 返回空字符串，不再尝试加载
  }
  return imageSrcComputed.value
})

// 图片加载失败处理
const handleImageError = () => {
  hasLoadError.value = true
}
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}

.media-item.selected {
  /* 移除边框样式,使用文件名背景色表示选中状态 */
  transition: all 0.2s ease;
}

.media-item {
  transition: all 0.2s ease;
}

/* 懒加载图片样式 */
.lazy-image {
  transition: opacity 0.3s ease;
}

/* 确保 lazy 状态的图片不会拦截事件，让父容器的拖动功能正常工作 */
:deep(.lazy-image[lazy]),
:deep(.lazy-image[lazy=loading]),
:deep(.lazy-image[lazy=loaded]),
:deep(.lazy-image[lazy=error]) {
  pointer-events: none;
}
</style>
