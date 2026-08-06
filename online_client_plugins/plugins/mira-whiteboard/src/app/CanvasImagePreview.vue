<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { WOVEN_CANVAS_KEY, useQuery } from '@woven-canvas/vue'
import { Asset, Block, Image as CanvasImage } from '@woven-canvas/core'

interface PreviewImage {
  entityId: number
  url: string
  name: string
  originalWidth: number
  originalHeight: number
  canvasWidth: number
  canvasHeight: number
  rotation: number
  flipX: boolean
  flipY: boolean
  uploadState: string
}

const wovenCanvas = inject(WOVEN_CANVAS_KEY)
if (!wovenCanvas) throw new Error('CanvasImagePreview must be used within WovenCanvas')

const imageEntities = useQuery([Block, CanvasImage, Asset] as const)
const previewImages = ref<PreviewImage[]>([])
const previewOpen = ref(false)
const activeEntityId = ref<number | null>(null)
const zoom = ref(1)
const previewRotation = ref(0)
const previewFlipX = ref(false)
const previewFlipY = ref(false)
const mainImageError = ref(false)
const dialogRef = ref<HTMLElement | null>(null)
let resolveVersion = 0

const activeIndex = computed(() => (
  previewImages.value.findIndex((item) => item.entityId === activeEntityId.value)
))
const activeImage = computed(() => (
  activeIndex.value >= 0 ? previewImages.value[activeIndex.value] : null
))

async function resolvePreviewImages() {
  const currentVersion = ++resolveVersion
  const activeWasResolved = activeEntityId.value !== null && previewImages.value.some(
    (item) => item.entityId === activeEntityId.value
  )
  const assetManager = wovenCanvas.getAssetManager()
  const results = await Promise.all(imageEntities.value.map(async (item, index) => {
    const block = item.block.value
    const image = item.image.value
    const asset = item.asset.value
    let url = ''
    if (assetManager && asset.identifier) {
      try {
        url = await assetManager.getDisplayUrl(asset.identifier, {
          width: image.width || Math.max(1, Math.round(block.size[0])),
          height: image.height || Math.max(1, Math.round(block.size[1])),
        }) || ''
      } catch {
        url = ''
      }
    }

    return {
      entityId: item.entityId,
      url,
      name: image.alt || `图片 ${index + 1}`,
      originalWidth: image.width,
      originalHeight: image.height,
      canvasWidth: Math.round(block.size[0]),
      canvasHeight: Math.round(block.size[1]),
      rotation: block.rotateZ,
      flipX: block.flip[0],
      flipY: block.flip[1],
      uploadState: asset.uploadState,
    } satisfies PreviewImage
  }))

  if (currentVersion !== resolveVersion) return
  previewImages.value = results
  if (!activeWasResolved && activeEntityId.value !== null) syncViewerToActiveImage()
  if (activeEntityId.value !== null && !results.some((item) => item.entityId === activeEntityId.value)) {
    closePreview()
  }
}

function openPreview(entityId: number) {
  activeEntityId.value = entityId
  syncViewerToActiveImage()
  mainImageError.value = false
  previewOpen.value = true
  void resolvePreviewImages()
}

function closePreview() {
  previewOpen.value = false
  activeEntityId.value = null
  zoom.value = 1
  mainImageError.value = false
}

function selectImage(entityId: number) {
  activeEntityId.value = entityId
  syncViewerToActiveImage()
  mainImageError.value = false
}

function previousImage() {
  if (previewImages.value.length < 2 || activeIndex.value < 0) return
  const index = (activeIndex.value - 1 + previewImages.value.length) % previewImages.value.length
  selectImage(previewImages.value[index].entityId)
}

function nextImage() {
  if (previewImages.value.length < 2 || activeIndex.value < 0) return
  const index = (activeIndex.value + 1) % previewImages.value.length
  selectImage(previewImages.value[index].entityId)
}

function zoomIn() {
  zoom.value = Math.min(4, Number((zoom.value + 0.25).toFixed(2)))
}

function zoomOut() {
  zoom.value = Math.max(0.25, Number((zoom.value - 0.25).toFixed(2)))
}

function resetZoom() {
  zoom.value = 1
}

function rotateLeft() {
  previewRotation.value -= Math.PI / 2
}

function rotateRight() {
  previewRotation.value += Math.PI / 2
}

function flipHorizontal() {
  previewFlipX.value = !previewFlipX.value
}

function flipVertical() {
  previewFlipY.value = !previewFlipY.value
}

function resetViewer() {
  zoom.value = 1
  previewRotation.value = 0
  previewFlipX.value = false
  previewFlipY.value = false
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }
  await dialogRef.value?.requestFullscreen()
}

function syncViewerToActiveImage() {
  zoom.value = 1
  previewRotation.value = activeImage.value?.rotation || 0
  previewFlipX.value = activeImage.value?.flipX || false
  previewFlipY.value = activeImage.value?.flipY || false
}

function handleOpenPreview(event: Event) {
  const entityId = Number((event as CustomEvent<{ entityId?: number }>).detail?.entityId)
  if (!Number.isFinite(entityId) || !imageEntities.value.some((item) => item.entityId === entityId)) return
  openPreview(entityId)
}

