<script setup lang="ts">
import { ref, shallowRef, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Upload, Layers, ImageIcon, Loader2 } from 'lucide-vue-next'
import { parsePsdFile, compositeLayers } from '@/composables/usePsd'
import type { LayerNode } from '@/types'
import LayerTree from '@/components/LayerTree.vue'
import Button from '@/components/ui/button/Button.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { host, watchTheme } from '@/lib/host'
import { useI18n } from '@/lib/i18n'

const { setLocale, t } = useI18n()
let offTheme: (() => void) | null = null
let offLocale: (() => void) | null = null

// 从 URL query 读资源信息（index.js 推导后传入）
const params = new URLSearchParams(window.location.search)
const psdUrl = params.get('psdUrl') || ''
const fileNameFromUrl = params.get('fileName') || 'PSD'

// iframe embed 模式（hovercard）：只展示分层预览，全屏布局
const isEmbed = params.get('embed') === '1' || params.get('embed') === 'true'
const embedFileId = params.get('fileId') || ''

const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const errorMsg = ref('')
const fileName = ref(psdUrl ? fileNameFromUrl : '')
const psdMeta = shallowRef<{ width: number; height: number } | null>(null)
const layerTree = ref<LayerNode[]>([])
const previewCanvas = ref<HTMLCanvasElement | null>(null)

function notifyParent(type: 'loaded' | 'error') {
  if (!isEmbed) return
  window.parent.postMessage(
    { type: type === 'loaded' ? 'mira-psd-preview-loaded' : 'mira-psd-preview-error', fileId: embedFileId },
    '*',
  )
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await loadFile(file)
  // 允许重复选择同一文件
  input.value = ''
}

async function loadFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.psd') && !file.name.toLowerCase().endsWith('.psb')) {
    errorMsg.value = t('app.errFileType')
    return
  }

  loading.value = true
  errorMsg.value = ''
  fileName.value = file.name

  try {
    const buffer = await file.arrayBuffer()
    await applyParsed(buffer)
  } catch (err: any) {
    console.error(err)
    handleParseError(err)
  } finally {
    loading.value = false
  }
}

/** fetch 主文件 URL → ArrayBuffer → ag-psd 解析 */
async function loadFromUrl(url: string) {
  if (!url) {
    errorMsg.value = t('app.errUrl')
    notifyParent('error')
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(t('app.errLoad', { status: resp.status }))
    const buffer = await resp.arrayBuffer()
    await applyParsed(buffer)
    // 资源就绪后通知 iframe 父级
    notifyParent('loaded')
  } catch (e: any) {
    console.error('[PsdPreview] load failed', e)
    handleParseError(e)
    notifyParent('error')
  } finally {
    loading.value = false
  }
}

async function applyParsed(buffer: ArrayBuffer) {
  const { width, height, tree } = await parsePsdFile(buffer)
  psdMeta.value = { width, height }
  layerTree.value = tree
  errorMsg.value = ''
  // canvas 由 v-if="psdMeta" 控制，首次设置后需等 DOM 挂载 + 布局稳定再绘制，
  // 否则 max-h-full 依赖的父容器高度尚未算好，导致首次高度错误（切换图层才恢复）。
  // 故用 nextTick（挂载 ref）→ requestAnimationFrame（等一帧布局）→ redraw。
  await nextTick()
  requestAnimationFrame(() => redraw())
}

