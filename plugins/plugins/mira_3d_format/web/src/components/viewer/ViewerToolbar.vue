<script setup lang="ts">
import { computed } from 'vue'
import { Box, EllipsisVertical, FolderOpen, Grid3x3, ImageDown, ListTree, LocateFixed, Pause, Play, RotateCcw, SlidersHorizontal, X } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const emit = defineEmits<{ (e: 'open'): void; (e: 'openLeft'): void; (e: 'openRight'): void }>()
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
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

const { t } = useI18n()

const statItems = computed(() => [
  { label: t('app.statMeshes'), value: sceneNodes.value.length },
  { label: t('app.statMaterials'), value: materials.value.length },
  { label: t('app.statVertices'), value: stats.value.vertices.toLocaleString() },
  { label: t('app.statTriangles'), value: stats.value.triangles.toLocaleString() },
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

// 移动端 dots dropdown 项：与桌面端工具按钮一一对应
// separatorAfter 标记在该项后插入分隔线
const menuItems = computed(() => [
  { label: t('app.openModel'), icon: FolderOpen, onClick: () => emit('open'), active: false, separatorAfter: true },
  { label: store.wireframe ? t('app.wireframeOff') : t('app.wireframe'), icon: LocateFixed, onClick: toggleWireframe, active: store.wireframe, separatorAfter: false },
  { label: store.showGrid ? t('app.gridOff') : t('app.grid'), icon: Grid3x3, onClick: toggleGrid, active: store.showGrid, separatorAfter: false },
  { label: store.autoRotate ? t('app.pauseRotate') : t('app.autoRotate'), icon: store.autoRotate ? Pause : Play, onClick: toggleAutoRotate, active: store.autoRotate, separatorAfter: true },
  { label: t('app.resetView'), icon: RotateCcw, onClick: resetCamera, active: false, separatorAfter: false },
  { label: t('app.screenshot'), icon: ImageDown, onClick: onScreenshot, active: false, separatorAfter: false },
  { label: t('app.deselect'), icon: X, onClick: deselectAll, active: false, separatorAfter: false },
])
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 px-3 py-2">
    <!-- 手机端：打开左侧场景树 drawer -->
    <Button
      size="icon-sm"
      variant="ghost"
      class="md:hidden"
      :title="t('app.sceneTree')"
      @click="emit('openLeft')"
    >
      <ListTree class="size-4" />
    </Button>

    <!-- 文件名 -->
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <Box class="size-4 shrink-0 text-emerald-400" />
      <span class="truncate text-sm font-medium" :title="store.fileName">{{ store.fileName }}</span>
      <span v-if="store.mimeType" class="hidden text-xs text-muted-foreground sm:inline">{{ store.mimeType }}</span>
    </div>

    <!-- 手机端：打开右侧属性面板 drawer -->
    <Button
      size="icon-sm"
      variant="ghost"
      class="md:hidden"
      :title="t('app.propsPanel')"
      @click="emit('openRight')"
    >
      <SlidersHorizontal class="size-4" />
    </Button>

    <!-- 手机端：dots dropdown（收拢除左右栏切换外的所有工具） -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button size="icon-sm" variant="ghost" class="md:hidden" :title="t('app.more')">
          <EllipsisVertical class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="md:hidden">
        <template v-for="(item, i) in menuItems" :key="i">
          <DropdownMenuItem :class="item.active ? 'text-primary' : ''" @select="item.onClick">
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="item.separatorAfter" />
        </template>
      </DropdownMenuContent>
    </DropdownMenu>

    <Separator orientation="vertical" class="hidden h-6 md:block" />

    <!-- 统计（桌面端） -->
    <div class="hidden items-center gap-1.5 md:flex">
      <Badge v-for="s in statItems" :key="s.label" variant="secondary" class="gap-1 font-normal">
        <span class="text-muted-foreground">{{ s.label }}</span>
        <span class="text-foreground">{{ s.value }}</span>
      </Badge>
    </div>

    <Separator orientation="vertical" class="hidden h-6 md:block" />

    <!-- 视图工具（桌面端） -->
    <div class="hidden items-center gap-1 md:flex">
      <Button size="sm" variant="default" class="gap-1.5" :title="t('app.openLocalModel')" @click="emit('open')">
        <FolderOpen class="size-4" />
        <span class="hidden sm:inline">{{ t('app.open') }}</span>
      </Button>
      <Separator orientation="vertical" class="mx-0.5 h-5" />
      <Button
        size="icon-sm"
        :variant="store.wireframe ? 'default' : 'ghost'"
        :class="cn(store.wireframe && 'text-primary-foreground')"
        :title="t('app.wireframe')"
        @click="toggleWireframe"
      >
        <LocateFixed class="size-4" />
      </Button>
      <Button
        size="icon-sm"
        :variant="store.showGrid ? 'default' : 'ghost'"
        :class="cn(store.showGrid && 'text-primary-foreground')"
        :title="t('app.grid')"
        @click="toggleGrid"
      >
        <Grid3x3 class="size-4" />
      </Button>
      <Button
        size="icon-sm"
        :variant="store.autoRotate ? 'default' : 'ghost'"
        :class="cn(store.autoRotate && 'text-primary-foreground')"
        :title="t('app.autoRotate')"
        @click="toggleAutoRotate"
      >
        <component :is="store.autoRotate ? Pause : Play" class="size-4" />
      </Button>
      <Separator orientation="vertical" class="mx-0.5 h-5" />
      <Button size="icon-sm" variant="ghost" :title="t('app.resetView')" @click="resetCamera">
        <RotateCcw class="size-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" :title="t('app.screenshot')" @click="onScreenshot">
        <ImageDown class="size-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" :title="t('app.deselect')" @click="deselectAll">
        <X class="size-4" />
      </Button>
    </div>
  </div>
</template>
