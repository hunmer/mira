<script setup lang="ts">
import { computed } from 'vue'
import * as THREE from 'three'
import { MousePointerClick } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { selectedMaterial, selectedObject } from '@/composables/useViewerStore'

// ============ 对象属性 ============
const position = computed({
  get: () => {
    const p = selectedObject.value?.position
    if (!p) return [0, 0, 0]
    return [Number(p.x.toFixed(3)), Number(p.y.toFixed(3)), Number(p.z.toFixed(3))]
  },
  set: (val: number[]) => {
    const obj = selectedObject.value
    if (obj) obj.position.set(val[0] ?? 0, val[1] ?? 0, val[2] ?? 0)
  },
})

const rotation = computed({
  get: () => {
    const r = selectedObject.value?.rotation
    if (!r) return [0, 0, 0]
    return [+(r.x * 180 / Math.PI).toFixed(1), +(r.y * 180 / Math.PI).toFixed(1), +(r.z * 180 / Math.PI).toFixed(1)]
  },
  set: (val: number[]) => {
    const obj = selectedObject.value
    if (obj) obj.rotation.set((val[0] ?? 0) * Math.PI / 180, (val[1] ?? 0) * Math.PI / 180, (val[2] ?? 0) * Math.PI / 180)
  },
})

const scale = computed({
  get: () => {
    const s = selectedObject.value?.scale
    if (!s) return [1, 1, 1]
    return [Number(s.x.toFixed(3)), Number(s.y.toFixed(3)), Number(s.z.toFixed(3))]
  },
  set: (val: number[]) => {
    const obj = selectedObject.value
    if (obj) obj.scale.set(val[0] ?? 1, val[1] ?? 1, val[2] ?? 1)
  },
})

const visible = computed({
  get: () => selectedObject.value?.visible ?? true,
  set: (v: boolean) => {
    if (selectedObject.value) selectedObject.value.visible = v
  },
})

// ============ 材质属性 ============
const selectedMat = computed(() => selectedMaterial.value as (THREE.MeshStandardMaterial & THREE.Material) | null)
const hasColor = computed(() => !!(selectedMat.value as any)?.color)
const hasMetalness = computed(() => 'metalness' in (selectedMat.value || {}))
const hasRoughness = computed(() => 'roughness' in (selectedMat.value || {}))

const materialColor = computed({
  get: () => {
    const c = (selectedMat.value as any)?.color as THREE.Color | undefined
    return c ? `#${c.getHexString()}` : '#ffffff'
  },
  set: (hex: string) => {
    const c = (selectedMat.value as any)?.color as THREE.Color | undefined
    if (c) c.set(hex)
  },
})

const metalness = computed({
  get: () => (selectedMat.value as any)?.metalness ?? 0,
  set: (v: number) => {
    if (hasMetalness.value) (selectedMat.value as any).metalness = v
  },
})

const roughness = computed({
  get: () => (selectedMat.value as any)?.roughness ?? 1,
  set: (v: number) => {
    if (hasRoughness.value) (selectedMat.value as any).roughness = v
  },
})

function onColorInput(e: Event) {
  materialColor.value = (e.target as HTMLInputElement).value
}
</script>