function handleParseError(err: any) {
  errorMsg.value = err?.message || t('app.errParse')
  psdMeta.value = null
  layerTree.value = []
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function redraw() {
  if (!psdMeta.value || !previewCanvas.value) return
  const { width, height } = psdMeta.value
  if (!width || !height) return
  compositeLayers(layerTree.value, width, height, previewCanvas.value)
}

/** canvas 挂载后兜底绘制：v-if 切换会重新挂载 canvas，确保挂载后必然画一次 */
function onCanvasMounted() {
  nextTick(() => redraw())
}

// 可见性变化时重新合成
watch(layerTree, () => redraw(), { deep: true })

function triggerUpload() {
  fileInput.value?.click()
}

function setVisibleAll(list: LayerNode[], v: boolean) {
  for (const n of list) {
    n.visible = v
    if (n.children) setVisibleAll(n.children, v)
  }
}

function showAll() {
  setVisibleAll(layerTree.value, true)
  redraw()
}

function hideAll() {
  setVisibleAll(layerTree.value, false)
  redraw()
}

// 启动：有 psdUrl 自动加载（宿主调用）；无则显示拖放区（dev 调试）
onMounted(() => {
  offTheme = watchTheme()
  offLocale = host?.onLocaleChanged?.((locale: string) => setLocale(locale)) || null
  if (psdUrl) loadFromUrl(psdUrl)
})

onBeforeUnmount(() => {
  offTheme?.()
  offLocale?.()
})
</script>

<template>
  <main class="flex h-full w-full flex-col bg-background text-foreground">
    <!-- ============ iframe embed 模式：全屏分层预览 ============ -->
    <div v-if="isEmbed" class="flex h-full w-full min-h-0">
      <!-- 左：图层树（紧凑） -->
      <aside class="scroll-thin flex w-36 shrink-0 flex-col overflow-y-auto border-r bg-card/40">
        <div class="sticky top-0 z-10 flex items-center justify-between border-b bg-card/80 px-2 py-1.5 backdrop-blur-sm">
          <div class="flex items-center gap-1">
            <Layers class="size-3" />
            <span class="text-[11px] font-medium">{{ t('app.layers') }}</span>
          </div>
          <div class="flex gap-0.5">
            <button type="button" class="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground" @click="showAll">{{ t('app.show') }}</button>
            <button type="button" class="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground" @click="hideAll">{{ t('app.hide') }}</button>
          </div>
        </div>
        <div class="py-1">
          <LayerTree v-if="layerTree.length" :nodes="layerTree" @change="redraw" />
          <p v-else-if="!loading" class="px-2 text-[11px] text-muted-foreground">{{ t('app.noLayersShort') }}</p>
        </div>
      </aside>

      <!-- 右：合成预览 -->
      <section class="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden checker-bg">
        <canvas
          v-if="psdMeta"
          ref="previewCanvas"
          class="max-h-full max-w-full shadow-lg"
          style="image-rendering: auto"
          @vue:mounted="onCanvasMounted"
        />
        <Loader2 v-if="loading" class="absolute bottom-2 right-2 size-4 animate-spin text-muted-foreground" />
        <div
          v-if="errorMsg"
          class="absolute bottom-2 left-1/2 max-w-[80%] -translate-x-1/2 rounded bg-red-900/70 px-2 py-1 text-center text-[11px] text-red-200"
        >
          {{ errorMsg }}
        </div>
      </section>
    </div>

    <!-- ============ 完整预览模式（独立窗口） ============ -->
    <template v-else>
      <header class="border-b px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Layers class="h-5 w-5" />
            <h1 class="text-base font-semibold">{{ t('app.title') }}</h1>
            <span class="text-xs text-muted-foreground">{{ t('app.subtitle') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <input
              ref="fileInput"
              type="file"
              accept=".psd,.psb"
              class="hidden"
              @change="onFileChange"
            />
            <Button variant="outline" size="sm" @click="triggerUpload" :disabled="loading">
              <Upload class="h-4 w-4" />
              {{ t('app.choosePsd') }}
            </Button>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-auto p-6">
        <!-- 空状态 / 拖放区 -->
        <div
          v-if="!psdMeta && !loading"
          class="flex min-h-[420px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center"
          @drop="onDrop"
          @dragover="onDragOver"
        >
          <ImageIcon class="mb-4 h-12 w-12 text-muted-foreground/60" />
          <p class="mb-1 text-sm font-medium">{{ t('app.dropHint') }}</p>
          <p class="mb-4 text-xs text-muted-foreground">{{ t('app.dropSub') }}</p>
          <Button @click="triggerUpload">
            <Upload class="h-4 w-4" />
            {{ t('app.selectFile') }}
          </Button>
          <p v-if="errorMsg" class="mt-4 text-sm text-red-500">{{ errorMsg }}</p>
        </div>

        <!-- 加载中 -->
        <div v-else-if="loading" class="flex min-h-[420px] items-center justify-center">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          <span class="ml-2 text-sm text-muted-foreground">{{ t('app.loading', { name: fileName }) }}</span>
        </div>

        <!-- 主界面 -->
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <!-- 左侧：图层树 -->
          <Card class="h-fit max-h-[calc(100vh-180px)] overflow-hidden">
            <CardHeader class="border-b py-3">
              <div class="flex items-center justify-between">
                <CardTitle class="text-sm">{{ t('app.layers') }}</CardTitle>
                <div class="flex gap-1">
                  <Button variant="ghost" size="sm" class="h-7 text-xs" @click="showAll">{{ t('app.showAll') }}</Button>
                  <Button variant="ghost" size="sm" class="h-7 text-xs" @click="hideAll">{{ t('app.hideAll') }}</Button>
                </div>
              </div>
              <p class="truncate text-xs text-muted-foreground" :title="fileName">
                {{ fileName }}
                <template v-if="psdMeta"> · {{ psdMeta.width }}×{{ psdMeta.height }}</template>
              </p>
            </CardHeader>
            <CardContent class="scroll-thin max-h-[calc(100vh-260px)] overflow-y-auto py-3">
              <LayerTree v-if="layerTree.length" :nodes="layerTree" @change="redraw" />
              <p v-else class="text-sm text-muted-foreground">{{ t('app.noLayers') }}</p>
            </CardContent>
          </Card>

          <!-- 右侧：预览 -->
          <Card>
            <CardHeader class="border-b py-3">
              <CardTitle class="text-sm">{{ t('app.preview') }}</CardTitle>
              <p class="text-xs text-muted-foreground">
                {{ t('app.previewHint') }}
              </p>
            </CardHeader>
            <CardContent class="checker-bg flex items-center justify-center overflow-auto p-4">
              <canvas
                ref="previewCanvas"
                class="max-h-[70vh] max-w-full shadow-md"
                style="image-rendering: auto"
              />
            </CardContent>
          </Card>
        </div>

        <p v-if="errorMsg && psdMeta" class="mt-4 text-sm text-red-500">{{ errorMsg }}</p>
      </div>
    </template>
  </main>
</template>

<style scoped>
/* 透明背景棋盘格：让用户直观看到图层透明区域（浅色主题下用灰白棋盘） */
.checker-bg {
  background-color: #1a1a1a;
  background-image:
    linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
    linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
    linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

:global(.light) .checker-bg {
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #e2e2e2 25%, transparent 25%),
    linear-gradient(-45deg, #e2e2e2 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e2e2 75%),
    linear-gradient(-45deg, transparent 75%, #e2e2e2 75%);
}
</style>
