<script setup lang="ts">
import { computed } from 'vue'
import { Box, FolderOpen, Grid3x3, ImageDown, LocateFixed, Pause, Play, RotateCcw, X } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'open'): void }>()
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  ctxRef,
  exportScreenshot,
  materials,
  resetCamera,
  sceneNodes,
  selectedMaterial,
  selectedObject,
  setWireframe,
  stats,
  store,
} from '@/composables/useViewerStore'
import { clearHighlight } from '@/composables/useHighlight'

const statItems = computed(() => [
  { label: '网格', value: sceneNodes.value.length },
  { label: '材质', value: materials.value.length },
  { label: '顶点', value: stats.value.vertices.toLocaleString() },
  { label: '三角面', value: stats.value.triangles.toLocaleString() },
])

function toggleWireframe() {
  setWireframe(!store.wireframe)
}

function toggleGrid() {
  store.showGrid = !store.showGrid
}

function toggleAutoRotate() {
  store.autoRotate = !store.autoRotate
  const controls = ctxRef.value?.controls?.value as any
  if (controls) {
    controls.autoRotate = store.autoRotate
    controls.autoRotateSpeed = 1.5
    controls.update?.()
  }
}

function deselectAll() {
  clearHighlight()
  selectedObject.value = null
  selectedMaterial.value = null
}

function onScreenshot() {
  exportScreenshot(store.fileName)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 px-3 py-2">
    <!-- 文件名 -->
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <Box class="size-4 shrink-0 text-emerald-400" />
      <span class="truncate text-sm font-medium" :title="store.fileName">{{ store.fileName }}</span>
      <span v-if="store.mimeType" class="hidden text-xs text-muted-foreground sm:inline">{{ store.mimeType }}</span>
    </div>

    <Separator orientation="vertical" class="hidden h-6 md:block" />

    <!-- 统计 -->
    <div class="hidden items-center gap-1.5 md:flex">
      <Badge v-for="s in statItems" :key="s.label" variant="secondary" class="gap-1 font-normal">
        <span class="text-muted-foreground">{{ s.label }}</span>
        <span class="text-foreground">{{ s.value }}</span>
      </Badge>
    </div>

    <Separator orientation="vertical" class="hidden h-6 md:block" />

    <!-- 视图工具 -->
    <div class="flex items-center gap-1">
      <Button size="sm" variant="default" class="gap-1.5" title="打开本地模型文件" @click="emit('open')">
        <FolderOpen class="size-4" />
        <span class="hidden sm:inline">打开</span>
      </Button>
      <Separator orientation="vertical" class="mx-0.5 h-5" />
      <Button
        size="icon-sm"
        :variant="store.wireframe ? 'default' : 'ghost'"
        :class="cn(store.wireframe && 'text-primary-foreground')"
        title="线框模式"
        @click="toggleWireframe"
      >
        <LocateFixed class="size-4" />
      </Button>
      <Button
        size="icon-sm"
        :variant="store.showGrid ? 'default' : 'ghost'"
        :class="cn(store.showGrid && 'text-primary-foreground')"
        title="网格地面"
        @click="toggleGrid"
      >
        <Grid3x3 class="size-4" />
      </Button>
      <Button
        size="icon-sm"
        :variant="store.autoRotate ? 'default' : 'ghost'"
        :class="cn(store.autoRotate && 'text-primary-foreground')"
        title="自动旋转"
        @click="toggleAutoRotate"
      >
        <component :is="store.autoRotate ? Pause : Play" class="size-4" />
      </Button>
      <Separator orientation="vertical" class="mx-0.5 h-5" />
      <Button size="icon-sm" variant="ghost" title="重置视角" @click="resetCamera">
        <RotateCcw class="size-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" title="导出截图" @click="onScreenshot">
        <ImageDown class="size-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" title="取消选中" @click="deselectAll">
        <X class="size-4" />
      </Button>
    </div>
  </div>
</template>