<template>
  <div class="scroll-thin flex h-full flex-col overflow-y-auto px-3 pb-6">
    <!-- 对象属性 -->
    <template v-if="selectedObject">
      <div class="mt-3 flex items-center justify-between">
        <span class="text-xs font-medium text-muted-foreground">选中对象</span>
        <Badge variant="outline">{{ selectedObject.type }}</Badge>
      </div>
      <h3 class="mb-3 mt-1 truncate text-sm font-semibold" :title="selectedObject.name || '(未命名)'">
        {{ selectedObject.name || '(未命名)' }}
      </h3>

      <Separator class="mb-3" />

      <!-- 可见性 -->
      <div class="mb-3 flex items-center justify-between">
        <Label>可见</Label>
        <Switch v-model="visible" />
      </div>

      <!-- 位置 -->
      <div class="mb-3">
        <Label class="mb-1.5 text-muted-foreground">位置 Position</Label>
        <div class="grid grid-cols-3 gap-1.5">
          <div class="relative">
            <span class="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-rose-400">X</span>
            <Input v-model="position[0]" type="number" step="0.1" class="h-8 pl-5 text-xs" />
          </div>
          <div class="relative">
            <span class="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400">Y</span>
            <Input v-model="position[1]" type="number" step="0.1" class="h-8 pl-5 text-xs" />
          </div>
          <div class="relative">
            <span class="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-sky-400">Z</span>
            <Input v-model="position[2]" type="number" step="0.1" class="h-8 pl-5 text-xs" />
          </div>
        </div>
      </div>

      <!-- 旋转 -->
      <div class="mb-3">
        <Label class="mb-1.5 text-muted-foreground">旋转 Rotation (°)</Label>
        <div class="grid grid-cols-3 gap-1.5">
          <Input v-model="rotation[0]" type="number" step="1" class="h-8 text-xs" />
          <Input v-model="rotation[1]" type="number" step="1" class="h-8 text-xs" />
          <Input v-model="rotation[2]" type="number" step="1" class="h-8 text-xs" />
        </div>
      </div>

      <!-- 缩放 -->
      <div class="mb-3">
        <Label class="mb-1.5 text-muted-foreground">缩放 Scale</Label>
        <div class="grid grid-cols-3 gap-1.5">
          <Input v-model="scale[0]" type="number" step="0.1" class="h-8 text-xs" />
          <Input v-model="scale[1]" type="number" step="0.1" class="h-8 text-xs" />
          <Input v-model="scale[2]" type="number" step="0.1" class="h-8 text-xs" />
        </div>
      </div>
    </template>

    <!-- 材质属性 -->
    <template v-else-if="selectedMat">
      <div class="mt-3 flex items-center justify-between">
        <span class="text-xs font-medium text-muted-foreground">选中材质</span>
        <Badge variant="outline">{{ (selectedMat as any).type }}</Badge>
      </div>
      <h3 class="mb-3 mt-1 truncate text-sm font-semibold" :title="selectedMat.name || '(未命名)'">
        {{ selectedMat.name || '(未命名)' }}
      </h3>

      <Separator class="mb-3" />

      <!-- 颜色 -->
      <div v-if="hasColor" class="mb-4 flex items-center justify-between">
        <Label>颜色</Label>
        <div class="flex items-center gap-2">
          <span class="text-xs tabular-nums text-muted-foreground">{{ materialColor }}</span>
          <input
            type="color"
            :value="materialColor"
            class="size-8 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
            @input="onColorInput"
          />
        </div>
      </div>

      <!-- 金属度 -->
      <div v-if="hasMetalness" class="mb-4">
        <div class="mb-1.5 flex items-center justify-between">
          <Label class="text-muted-foreground">金属度</Label>
          <span class="text-xs tabular-nums">{{ metalness.toFixed(2) }}</span>
        </div>
        <Slider
          :model-value="[metalness]"
          :min="0"
          :max="1"
          :step="0.01"
          @update:model-value="(v: number[] | undefined) => (metalness = v?.[0] ?? 0)"
        />
      </div>

      <!-- 粗糙度 -->
      <div v-if="hasRoughness" class="mb-4">
        <div class="mb-1.5 flex items-center justify-between">
          <Label class="text-muted-foreground">粗糙度</Label>
          <span class="text-xs tabular-nums">{{ roughness.toFixed(2) }}</span>
        </div>
        <Slider
          :model-value="[roughness]"
          :min="0"
          :max="1"
          :step="0.01"
          @update:model-value="(v: number[] | undefined) => (roughness = v?.[0] ?? 0)"
        />
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <MousePointerClick class="size-8 text-muted-foreground/50" />
      <p class="text-sm text-muted-foreground">点击左侧网格或材质<br>查看并编辑属性</p>
    </div>
  </div>
</template>
