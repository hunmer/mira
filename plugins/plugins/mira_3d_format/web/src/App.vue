<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type * as THREE from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { FolderOpen, Loader2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ModelScene from './ModelScene.vue'
import ViewerToolbar from './components/viewer/ViewerToolbar.vue'
import SceneTree from './components/viewer/SceneTree.vue'
import PropertyPanel from './components/viewer/PropertyPanel.vue'
import {
  ctxRef,
  fitCameraToObject,
  sceneRoot,
  selectedMaterial,
  selectedObject,
  store,
} from '@/composables/useViewerStore'
import { clearHighlight, disposeHighlight } from '@/composables/useHighlight'
import { host, watchTheme } from '@/lib/host'
import { useI18n } from '@/lib/i18n'

const { setLocale, t } = useI18n()
let offTheme: (() => void) | null = null
let offLocale: (() => void) | null = null

// ── 主题跟随：html.dark/.light 切换 token；画布/网格另需手动配色 ──
const isDark = ref(true)
const clearColor = computed(() => (isDark.value ? '#0b121b' : '#e9edf2'))
const gridColors = computed(() => (isDark.value ? ['#294458', '#162633'] : ['#c8d2dc', '#e4e9ef']))

// 从 URL query 读取文件信息
const params = new URLSearchParams(window.location.search)
store.fileName = params.get('fileName') || '3D model'
store.fileUrl = params.get('fileUrl') || ''
store.mimeType = params.get('mimeType') || ''

// iframe embed 模式：?embed=1，只展示最简全屏预览（画布 + 模型 + 轻量加载/错误提示）
const isEmbed = params.get('embed') === '1' || params.get('embed') === 'true'
const embedFileId = params.get('fileId') || ''

// 响应式模型路径：换文件时改变，useGLTF 内部 watch path 自动重载
const modelPath = computed(() => store.fileUrl)
const isLocalFile = computed(() => modelPath.value.startsWith('file:') || modelPath.value.startsWith('blob:'))

// 当前本地文件的 blob URL（换文件/卸载时需 revoke，避免内存泄漏）
let currentObjectUrl = ''

// 动画 actions（ModelScene 加载完成时写入）
const actions = shallowRef<Record<string, THREE.AnimationAction | undefined>>({})

// 隐藏的文件选择 input
const fileInput = ref<HTMLInputElement | null>(null)

/** 工具栏“打开”入口：触发系统文件选择器 */
function openFileDialog() {
  fileInput.value?.click()
}

/** 选择本地 glb/gltf → 生成 blob URL → 切换模型 */
function onFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 重置 input.value，允许重复选同一文件
  input.value = ''
  if (!file) return
  // 格式校验
  const name = file.name.toLowerCase()
  if (!name.endsWith('.glb') && !name.endsWith('.gltf')) {
    store.loadError = t('app.errType')
    return
  }
  // 清理上一个 blob
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = ''
  }
  currentObjectUrl = URL.createObjectURL(file)
  // 重置旧模型相关状态
  clearHighlight()
  selectedObject.value = null
  selectedMaterial.value = null
  store.loadError = ''
  // 不手动设 isLoading：ModelScene 的 watch(useGLTF.isLoading) 会自然同步
  store.fileName = file.name
  store.mimeType = file.type || (name.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json')
  // 赋值触发重载（useGLTF 内部 watch path）
  store.fileUrl = currentObjectUrl
}

/** ModelScene 加载完成回调：拿到动画 actions，并适配相机 */
function onModelLoaded(a: Record<string, THREE.AnimationAction | undefined>) {
  actions.value = a
  if (isEmbed) {
    window.parent.postMessage({ type: 'mira-3d-preview-loaded', fileId: embedFileId }, '*')
  }
  // 等画布渲染一帧后适配相机
  requestAnimationFrame(() => fitCameraToObject(sceneRoot.value))
}

function onModelError(error: unknown) {
  store.loadError = error instanceof Error ? error.message : t('app.errLoad')
  if (isEmbed) {
    window.parent.postMessage({ type: 'mira-3d-preview-error', fileId: embedFileId }, '*')
  }
}

function onCanvasReady(ctx: any) {
  ctxRef.value = ctx
  if (sceneRoot.value) fitCameraToObject(sceneRoot.value)
}

onMounted(() => {
  offTheme = watchTheme((dark) => { isDark.value = dark })
  offLocale = host?.onLocaleChanged?.((locale: string) => setLocale(locale)) || null
})

onBeforeUnmount(() => {
  offTheme?.()
  offLocale?.()
  disposeHighlight()
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
})

// 手机端 drawer 开关：左=场景树，右=属性面板
const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)
</script>

