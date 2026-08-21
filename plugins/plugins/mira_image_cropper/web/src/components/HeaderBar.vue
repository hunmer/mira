<script setup lang="ts">
import { computed, ref } from 'vue'
import { Crop, Maximize, Redo2, Trash2, Undo2, Upload, ZoomIn, ZoomOut } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { useCropperStore } from '@/stores/cropper'

/** 顶栏：上传 / 缩放控制 / 撤销重做 / 清空（图片实例切换在左侧 MediaRail） */
const props = defineProps<{
  stage: { fit: () => void; zoomIn: () => void; zoomOut: () => void } | null
}>()

const store = useCropperStore()
const fileInput = ref<HTMLInputElement | null>(null)

const imageInfo = computed(() => {
  if (!store.image) return ''
  const { width, height } = store.image
  return `${store.image.name}　${width} × ${height}`
})

function onPickFile(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  for (const file of files) {
    if (file.type.startsWith('image/')) void store.addLocalFile(file)
  }
  ;(e.target as HTMLInputElement).value = ''
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
    <div v-if="store.image" class="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" title="缩小" @click="props.stage?.zoomOut()">
        <ZoomOut />
      </Button>
      <span class="text-xs text-muted-foreground w-11 text-center font-mono">{{ Math.round(store.scale * 100) }}%</span>
      <Button variant="outline" size="icon-sm" title="放大" @click="props.stage?.zoomIn()">
        <ZoomIn />
      </Button>
      <Button variant="outline" size="icon-sm" title="适应窗口" @click="props.stage?.fit()">
        <Maximize />
      </Button>
    </div>

    <span class="w-px h-5 bg-border mx-1" />

    <Button variant="ghost" size="icon-sm" title="撤销 (Ctrl+Z)" :disabled="!store.canUndo" @click="store.undo()">
      <Undo2 />
    </Button>
    <Button variant="ghost" size="icon-sm" title="重做 (Ctrl+Shift+Z)" :disabled="!store.canRedo" @click="store.redo()">
      <Redo2 />
    </Button>
    <Button variant="ghost" size="icon-sm" title="清空所有选区" :disabled="!store.regions.length" @click="store.clearRegions()">
      <Trash2 />
    </Button>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
      multiple
      class="hidden"
      @change="onPickFile"
    />
    <Button variant="outline" size="icon-sm" title="上传图片" @click="fileInput?.click()">
      <Upload />
    </Button>
  </header>
</template>
