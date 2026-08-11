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
        class="relative w-full h-[200px] rounded-xl overflow-hidden shadow-sm"
      >
        <!-- 懒加载图片 -->
        <MediaThumbnail
          :file-id="item.id"
          :file="item"
          :src="imageSrcComputed ?? ''"
          :filename="item.name"
          :alt="item.name"
          :img-class="isImage
            ? 'w-full h-full object-cover transition-[opacity,transform] duration-500 ease-out will-change-transform group-hover:scale-105 lazy-image'
            : 'w-full h-full object-cover transition-opacity duration-300 lazy-image'"
        />
      </div>

      <!-- 视频预览组件插槽 (绝对定位覆盖在缩略图上) -->
      <div
        v-show="isVideoPlaying"
        class="absolute inset-0 rounded-xl overflow-hidden"
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
        v-show="!isVideoPlaying && showFormat"
        class="absolute top-2 left-2 max-w-[80px] truncate bg-black/50 text-white text-xs px-2 py-1 rounded"
      >
        {{ fileExtension }}
      </div>

      <!-- 预览放大镜按钮：悬浮卡片时显示，悬浮按钮弹出 hovercard 预览 -->
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

      <!-- 选择框 -->
      <Transition name="check-zoom" appear>
        <div
          v-if="isSelected"
          class="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
          style="transform-origin: center;"
        >
          <span class="material-icons text-white text-sm">check</span>
        </div>
      </Transition>

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

      <!-- 信息块 (非视频预览时显示) -->
      <div
        v-show="!isVideoPlaying && hasVisibleInfo"
        class="absolute bottom-0 left-0 right-0 p-2 rounded-b-xl space-y-0.5"
        :class="isSelected ? 'bg-primary/90' : 'bg-white/80 dark:bg-muted/80 backdrop-blur'"
      >
        <!-- 文件名 -->
        <h3
          v-if="showFilename"
          class="text-sm font-semibold truncate"
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
import { computed, toRef } from 'vue'
import type { FileInfo } from '../../../../shared/types'
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import MediaPreviewHoverCard from '@renderer/components/common/MediaPreviewHoverCard.vue'
import { useMediaItem, type MediaItemEmits } from '@renderer/composables/useMediaItem'
import { useSettingsStore } from '@renderer/stores/settings'
import { useFolderStore } from '@renderer/stores/folder'
import { useTagStore } from '@renderer/stores/tag'

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

// 使用媒体项逻辑
const {
  imageSrc: imageSrcComputed,
  fileExtension,
  isImage,
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
.material-icons {
  font-size: 18px;
}

/* 选择框：放大/缩小进入退出（参考 MediaTabListView 的 toolbar-zoom） */
.check-zoom-enter-active {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease;
}

.check-zoom-leave-active {
  transition: transform 150ms ease-in, opacity 150ms ease;
}

.check-zoom-enter-from,
.check-zoom-leave-to {
  transform: scale(0.6);
  opacity: 0;
}

:deep(.lazy-image[lazy]),
:deep(.lazy-image[lazy=loading]),
:deep(.lazy-image[lazy=loaded]),
:deep(.lazy-image[lazy=error]) {
  pointer-events: none;
}
</style>