<template>
  <main class="flex h-full w-full flex-col bg-background text-foreground">
    <!-- ============ iframe embed 模式：仅全屏画布 + 轻量提示 ============ -->
    <div v-if="isEmbed" class="relative h-full w-full">
      <TresCanvas :clear-color="clearColor" shadows @ready="onCanvasReady">
        <TresPerspectiveCamera :position="([4, 3, 6] as any)" :fov="45" />
        <OrbitControls make-default :enable-damping="true" :auto-rotate="store.autoRotate" />

        <ModelScene v-if="modelPath" :path="modelPath" @loaded="onModelLoaded" @error="onModelError" />

        <TresAmbientLight :intensity="0.8" />
        <TresDirectionalLight :position="([5, 8, 5] as any)" :intensity="1.4" cast-shadow />
        <TresDirectionalLight :position="([-4, 3, -3] as any)" :intensity="0.4" />
      </TresCanvas>

      <!-- 轻量加载指示（右下角） -->
      <div
        v-if="store.isLoading"
        class="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
      >
        <Loader2 class="size-3.5 animate-spin" />
        {{ t('app.loading') }}
      </div>

      <!-- 轻量错误提示（居中底部） -->
      <div
        v-if="store.loadError"
        class="absolute bottom-3 left-1/2 z-10 max-w-[80%] -translate-x-1/2 rounded-md bg-red-900/70 px-3 py-1.5 text-center text-xs text-red-200 backdrop-blur-sm"
      >
        {{ store.loadError }}
      </div>
    </div>

    <!-- ============ 完整预览模式 ============ -->
    <template v-else>
      <!-- 顶栏工具条 -->
      <ViewerToolbar @open="openFileDialog" @open-left="leftDrawerOpen = true" @open-right="rightDrawerOpen = true" />

      <!-- 三栏主体 -->
      <div class="flex min-h-0 flex-1">
        <!-- 左栏：场景树（桌面端常驻） -->
        <aside
          class="scroll-thin fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col overflow-hidden border-r bg-card/95 shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:w-60 md:translate-x-0 md:bg-card/40 md:shadow-none xl:w-72"
          :class="leftDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
        >
          <!-- 手机端关闭按钮 -->
          <div class="flex justify-end p-2 md:hidden">
            <Button size="icon-sm" variant="ghost" :title="t('app.close')" @click="leftDrawerOpen = false">
              <X class="size-4" />
            </Button>
          </div>
          <SceneTree :actions="actions" />
        </aside>

        <!-- 手机端左 drawer 遮罩 -->
        <div
          v-if="leftDrawerOpen"
          class="fixed inset-0 z-30 bg-black/50 md:hidden"
          @click="leftDrawerOpen = false"
        />

        <!-- 中栏：画布 -->
        <section class="relative min-w-0 flex-1">
          <!-- 隐藏的文件选择器 -->
          <input
            ref="fileInput"
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            class="hidden"
            @change="onFileChosen"
          />

          <!-- TresCanvas 始终挂载，避免动态挂载渲染器导致的状态抖动 -->
          <TresCanvas :clear-color="clearColor" shadows @ready="onCanvasReady">
            <TresPerspectiveCamera :position="([4, 3, 6] as any)" :fov="45" />
            <OrbitControls make-default :enable-damping="true" />

            <!-- useGLTF 内部 watch path，换文件自动重载 -->
            <ModelScene v-if="modelPath" :path="modelPath" @loaded="onModelLoaded" @error="onModelError" />

            <!-- 灯光 -->
            <TresAmbientLight :intensity="0.6" />
            <TresDirectionalLight :position="([5, 8, 5] as any)" :intensity="1.4" cast-shadow />
            <TresDirectionalLight :position="([-4, 3, -3] as any)" :intensity="0.4" />

          <!-- 网格地面 -->
          <TresGridHelper
            v-if="store.showGrid"
            :args="[20, 20, gridColors[0], gridColors[1]]"
            :position="([0, 0, 0] as any)"
          />
          </TresCanvas>

          <!-- 空状态（覆盖在画布上） -->
          <div
            v-if="!modelPath"
            class="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground"
          >
            <X class="size-8 opacity-40" />
            <strong class="text-base text-foreground">{{ t('app.noModel') }}</strong>
            <span class="text-sm">{{ t('app.noModelHint') }}</span>
            <Button size="sm" class="mt-1 gap-1.5" @click="openFileDialog">
              <FolderOpen class="size-4" />
              {{ t('app.openFile') }}
            </Button>
          </div>

          <!-- 加载遮罩 -->
          <div
            v-if="store.isLoading"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm"
          >
            <Loader2 class="size-7 animate-spin text-primary" />
            <span class="text-sm text-muted-foreground">{{ t('app.loadingModel') }}</span>
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
            <span>{{ t('app.orbitHint') }}</span>
            <span v-if="isLocalFile" class="text-amber-400/70">{{ t('app.localFile') }}</span>
          </div>
        </section>

        <!-- 右栏：属性面板（桌面端常驻） -->
        <aside
          class="scroll-thin fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 flex-col overflow-hidden border-l bg-card/95 shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:translate-x-0 md:bg-card/40 md:shadow-none xl:w-72"
          :class="rightDrawerOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'"
        >
          <!-- 手机端关闭按钮 -->
          <div class="flex justify-end p-2 md:hidden">
            <Button size="icon-sm" variant="ghost" :title="t('app.close')" @click="rightDrawerOpen = false">
              <X class="size-4" />
            </Button>
          </div>
          <PropertyPanel />
        </aside>

        <!-- 手机端右 drawer 遮罩 -->
        <div
          v-if="rightDrawerOpen"
          class="fixed inset-0 z-30 bg-black/50 md:hidden"
          @click="rightDrawerOpen = false"
        />
      </div>
    </template>
  </main>
</template>
