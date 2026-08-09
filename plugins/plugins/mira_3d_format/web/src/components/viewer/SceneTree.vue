<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import * as THREE from 'three'
import { Eye, EyeOff, Film, Layers, Package, Pause, Play, Shapes } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  animations,
  materials,
  sceneNodes,
  selectedMaterial,
  selectedObject,
} from '@/composables/useViewerStore'
import { clearHighlight, highlightObject } from '@/composables/useHighlight'

const hasAnimations = computed(() => animations.value.length > 0)

function selectObject(obj: THREE.Object3D) {
  selectedMaterial.value = null
  selectedObject.value = obj
  highlightObject(obj)
}

function selectMaterial(mat: THREE.Material) {
  selectedObject.value = null
  selectedMaterial.value = mat
  clearHighlight()
}

function toggleVisible(obj: THREE.Object3D, e: Event) {
  e.stopPropagation()
  obj.visible = !obj.visible
}

// —— 动画控制 ——
const props = defineProps<{
  actions?: Record<string, THREE.AnimationAction | undefined>
}>()

const playingName = shallowRef<string | null>(null)

function playAnimation(name: string) {
  const action = props.actions?.[name]
  if (!action) return
  if (playingName.value && playingName.value !== name) {
    props.actions?.[playingName.value]?.fadeOut(0.3)
  }
  if (playingName.value === name) {
    if (action.paused) action.play()
    else action.paused = true
    return
  }
  action.reset().fadeIn(0.3).play()
  action.paused = false
  playingName.value = name
}
</script>

<template>
  <Tabs default-value="meshes" class="flex h-full flex-col">
    <TabsList class="mx-3 mt-3 grid w-[calc(100%-1.5rem)] grid-cols-3">
      <TabsTrigger value="meshes" class="gap-1">
        <Shapes class="size-3.5" />网格
      </TabsTrigger>
      <TabsTrigger value="materials" class="gap-1">
        <Layers class="size-3.5" />材质
      </TabsTrigger>
      <TabsTrigger v-if="hasAnimations" value="animations" class="gap-1">
        <Film class="size-3.5" />动画
      </TabsTrigger>
    </TabsList>

    <!-- Meshes -->
    <TabsContent value="meshes" class="scroll-thin mt-2 flex-1 overflow-y-auto px-3 pb-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-medium text-muted-foreground">场景节点</span>
        <Badge variant="secondary" class="font-normal">{{ sceneNodes.length }}</Badge>
      </div>
      <ul class="space-y-0.5">
        <li
          v-for="item in sceneNodes"
          :key="item.name + item.type"
          :class="cn(
            'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            selectedObject === item.object
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground',
          )"
          @click="selectObject(item.object)"
        >
          <component
            :is="item.type === 'Mesh' ? Package : Layers"
            class="size-3.5 shrink-0 opacity-70"
          />
          <span class="flex-1 truncate">{{ item.name }}</span>
          <span
            v-if="item.type === 'Mesh' && (item.triangles || item.vertices)"
            class="hidden text-[10px] tabular-nums opacity-60 lg:inline"
          >
            {{ item.triangles?.toLocaleString() }} 面
          </span>
          <button
            class="opacity-0 transition-opacity group-hover:opacity-100"
            :title="item.object.visible ? '隐藏' : '显示'"
            @click="toggleVisible(item.object, $event)"
          >
            <component :is="item.object.visible ? Eye : EyeOff" class="size-3.5" />
          </button>
        </li>
      </ul>
    </TabsContent>

    <!-- Materials -->
    <TabsContent value="materials" class="scroll-thin mt-2 flex-1 overflow-y-auto px-3 pb-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-medium text-muted-foreground">材质</span>
        <Badge variant="secondary" class="font-normal">{{ materials.length }}</Badge>
      </div>
      <ul class="space-y-0.5">
        <li
          v-for="item in materials"
          :key="item.name"
          :class="cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            selectedMaterial === item.material
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground',
          )"
          @click="selectMaterial(item.material)"
        >
          <Layers class="size-3.5 shrink-0 opacity-70" />
          <span class="flex-1 truncate">{{ item.name }}</span>
        </li>
      </ul>
    </TabsContent>

    <!-- Animations -->
    <TabsContent v-if="hasAnimations" value="animations" class="scroll-thin mt-2 flex-1 overflow-y-auto px-3 pb-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-medium text-muted-foreground">动画片段</span>
        <Badge variant="secondary" class="font-normal">{{ animations.length }}</Badge>
      </div>
      <p class="mb-2 text-xs text-muted-foreground">点击播放，再次点击暂停。</p>
      <Separator class="mb-2" />
      <ul class="space-y-0.5">
        <li
          v-for="item in animations"
          :key="item.uuid"
          :class="cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            playingName === item.name
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground',
          )"
          @click="playAnimation(item.name)"
        >
          <component :is="playingName === item.name ? Pause : Play" class="size-3.5 shrink-0 opacity-70" />
          <span class="flex-1 truncate">{{ item.name }}</span>
        </li>
      </ul>
    </TabsContent>
  </Tabs>
</template>
