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
      @contextmenu.prevent="handleContextMenu"
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
          v-lazy="imageSrc"
          :alt="item.name"
          class="w-full h-full object-cover transition-opacity duration-300 lazy-image"
          @error="handleImageError"
        />
      </div>

      <!-- 视频预览组件插槽 (绝对定位覆盖在缩略图上) -->
      <div v-show="isVideoPlaying" class="absolute inset-0 rounded-lg overflow-hidden">
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
import { computed, ref } from 'vue'
import type { FileInfo } from '../../../../shared/types'

interface Props {
  item: FileInfo
  isSelected: boolean
  isVideoPlaying?: boolean
  isMuted?: boolean
  progress?: number
}

interface Emits {
  (e: 'click', item: FileInfo, event: MouseEvent): void
  (e: 'double-click', item: FileInfo): void
  (e: 'context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'mouse-enter', item: FileInfo, event: MouseEvent): void
  (e: 'mouse-leave', item: FileInfo, event: MouseEvent): void
  (e: 'mouse-move', item: FileInfo, event: MouseEvent): void
  (e: 'pointer-down', event: PointerEvent, item: FileInfo): void
  (e: 'toggle-mute'): void
}

const props = withDefaults(defineProps<Props>(), {
  isVideoPlaying: false,
  isMuted: false,
  progress: 0
})

const emit = defineEmits<Emits>()

// 记录图片是否加载失败
const hasLoadError = ref(false)

// 图片源 - 如果已加载失败，返回空字符串阻止重试
const imageSrc = computed(() => {
  if (hasLoadError.value) {
    return '' // 返回空字符串，不再尝试加载
  }
  return props.item.thumbnailPath || props.item.url
})

// 监听图片加载错误事件
const handleImageError = () => {
  hasLoadError.value = true
}

const getLocalFile = (item: FileInfo): string | undefined => {
  if (item.localFile) return item.localFile
  return !item.path?.toLocaleLowerCase().startsWith('http') ? item.path : undefined
}

const fileExtension = computed((): string => {
  const ext = props.item.extension || props.item.name.split('.').pop()?.toUpperCase()
  if (ext) return ext

  if (props.item.mimeType.startsWith('image/')) {
    if (props.item.mimeType.includes('png')) return 'PNG'
    if (props.item.mimeType.includes('gif')) return 'GIF'
    if (props.item.mimeType.includes('svg')) return 'SVG'
    return 'JPG'
  }
  if (props.item.mimeType.startsWith('video/')) return 'MP4'
  if (props.item.mimeType.startsWith('audio/')) return 'MP3'
  return 'FILE'
})

const isVideo = computed((): boolean => {
  return props.item.mimeType.startsWith('video/')
})

const handleClick = (event: MouseEvent) => {
  emit('click', props.item, event)
}

const handleDoubleClick = () => {
  emit('double-click', props.item)
}

const handleContextMenu = (event: MouseEvent) => {
  emit('context-menu', props.item, event)
}

const handleMouseEnter = (event: MouseEvent) => {
  emit('mouse-enter', props.item, event)
}

const handleMouseLeave = (event: MouseEvent) => {
  emit('mouse-leave', props.item, event)
}

const handleMouseMove = (event: MouseEvent) => {
  emit('mouse-move', props.item, event)
}

const handlePointerDown = (event: PointerEvent) => {
  emit('pointer-down', event, props.item)
}
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}

.media-item.selected {
  /* 移除边框样式，使用文件名背景色表示选中状态 */
  transition: all 0.2s ease;
}

.media-item {
  transition: all 0.2s ease;
}

/* 懒加载图片样式 */
.lazy-image {
  transition: opacity 0.3s ease;
}
</style>
