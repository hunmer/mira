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
      @contextmenu="handleContextMenu"
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
        :file="item"
          :src="url"
          :preload="preload"
          :filename="item.name"
          :alt="item.name"
          :img-class="isImage
            ? 'w-full h-full object-contain transition-transform duration-500 ease-out will-change-transform group-hover:scale-105'
            : 'w-full h-full object-contain'"
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
        v-show="!isVideoPlaying && showFormat"
        class="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10"
      >
        {{ fileExtension }}
      </div>

      <!-- 预览放大镜按钮：hover 时显示，悬浮按钮弹出 hovercard 预览 -->
      <!-- 注意：v-show 不能放在 <HoverCard> 上 —— HoverCard 根节点是 fragment（PopperRoot 仅 renderSlot），
           在 fragment 上应用指令会触发 "Runtime directive used on component with non-element root node" 警告且不生效。
           故放到真实 <button> 元素上。 -->
      <MediaPreviewHoverCard
        v-if="!isVideoPlaying"
        :item="item"
        button-class="absolute top-0 right-0 z-10 h-7 w-7 rounded-bl-full bg-black/55 text-white"
        icon-class="text-base"
        side="top"
        align="end"
      />

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

      <!-- 信息块 (玻璃浮层，非视频预览时显示) -->
      <div
        v-show="!isVideoPlaying && hasVisibleInfo"
        class="absolute bottom-0 left-0 right-0 p-2 rounded-b-xl space-y-0.5"
        :class="isSelected ? 'bg-primary/90' : 'bg-white/80 dark:bg-muted/80 backdrop-blur'"
      >
        <!-- 文件名 -->
        <h3
          v-if="showFilename"
          class="text-sm font-medium truncate"
          :class="isSelected ? 'text-white' : 'text-foreground dark:text-muted-foreground'"
        >
          {{ item.name }}
        </h3>
        <!-- 大小 -->
        <p
          v-if="showSize && item.size"
          class="text-xs truncate"
          :class="isSelected ? 'text-white/85' : 'text-muted-foreground dark:text-muted-foreground'"
        >
          {{ formatFileSize(item.size) }}
        </p>
        <!-- 文件夹 + 标签：合并成一行支持换行的 badge list -->
        <div
          v-if="(showFolder && folderName) || (showTags && tagNames.length > 0)"
          class="flex flex-wrap gap-1 pt-0.5"
        >
          <span
            v-if="showFolder && folderName"
            class="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[100px]"
            :class="isSelected
              ? 'bg-white/25 text-white'
              : 'bg-primary/10 text-primary dark:text-primary'"
          >
            <span class="material-icons" style="font-size: 10px; margin-right: 2px;">folder</span>
            {{ folderName }}
          </span>
          <span
            v-for="name in (showTags ? tagNames.slice(0, 5) : [])"
            :key="name"
            class="text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
            :class="isSelected
              ? 'bg-white/25 text-white'
              : 'bg-primary/10 text-primary dark:text-primary'"
          >{{ name }}</span>
          <span
            v-if="showTags && tagNames.length > 5"
            class="text-[10px] px-1 py-0.5"
            :class="isSelected ? 'text-white/85' : 'text-muted-foreground dark:text-muted-foreground'"
          >+{{ tagNames.length - 5 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import MediaPreviewHoverCard from '@renderer/components/common/MediaPreviewHoverCard.vue'
import type { FileInfo } from '../../../../shared/types'
import { useMediaItem, type MediaItemEmits } from '@renderer/composables/useMediaItem'
import { useSettingsStore } from '@renderer/stores/settings'
import { useFolderStore } from '@renderer/stores/folder'
import { useTagStore } from '@renderer/stores/tag'

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
  isImage,
  isVideo,
  formatFileSize,
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

// ============================================
// 展示字段控制（受全局设置 visibleItemFields 驱动）
// ============================================
const settingsStore = useSettingsStore()
const folderStore = useFolderStore()
const tagStore = useTagStore()

const visibleFields = computed(() => settingsStore.settings.visibleItemFields)
const showFilename = computed(() => visibleFields.value.includes('filename'))
const showFormat = computed(() => visibleFields.value.includes('format'))
const showSize = computed(() => visibleFields.value.includes('size'))
const showFolder = computed(() => visibleFields.value.includes('folder'))
const showTags = computed(() => visibleFields.value.includes('tags'))

const folderName = computed(() => {
  const id = props.item.folderId
  if (id === undefined || id === null || id === '') return ''
  return folderStore.getFolderById(Number(id))?.title || ''
})

const tagNames = computed<string[]>(() => {
  const ids = props.item.tags || []
  return ids
    .map(id => tagStore.tags.find(t => String(t.id) === String(id))?.title || String(id))
})

// 是否有任何信息需要展示（用于决定浮层显隐）
const hasVisibleInfo = computed(() =>
  showFilename.value
  || (showSize.value && props.item.size)
  || (showFolder.value && folderName.value)
  || (showTags.value && tagNames.value.length > 0)
)
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
