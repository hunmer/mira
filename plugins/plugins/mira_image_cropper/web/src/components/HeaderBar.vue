<script setup lang="ts">
import { computed, ref } from 'vue'
import { Crop, Images, Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from '@lucide/vue'
import MediaPickerDialog from 'mira-plugin-ui/src/library/MediaPickerDialog.vue'
import type { MediaPickerFile } from 'mira-plugin-ui/src/library/types'
import type { MediaInput } from '@/types'
import { useCropperStore } from '@/stores/cropper'
import { getServerConfig } from '@/lib/server'

/** 顶栏：缩放控制 / 撤销重做 / 从素材库添加（均为裸图标；本地添加走左侧栏） */
const props = defineProps<{
  stage: { fit: () => void; zoomIn: () => void; zoomOut: () => void } | null
}>()

const store = useCropperStore()

const pickerOpen = ref(false)
const pickerLibraryId = ref(getServerConfig().libraryId)

const imageInfo = computed(() => {
  if (!store.image) return ''
  const { width, height } = store.image
  return `${store.image.name}　${width} × ${height}`
})

/** 素材库选图确认 → 每张图一个独立实例，激活最后一张 */
function onPickerConfirm(files: MediaPickerFile[]) {
  const libraryId = pickerLibraryId.value
  let lastKey = ''
  for (const file of files) {
    if (!file.isImage) continue
    const media: MediaInput = {
      id: String(file.id),
      libraryId,
      name: file.name,
      width: file.width,
      height: file.height,
      url: file.url,
      thumbnailURL: file.thumbUrl,
    }
    lastKey = store.addMediaInstance(media)
  }
  if (lastKey) store.setActive(lastKey)
}
</script>

<template>
  <header class="flex items-center gap-2 px-3 h-12 border-b bg-background shrink-0">
    <Crop class="size-4.5 text-primary shrink-0" />
    <span class="font-semibold text-sm">多选区裁切</span>

    <span v-if="imageInfo" class="text-xs text-muted-foreground truncate max-w-72" :title="imageInfo">
      {{ imageInfo }}
    </span>

    <div class="flex-1" />

    <!-- 缩放控制 -->
    <div v-if="store.image" class="flex items-center gap-1.5">
      <button type="button" class="icon-bare" title="缩小" @click="props.stage?.zoomOut()">
        <ZoomOut class="size-4" />
      </button>
      <span class="text-xs text-muted-foreground w-11 text-center font-mono">{{ Math.round(store.scale * 100) }}%</span>
      <button type="button" class="icon-bare" title="放大" @click="props.stage?.zoomIn()">
        <ZoomIn class="size-4" />
      </button>
      <button type="button" class="icon-bare" title="适应窗口" @click="props.stage?.fit()">
        <Maximize class="size-4" />
      </button>
    </div>

    <span class="w-px h-5 bg-border mx-1" />

    <button type="button" class="icon-bare" title="撤销 (Ctrl+Z)" :disabled="!store.canUndo" @click="store.undo()">
      <Undo2 class="size-4" />
    </button>
    <button type="button" class="icon-bare" title="重做 (Ctrl+Shift+Z)" :disabled="!store.canRedo" @click="store.redo()">
      <Redo2 class="size-4" />
    </button>
    <button type="button" class="icon-bare" title="从素材库添加图片" @click="pickerOpen = true">
      <Images class="size-4" />
    </button>

    <!-- 从素材库选图（多选） -->
    <MediaPickerDialog
      v-model:open="pickerOpen"
      v-model:library-id="pickerLibraryId"
      select-mode="multiple"
      title="从素材库添加图片"
      @confirm="onPickerConfirm"
    />
  </header>
</template>

<style scoped>
/* 裸图标按钮：无边框、无底色，仅 hover 提亮 */
.icon-bare {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  color: var(--muted-foreground);
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s ease;
}
.icon-bare:hover:not(:disabled) {
  color: var(--foreground);
}
.icon-bare:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
