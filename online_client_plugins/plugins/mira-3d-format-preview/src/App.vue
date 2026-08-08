<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue'
import type * as THREE from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { Loader2, X } from 'lucide-vue-next'
// 注：X 仅用于空状态图标；closeWindow 由宿主窗口标题栏提供
import ModelScene from './ModelScene.vue'
import ModelRig from './components/viewer/ModelRig.vue'
import ViewerToolbar from './components/viewer/ViewerToolbar.vue'
import SceneTree from './components/viewer/SceneTree.vue'
import PropertyPanel from './components/viewer/PropertyPanel.vue'
import {
  ctxRef,
  fitCameraToObject,
  sceneRoot,
  store,
} from '@/composables/useViewerStore'
import { disposeHighlight } from '@/composables/useHighlight'

// 从 URL query 读取文件信息
const params = new URLSearchParams(window.location.search)
store.fileName = params.get('fileName') || '3D model'
store.fileUrl = params.get('fileUrl') || ''
store.mimeType = params.get('mimeType') || ''
const modelPath = store.fileUrl
const isLocalFile = modelPath.startsWith('file:')

// 加载到的模型根（交给 ModelRig 渲染）
const modelRoot = shallowRef<THREE.Object3D | null>(null)
// 动画 actions（ModelRig ready 时写入）
const actions = shallowRef<Record<string, THREE.AnimationAction | undefined>>({})

function onModelLoaded(model: any) {
  const root = model?.scene as THREE.Object3D | undefined
  if (root) {
    // 保留动画片段到根对象，供 ModelRig 的 useAnimations 读取
    ;(root as any).animations = model.animations || []
    modelRoot.value = root
  }
  // 等画布挂载后适配相机
  requestAnimationFrame(() => fitCameraToObject(root))
}

function onModelError(error: unknown) {
  store.loadError = error instanceof Error ? error.message : '无法加载模型，请检查文件 URL 或权限'
}

function onCanvasReady(ctx: any) {
  ctxRef.value = ctx
  // 适配相机（若模型已先于 ctx 就绪）
  if (sceneRoot.value) fitCameraToObject(sceneRoot.value)
}

function onActionsReady(a: Record<string, THREE.AnimationAction | undefined>) {
  actions.value = a
}

onBeforeUnmount(() => {
  disposeHighlight()
})
</script>

<template>
  <main class="flex h-full w-full flex-col bg-background text-foreground">
    <!-- 顶栏工具条 -->
    <ViewerToolbar />

    <!-- 三栏主体 -->
    <div class="flex min-h-0 flex-1">
      <!-- 左栏：场景树 -->
      <aside class="scroll-thin flex w-60 shrink-0 flex-col overflow-hidden border-r bg-card/40 xl:w-72">
        <SceneTree :actions="actions" />
      </aside>

      <!-- 中栏：画布 -->
      <section class="relative min-w-0 flex-1">
        <TresCanvas v-if="modelPath" clear-color="#0b121b" shadows @ready="onCanvasReady">
          <TresPerspectiveCamera :position="([4, 3, 6] as any)" :fov="45" />
          <OrbitControls make-default :enable-damping="true" />

          <Suspense>
            <ModelScene :path="modelPath" @loaded="onModelLoaded" @error="onModelError" />
            <ModelRig v-if="modelRoot" :model="modelRoot" @ready="onActionsReady" />
          </Suspense>

          <!-- 灯光 -->
          <TresAmbientLight :intensity="0.6" />
          <TresDirectionalLight :position="([5, 8, 5] as any)" :intensity="1.4" cast-shadow />
          <TresDirectionalLight :position="([-4, 3, -3] as any)" :intensity="0.4" />

          <!-- 网格地面 -->
          <TresGridHelper
            v-if="store.showGrid"
            :args="[20, 20, '#294458', '#162633']"
            :position="([0, 0, 0] as any)"
          />
        </TresCanvas>

        <!-- 空状态 -->
        <div
          v-else
          class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <X class="size-8 opacity-40" />
          <strong class="text-base text-foreground">未提供模型路径</strong>
          <span class="text-sm">请从媒体网格双击 GLB/GLTF 文件打开。</span>
        </div>

        <!-- 加载遮罩 -->
        <div
          v-if="store.isLoading"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm"
        >
          <Loader2 class="size-7 animate-spin text-primary" />
          <span class="text-sm text-muted-foreground">正在加载模型…</span>
        </div>

        <!-- 错误横幅 -->
        <div
          v-if="store.loadError"
          class="absolute bottom-4 left-1/2 z-10 max-w-[80%] -translate-x-1/2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-center text-sm text-red-300"
        >
          {{ store.loadError }}
        </div>

        <!-- 底部提示 -->
        <div
          class="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 text-xs text-muted-foreground/70"
        >
          <span>拖拽旋转 · 滚轮缩放 · 右键平移</span>
          <span v-if="isLocalFile" class="text-amber-400/70">本地文件</span>
        </div>
      </section>

      <!-- 右栏：属性面板 -->
      <aside class="scroll-thin flex w-64 shrink-0 flex-col overflow-hidden border-l bg-card/40 xl:w-72">
        <PropertyPanel />
      </aside>
    </div>
  </main>
</template>
