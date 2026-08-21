<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { Loader2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SpineCanvas from './SpineCanvas.vue'
import ViewerToolbar from './components/viewer/ViewerToolbar.vue'
import BoneTree from './components/viewer/BoneTree.vue'
import AnimationPanel from './components/viewer/AnimationPanel.vue'
import InfoPanel from './components/viewer/InfoPanel.vue'
import { ensureRuntime } from './spine/runtime'
import { loadSpine, getAnimations, getSkins, BoneVisibility } from './spine/loader'

// 从 URL query 读资源信息（index.js 推导后传入）
const params = new URLSearchParams(window.location.search)
const skelUrl = params.get('skelUrl') || ''
const atlasUrl = params.get('atlasUrl') || ''
const pngUrl = params.get('pngUrl') || ''
const fileName = params.get('fileName') || 'Spine'

// iframe embed 模式：只展示全屏 canvas 预览
const isEmbed = params.get('embed') === '1' || params.get('embed') === 'true'
const embedFileId = params.get('fileId') || ''

const isLoading = ref(false)
const loadError = ref('')

// 已加载的 spine 实例 + 派生信息
const spine = shallowRef<any>(null)
const animations = ref<string[]>([])
const skins = ref<string[]>([])
const boneCount = ref(0)
const slotCount = ref(0)
const spineVersion = ref('')

// 显隐管理（骨骼树使用）
const visibility = new BoneVisibility()
// 触发骨骼树重渲染的版本号（toggle 后自增）
const visibilityRevision = ref(0)

const canvasRef = ref<InstanceType<typeof SpineCanvas> | null>(null)
const hasResource = computed(() => !!(skelUrl && atlasUrl && pngUrl))

/** fetch 三件套 → loadSpine → 挂载到 canvas */
async function loadResource() {
  if (!hasResource.value) {
    loadError.value = '资源 URL 不完整（缺少 skel/atlas/png）'
    notifyError()
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    await ensureRuntime()
    await canvasRef.value?.init()

    const [skelResp, atlasResp] = await Promise.all([fetch(skelUrl), fetch(atlasUrl)])
    if (!skelResp.ok) throw new Error(`加载 .skel/.json 失败 (${skelResp.status})`)
    if (!atlasResp.ok) throw new Error(`加载 .atlas 失败 (${atlasResp.status})`)

    // 判定 skel 是二进制还是 json：看 Content-Type 或首字节
    const skelBuf = await skelResp.arrayBuffer()
    const atlasText = await atlasResp.text()
    const bytes = new Uint8Array(skelBuf)
    const firstChar = bytes.length > 0 && bytes[0] < 128 ? String.fromCharCode(bytes[0]) : ''
    let skelInput: ArrayBuffer | Uint8Array | string
    // JSON 以 '{' 开头（0x7B）；二进制 .skel 首字节通常是较小整数
    if (firstChar === '{' || firstChar === '[') {
      skelInput = new TextDecoder().decode(bytes)
    } else {
      skelInput = bytes
    }

    const instance = await loadSpine({ skel: skelInput, atlas: atlasText, png: pngUrl, name: fileName })
    spine.value = instance
    animations.value = getAnimations(instance)
    skins.value = getSkins(instance)
    boneCount.value = instance.skeleton?.bones?.length || 0
    slotCount.value = instance.skeleton?.slots?.length || 0
    spineVersion.value = instance._spineVersion || ''

    visibility.reset(instance)
    canvasRef.value?.app?.setSpine(instance)
    // 资源就绪后通知 iframe 父级
    if (isEmbed) {
      window.parent.postMessage({ type: 'mira-spine-preview-loaded', fileId: embedFileId }, '*')
    }
  } catch (e: any) {
    console.error('[SpinePreview] load failed', e)
    loadError.value = e?.message || 'Spine 资源加载失败'
    notifyError()
  } finally {
    isLoading.value = false
  }
}

function notifyError() {
  if (isEmbed) {
    window.parent.postMessage({ type: 'mira-spine-preview-error', fileId: embedFileId }, '*')
  }
}

// === 右栏/工具栏事件 ===
function onAnimationChange(name: string) {
  canvasRef.value?.app?.setAnimation(name)
}
function onSkinChange(name: string) {
  canvasRef.value?.app?.setSkin(name)
}
function onPlayingChange(playing: boolean) {
  canvasRef.value?.app?.setPlaying(playing)
}
function onSpeedChange(speed: number) {
  canvasRef.value?.app?.setPlaybackSpeed(speed)
}
function onFit() {
  canvasRef.value?.app?.fitView()
}
function onVisibilityToggle() {
  visibilityRevision.value++
}

onBeforeUnmount(() => {
  visibility.reset(spine.value)
})

// 启动加载
loadResource()
</script>

<template>
  <main class="flex h-full w-full flex-col bg-background text-foreground">
    <!-- ============ iframe embed 模式：仅全屏画布 + 轻量提示 ============ -->
    <div v-if="isEmbed" class="relative h-full w-full">
      <SpineCanvas ref="canvasRef" />

      <div
        v-if="isLoading"
        class="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
      >
        <Loader2 class="size-3.5 animate-spin" />
        加载中…
      </div>

      <div
        v-if="loadError"
        class="absolute bottom-3 left-1/2 z-10 max-w-[80%] -translate-x-1/2 rounded-md bg-red-900/70 px-3 py-1.5 text-center text-xs text-red-200 backdrop-blur-sm"
      >
        {{ loadError }}
      </div>
    </div>

    <!-- ============ 完整预览模式 ============ -->
    <template v-else>
      <ViewerToolbar
        :file-name="fileName"
        :spine-version="spineVersion"
        @fit="onFit"
      />

      <div class="flex min-h-0 flex-1">
        <!-- 左栏：骨骼树 -->
        <aside class="scroll-thin flex w-60 shrink-0 flex-col overflow-hidden border-r bg-card/40 xl:w-72">
          <BoneTree
            :spine="spine"
            :visibility="visibility"
            :revision="visibilityRevision"
            @visibility-change="onVisibilityToggle"
          />
        </aside>

        <!-- 中栏：画布 -->
        <section class="relative min-w-0 flex-1">
          <SpineCanvas ref="canvasRef" />

          <!-- 空状态 -->
          <div
            v-if="!hasResource"
            class="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground"
          >
            <X class="size-8 opacity-40" />
            <strong class="text-base text-foreground">未提供资源</strong>
            <span class="text-sm">请从媒体网格双击 .skel 文件打开预览。</span>
          </div>

          <!-- 加载遮罩 -->
          <div
            v-if="isLoading"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm"
          >
            <Loader2 class="size-7 animate-spin text-primary" />
            <span class="text-sm text-muted-foreground">正在加载 Spine 资源…</span>
          </div>

          <!-- 错误横幅 -->
          <div
            v-if="loadError"
            class="absolute bottom-4 left-1/2 z-10 max-w-[80%] -translate-x-1/2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-center text-sm text-red-300"
          >
            {{ loadError }}
          </div>

          <!-- 底部提示 -->
          <div class="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 text-xs text-muted-foreground/70">
            <span>骨骼动画预览（只读）</span>
            <Button v-if="spine" size="xs" variant="ghost" class="pointer-events-auto" @click="onFit">适配视角</Button>
          </div>
        </section>

        <!-- 右栏：动画/皮肤/信息 -->
        <aside class="scroll-thin flex w-64 shrink-0 flex-col overflow-y-auto border-l bg-card/40 xl:w-72">
          <AnimationPanel
            :animations="animations"
            :skins="skins"
            @animation-change="onAnimationChange"
            @skin-change="onSkinChange"
            @playing-change="onPlayingChange"
            @speed-change="onSpeedChange"
          />
          <InfoPanel
            :bone-count="boneCount"
            :slot-count="slotCount"
            :animation-count="animations.length"
            :spine-version="spineVersion"
          />
        </aside>
      </div>
    </template>
  </main>
</template>