function handleKeydown(event: KeyboardEvent) {
  if (!previewOpen.value) return
  if (event.key === 'Escape') closePreview()
  else if (event.key === 'ArrowLeft') previousImage()
  else if (event.key === 'ArrowRight') nextImage()
  else if (event.key === '+' || event.key === '=') zoomIn()
  else if (event.key === '-') zoomOut()
  else if (event.key === '0') resetZoom()
  else return
  event.preventDefault()
  event.stopPropagation()
}

function formatRotation(radians: number) {
  const degrees = Math.round((radians * 180) / Math.PI)
  return `${degrees}°`
}

function formatUploadState(state: string) {
  const labels: Record<string, string> = {
    pending: '等待上传',
    uploading: '上传中',
    complete: '已完成',
    failed: '失败',
  }
  return labels[state] || state
}

watch(imageEntities, () => void resolvePreviewImages(), { deep: true, immediate: true })

onMounted(() => {
  window.addEventListener('whiteboard:open-image-preview', handleOpenPreview)
  document.addEventListener('keydown', handleKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('whiteboard:open-image-preview', handleOpenPreview)
  document.removeEventListener('keydown', handleKeydown, true)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="previewOpen" class="wb-image-preview-mask" @pointerdown.self="closePreview">
      <section
        ref="dialogRef"
        class="wb-image-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        @pointerdown.stop
      >
        <header class="wb-image-preview-header">
          <div class="wb-image-preview-heading">
            <span class="material-icons">image</span>
            <div>
              <strong>{{ activeImage?.name || '图片预览' }}</strong>
              <span>{{ activeIndex + 1 }} / {{ previewImages.length }}</span>
            </div>
          </div>
          <button type="button" class="wb-preview-icon-button" title="关闭" @click="closePreview">
            <span class="material-icons">close</span>
          </button>
        </header>

        <div class="wb-image-preview-content">
          <aside class="wb-image-thumbnail-rail" aria-label="图片缩略图">
            <button
              v-for="item in previewImages"
              :key="item.entityId"
              type="button"
              class="wb-image-thumbnail"
              :class="{ active: item.entityId === activeEntityId }"
              :title="item.name"
              @click="selectImage(item.entityId)"
            >
              <img v-if="item.url" :src="item.url" :alt="item.name">
              <span v-else class="material-icons">broken_image</span>
            </button>
          </aside>

          <main class="wb-image-viewer">
            <div class="wb-image-stage">
              <img
                v-if="activeImage?.url && !mainImageError"
                :key="activeImage.entityId"
                :src="activeImage.url"
                :alt="activeImage.name"
                :style="{
                  transform: `scale(${zoom}) rotate(${previewRotation}rad) scaleX(${previewFlipX ? -1 : 1}) scaleY(${previewFlipY ? -1 : 1})`,
                }"
                @error="mainImageError = true"
              >
              <div v-else class="wb-image-preview-empty">
                <span class="material-icons">broken_image</span>
                <span>图片暂时无法显示</span>
              </div>
              <div class="wb-image-viewer-toolbar">
                <button type="button" title="放大" @click="zoomIn"><span class="material-icons">zoom_in</span></button>
                <button type="button" title="缩小" @click="zoomOut"><span class="material-icons">zoom_out</span></button>
                <button type="button" title="重置缩放" @click="resetZoom"><span class="material-icons">zoom_out_map</span></button>
                <div class="wb-image-viewer-divider" />
                <button type="button" title="向左旋转" @click="rotateLeft"><span class="material-icons">rotate_90_degrees_ccw</span></button>
                <button type="button" title="向右旋转" @click="rotateRight"><span class="material-icons">rotate_90_degrees_cw</span></button>
                <div class="wb-image-viewer-divider" />
                <button type="button" title="水平翻转" @click="flipHorizontal"><span class="material-icons">flip</span></button>
                <button type="button" title="垂直翻转" @click="flipVertical"><span class="material-icons wb-preview-flip-vertical">flip</span></button>
                <div class="wb-image-viewer-divider" />
                <button type="button" title="重置" @click="resetViewer"><span class="material-icons">restart_alt</span></button>
                <button type="button" title="全屏" @click="toggleFullscreen"><span class="material-icons">fullscreen</span></button>
              </div>
            </div>
          </main>

          <aside class="wb-image-info-panel">
            <div class="wb-image-info-title">图片信息</div>
            <dl v-if="activeImage" class="wb-image-info-list">
              <div>
                <dt>名称</dt>
                <dd :title="activeImage.name">{{ activeImage.name }}</dd>
              </div>
              <div>
                <dt>原始尺寸</dt>
                <dd>{{ activeImage.originalWidth }} × {{ activeImage.originalHeight }} px</dd>
              </div>
              <div>
                <dt>画布尺寸</dt>
                <dd>{{ activeImage.canvasWidth }} × {{ activeImage.canvasHeight }} px</dd>
              </div>
              <div>
                <dt>旋转</dt>
                <dd>{{ formatRotation(activeImage.rotation) }}</dd>
              </div>
              <div>
                <dt>翻转</dt>
                <dd>{{ activeImage.flipX ? '水平' : '' }}{{ activeImage.flipX && activeImage.flipY ? '、' : '' }}{{ activeImage.flipY ? '垂直' : '' }}{{ !activeImage.flipX && !activeImage.flipY ? '无' : '' }}</dd>
              </div>
              <div>
                <dt>资源状态</dt>
                <dd>{{ formatUploadState(activeImage.uploadState) }}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.wb-image-preview-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 20, 26, 0.72);
  backdrop-filter: blur(3px);
}
.wb-image-preview-dialog {
  width: min(1400px, calc(100vw - 48px));
  height: min(860px, calc(100vh - 48px));
  min-width: 720px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dfe2e7;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
  font-family: var(--wov-font-family, sans-serif);
}
.wb-image-preview-dialog:fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  border: 0;
  border-radius: 0;
}
.wb-image-preview-header {
  height: 58px;
  flex: 0 0 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 18px;
  border-bottom: 1px solid #e6e8ec;
  background: #fff;
}
.wb-image-preview-heading { min-width: 0; display: flex; align-items: center; gap: 10px; }
.wb-image-preview-heading > .material-icons { color: #60646c; font-size: 21px; }
.wb-image-preview-heading div { min-width: 0; display: grid; gap: 2px; }
.wb-image-preview-heading strong {
  max-width: min(60vw, 720px);
  overflow: hidden;
  color: #202329;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wb-image-preview-heading div > span { color: #8a9099; font-size: 11px; }
.wb-preview-icon-button {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.wb-preview-icon-button { width: 34px; height: 34px; border-radius: 6px; color: #5d626b; }
.wb-preview-icon-button:hover { background: #f0f1f3; color: #202329; }
.wb-preview-icon-button .material-icons { font-size: 20px; }
.wb-image-preview-content {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) 260px;
}
.wb-image-thumbnail-rail {
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  border-right: 1px solid #e6e8ec;
  background: #f7f8f9;
}
.wb-image-thumbnail {
  width: 90px;
  height: 72px;
  display: grid;
  place-items: center;
  margin: 0 0 8px;
  padding: 3px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #e9ebee;
  color: #8a9099;
  cursor: pointer;
}
.wb-image-thumbnail:last-child { margin-bottom: 0; }
.wb-image-thumbnail:hover { border-color: #b9bec7; }
.wb-image-thumbnail.active { border-color: #6a58f2; box-shadow: 0 0 0 2px rgba(106, 88, 242, 0.18); }
.wb-image-thumbnail img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 3px; }
.wb-image-thumbnail .material-icons { font-size: 22px; }
.wb-image-viewer { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #1d2026; }
.wb-image-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 36px;
  background-color: #20242a;
  background-image: linear-gradient(45deg, #24282f 25%, transparent 25%), linear-gradient(-45deg, #24282f 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #24282f 75%), linear-gradient(-45deg, transparent 75%, #24282f 75%);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
}
.wb-image-stage > img {
  max-width: 92%;
  max-height: 92%;
  display: block;
  object-fit: contain;
  transform-origin: center;
  transition: transform 0.15s ease;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
}
.wb-image-preview-empty { display: grid; place-items: center; gap: 10px; color: #a8aeb7; font-size: 13px; }
.wb-image-preview-empty .material-icons { font-size: 34px; }
.wb-image-viewer-toolbar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #dfe2e7;
  border-radius: 999px;
  color: #626872;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  transform: translateX(-50%);
}
.wb-image-viewer-toolbar button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.wb-image-viewer-toolbar button:hover { color: #252930; background: #eceef1; }
.wb-image-viewer-toolbar .material-icons { font-size: 20px; }
.wb-image-viewer-divider { width: 1px; height: 24px; flex: 0 0 1px; background: #dfe2e7; }
.wb-preview-flip-vertical { transform: rotate(90deg); }
.wb-image-info-panel {
  min-width: 0;
  overflow-y: auto;
  border-left: 1px solid #e6e8ec;
  background: #fff;
}
.wb-image-info-title {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #eceef1;
  color: #25282e;
  font-size: 13px;
  font-weight: 600;
}
.wb-image-info-list { margin: 0; padding: 6px 16px; }
.wb-image-info-list > div { padding: 11px 0; border-bottom: 1px solid #eff0f2; }
.wb-image-info-list > div:last-child { border-bottom: 0; }
.wb-image-info-list dt { margin-bottom: 5px; color: #8a9099; font-size: 11px; }
.wb-image-info-list dd {
  margin: 0;
  overflow: hidden;
  color: #2e3238;
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
}
@media (max-width: 900px) {
  .wb-image-preview-mask { padding: 12px; }
  .wb-image-preview-dialog {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
    min-width: 0;
    min-height: 0;
  }
  .wb-image-preview-content { grid-template-columns: 84px minmax(0, 1fr) 210px; }
  .wb-image-thumbnail-rail { padding: 8px; }
  .wb-image-thumbnail { width: 66px; height: 56px; }
}
</style>
