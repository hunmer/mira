<script setup lang="ts">
/**
 * 3D 动画文件夹卡片（由 React 3d-folder 移植）
 *
 * - 鼠标悬停时文件夹呈 3D 翻开，并扇形展开前几张缩略图预览卡片
 * - 点击卡片（或文件夹主体）抛出 select 事件，由父级打开对应文件夹 tab
 * - 缩略图按需懒加载：首次悬停时拉取文件夹内前 N 张文件，绑定 thumbnailPath || url
 *
 * 仅依赖 Vue ref/computed + CSS 3D 变换 + @lucide/vue 图标，无额外运行时依赖。
 */
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight, X, ExternalLink } from '@lucide/vue'
import { useMediaStore } from '@renderer/stores/media'
import { useLibraryStore } from '@renderer/stores/library'
import type { BrowserItem } from './GroupedCardBrowserDialog.vue'

defineOptions({ name: 'AnimatedFolderCard', inheritAttrs: false })

const props = defineProps<{
  item: BrowserItem
  /** 当前素材库 id（用于拉取缩略图） */
  libraryId?: string
}>()

const emit = defineEmits<{
  select: [raw: any]
}>()

const mediaStore = useMediaStore()
const libraryStore = useLibraryStore()

const PREVIEW_COUNT = 5 // 扇形展开的预览卡片数

// ----------------------------------------
// 状态
// ----------------------------------------
const isHovered = ref(false)
const isOpen = ref(false) // 缩略图大图预览
const lightboxIndex = ref(0)
const isSliding = ref(false)

const thumbnails = ref<{ id: string; src: string; title: string }[]>([])
const isLoadingThumbs = ref(false)
const hasLoadedThumbs = ref(false)

const folder = computed(() => props.item.raw || {})
const folderId = computed(() => folder.value.id)
const title = computed(() => props.item.label)
const totalCount = computed(() => props.item.count ?? folder.value.fileCount ?? 0)
const effectiveLibraryId = computed(() => props.libraryId || libraryStore.currentLibrary?.id || '')

// 预览项目（不足 PREVIEW_COUNT 时复用已有缩略图）
const previewThumbs = computed(() => {
  if (thumbnails.value.length === 0) return []
  const arr: { id: string; src: string; title: string }[] = []
  for (let i = 0; i < PREVIEW_COUNT; i++) {
    arr.push(thumbnails.value[i % thumbnails.value.length])
  }
  return arr
})

// 每张扇形卡片的定位参数（在 JS 算好，避免用 CSS abs() 等兼容性差的函数）
const fanLayout = computed(() => {
  const total = previewThumbs.value.length
  if (total === 0) return [] as { rotation: number; tx: number; ty: number }[]
  const middle = (total - 1) / 2
  return previewThumbs.value.map((_, index) => {
    const factor = total > 1 ? (index - middle) / middle : 0
    return {
      rotation: factor * 25,
      tx: factor * 85,
      ty: Math.abs(factor) * 12,
    }
  })
})

// ----------------------------------------
// 缩略图懒加载（首次悬停时触发）
// ----------------------------------------
async function loadThumbnails() {
  if (hasLoadedThumbs.value || isLoadingThumbs.value) return
  if (!effectiveLibraryId.value || folderId.value == null) return
  hasLoadedThumbs.value = true
  isLoadingThumbs.value = true
  try {
    const res = await mediaStore.fetchFiles({
      libraryId: effectiveLibraryId.value,
      filters: {
        folder: Number(folderId.value),
        limit: PREVIEW_COUNT,
        recycled: 0,
      },
    })
    if (res.success && Array.isArray(res.data)) {
      thumbnails.value = res.data
        .filter((f: any) => f.thumbnailPath || f.url)
        .map((f: any) => ({
          id: String(f.id),
          src: f.thumbnailPath || f.url,
          title: f.name,
        }))
    }
  } catch (e) {
    console.error('[AnimatedFolderCard] 加载缩略图失败:', e)
  } finally {
    isLoadingThumbs.value = false
  }
}

// 首次悬停即加载
watch(isHovered, h => {
  if (h) loadThumbnails()
})

// ----------------------------------------
// 交互
// ----------------------------------------
const onEnter = () => {
  isHovered.value = true
}
const onLeave = () => {
  isHovered.value = false
}

const openFolder = () => {
  emit('select', folder.value)
}

const openLightbox = (index: number) => {
  if (thumbnails.value.length === 0) return
  lightboxIndex.value = Math.min(index, thumbnails.value.length - 1)
  isOpen.value = true
}

const closeLightbox = () => {
  isOpen.value = false
}

const navigate = (dir: -1 | 1) => {
  if (isSliding.value) return
  const next = lightboxIndex.value + dir
  if (next < 0 || next >= thumbnails.value.length) return
  isSliding.value = true
  lightboxIndex.value = next
  window.setTimeout(() => (isSliding.value = false), 400)
}

const currentThumb = computed(() => thumbnails.value[lightboxIndex.value])

// 键盘交互
function onKeyDown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowRight') navigate(1)
  if (e.key === 'ArrowLeft') navigate(-1)
}
watch(isOpen, open => {
  if (open) window.addEventListener('keydown', onKeyDown)
  else window.removeEventListener('keydown', onKeyDown)
})

// ----------------------------------------
// CSS 变量：文件夹面板配色（基于 folder color 或主题色）
// ----------------------------------------
const folderCssVars = computed(() => {
  const color = props.item.color
  const c = color != null ? `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}` : null
  // 没有自定义颜色时，回退到主题的 primary/muted
  if (!c) {
    return {
      '--folder-front': 'var(--primary)',
      '--folder-back': 'var(--muted)',
      '--folder-tab': 'var(--muted-foreground)',
      '--folder-accent': 'var(--primary)',
    }
  }
  return {
    '--folder-front': c,
    '--folder-back': `color-mix(in oklch, ${c} 70%, black)`,
    '--folder-tab': `color-mix(in oklch, ${c} 60%, black)`,
    '--folder-accent': c,
  }
})
</script>

<template>
  <div class="folder-card-wrap" @mouseenter="onEnter" @mouseleave="onLeave">
    <div
      class="folder-card"
      :style="folderCssVars"
      @click="openFolder"
    >
      <!-- 悬停光晕 -->
      <div class="folder-glow" />

      <!-- 3D 文件夹主体 + 扇形预览卡片 -->
      <div class="folder-stage">
        <!-- 后板 -->
        <div class="folder-panel folder-panel-back" />
        <!-- 标签 tab -->
        <div class="folder-panel folder-panel-tab" />

        <!-- 扇形预览卡片（居中定位，由 transform 分散） -->
        <div class="fan-center">
          <div
            v-for="(thumb, index) in previewThumbs"
            :key="thumb.id + '-' + index"
            class="fan-card"
            :class="{ 'fan-card-hidden': isLoadingThumbs }"
            :style="{
              '--idx': index,
              '--total': previewThumbs.length,
              zIndex: 10 + index,
            }"
            @click.stop="openLightbox(index % thumbnails.length)"
          >
            <img
              v-if="thumb.src"
              :src="thumb.src"
              :alt="thumb.title"
              class="fan-card-img"
              loading="lazy"
            />
            <div class="fan-card-overlay" />
            <p class="fan-card-title">{{ thumb.title }}</p>
          </div>
          <!-- 加载占位 -->
          <div v-if="isLoadingThumbs && previewThumbs.length === 0" class="fan-loading">
            <span class="material-icons" style="font-size: 16px">hourglass_top</span>
          </div>
        </div>

        <!-- 前板 -->
        <div class="folder-panel folder-panel-front" />
        <div class="folder-panel folder-panel-front-shine" />
      </div>

      <!-- 标题 + 计数 -->
      <div class="folder-meta">
        <h3 class="folder-title">{{ title }}</h3>
        <p class="folder-count">{{ totalCount }} 个文件</p>
      </div>

      <!-- 悬停提示 -->
      <div class="folder-hint">
        <span class="material-icons" style="font-size: 13px">touch_app</span>
        <span>悬停预览</span>
      </div>
    </div>

    <!-- 缩略图大图预览（轻量 lightbox，点击外部关闭） -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="lightbox"
        @click="closeLightbox"
      >
        <div class="lightbox-backdrop" />
        <button class="lightbox-close" @click.stop="closeLightbox">
          <X :size="20" :stroke-width="2.5" />
        </button>
        <button
          v-if="thumbnails.length > 1"
          class="lightbox-nav lightbox-prev"
          :disabled="lightboxIndex <= 0"
          @click.stop="navigate(-1)"
        >
          <ChevronLeft :size="24" :stroke-width="3" />
        </button>
        <div class="lightbox-content" @click.stop>
          <img
            v-if="currentThumb"
            :src="currentThumb.src"
            :alt="currentThumb.title"
            class="lightbox-img"
            :key="currentThumb.id"
          />
          <div class="lightbox-caption">
            <h3 class="lightbox-title">{{ currentThumb?.title }}</h3>
            <div class="lightbox-dots">
              <button
                v-for="(t, idx) in thumbnails"
                :key="t.id"
                class="lightbox-dot"
                :class="{ active: idx === lightboxIndex }"
                @click.stop="lightboxIndex = idx"
              />
            </div>
            <span class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ thumbnails.length }}</span>
            <button class="lightbox-open" @click.stop="openFolder">
              <span>打开文件夹</span>
              <ExternalLink :size="14" />
            </button>
          </div>
        </div>
        <button
          v-if="thumbnails.length > 1"
          class="lightbox-nav lightbox-next"
          :disabled="lightboxIndex >= thumbnails.length - 1"
          @click.stop="navigate(1)"
        >
          <ChevronRight :size="24" :stroke-width="3" />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.folder-card-wrap {
  width: 100%;
  max-width: 320px;
}

.folder-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border-radius: 1rem;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--card);
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 280px;
  min-height: 320px;
  perspective: 1200px;
}

.folder-card:hover {
  box-shadow: 0 25px 50px -12px color-mix(in oklch, var(--folder-accent) 25%, transparent);
  border-color: color-mix(in oklch, var(--folder-accent) 40%, transparent);
  transform: scale(1.04) rotate(-1.5deg);
}

.folder-glow {
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  background: radial-gradient(circle at 50% 70%, var(--folder-accent) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.7s ease;
  pointer-events: none;
}
.folder-card:hover .folder-glow {
  opacity: 0.12;
}

/* ---------- 3D 舞台 ---------- */
.folder-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  height: 160px;
  width: 200px;
}

.folder-panel {
  position: absolute;
  width: 128px;
  height: 96px;
  border-radius: 0.5rem;
  transform-origin: bottom center;
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.folder-panel-back {
  background: linear-gradient(135deg, var(--folder-back) 0%, var(--folder-accent) 100%);
  border: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 10;
  filter: brightness(0.9);
}
.folder-card:hover .folder-panel-back {
  transform: rotateX(-20deg) scaleY(1.05);
}

.folder-panel-tab {
  width: 48px;
  height: 16px;
  border-radius: 0.375rem 0.375rem 0 0;
  background: var(--folder-tab);
  border: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
  top: calc(50% - 48px - 12px);
  left: calc(50% - 64px + 16px);
  filter: brightness(0.85);
}
.folder-card:hover .folder-panel-tab {
  transform: rotateX(-30deg) translateY(-3px);
}

.folder-panel-front {
  background: linear-gradient(135deg, var(--folder-front) 0%, var(--folder-back) 100%);
  border: 1px solid color-mix(in oklch, var(--foreground) 20%, transparent);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  top: calc(50% - 48px + 4px);
  z-index: 30;
}
.folder-card:hover .folder-panel-front {
  transform: rotateX(35deg) translateY(12px);
}

.folder-panel-front-shine {
  top: calc(50% - 48px + 4px);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 60%);
  border: none;
  pointer-events: none;
  z-index: 31;
}
.folder-card:hover .folder-panel-front-shine {
  transform: rotateX(35deg) translateY(12px);
}

/* ---------- 扇形预览卡片 ---------- */
.fan-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
}

.fan-card {
  position: absolute;
  width: 80px;
  height: 112px;
  left: -40px;
  top: -56px;
  cursor: pointer;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid color-mix(in oklch, var(--foreground) 5%, transparent);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  background: var(--muted);
  /* 由 --idx/--total 计算扇形位置 */
  transform: translateY(0) translateX(0) rotate(0deg) scale(0.4);
  opacity: 0;
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease;
  transition-delay: calc(var(--idx) * 50ms);
}
.fan-card-hidden {
  opacity: 0 !important;
}

.folder-card:hover .fan-card {
  /* 中间索引居中，两侧分散 + 旋转 + 上移 */
  --factor: calc((var(--idx) - (var(--total) - 1) / 2) / ((var(--total) - 1) / 2 || 1));
  --rotation: calc(var(--factor) * 25deg);
  --tx: calc(var(--factor) * 85px);
  --ty: calc(abs(var(--factor)) * 12px);
  transform: translateY(calc(-100px + var(--ty))) translateX(var(--tx)) rotate(var(--rotation)) scale(1);
  opacity: 1;
}
.fan-card:hover {
  /* 卡片自身 hover：上浮 + 高亮 */
  transform: translateY(-124px) translateX(var(--tx)) rotate(var(--rotation)) scale(1.25) !important;
  z-index: 99 !important;
  box-shadow: 0 20px 25px -5px color-mix(in oklch, var(--folder-accent) 40%, transparent);
}

.fan-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.fan-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 100%);
  pointer-events: none;
}
.fan-card-title {
  position: absolute;
  bottom: 6px;
  left: 6px;
  right: 6px;
  font-size: 9px;
  font-weight: 900;
  color: white;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  margin: 0;
}

.fan-loading {
  position: absolute;
  top: -56px;
  left: -40px;
  width: 80px;
  height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  background: var(--muted);
  border-radius: 0.5rem;
}

/* ---------- 标题/计数/提示 ---------- */
.folder-meta {
  text-align: center;
}
.folder-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 1rem 0 0;
  transition: transform 0.5s ease;
}
.folder-card:hover .folder-title {
  transform: translateY(2px);
}
.folder-count {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
  transition: opacity 0.5s ease;
}
.folder-card:hover .folder-count {
  opacity: 0.8;
}

.folder-hint {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: color-mix(in oklch, var(--muted-foreground) 50%, transparent);
  transition: all 0.5s ease;
}
.folder-card:hover .folder-hint {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* ---------- Lightbox ---------- */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: lightbox-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes lightbox-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.lightbox-backdrop {
  position: absolute;
  inset: 0;
  background: color-mix(in oklch, var(--background) 90%, transparent);
  backdrop-filter: blur(40px);
}
.lightbox-close,
.lightbox-nav {
  position: absolute;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--muted) 30%, transparent);
  backdrop-filter: blur(20px);
  border: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
  color: var(--foreground);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  cursor: pointer;
}
.lightbox-close {
  top: 1.5rem;
  right: 1.5rem;
  width: 48px;
  height: 48px;
}
.lightbox-close:hover {
  background: var(--muted);
}
.lightbox-nav {
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
}
.lightbox-nav:hover {
  transform: translateY(-50%) scale(1.1);
}
.lightbox-nav:active {
  transform: translateY(-50%) scale(0.95);
}
.lightbox-prev { left: 1rem; }
.lightbox-next { right: 1rem; }
.lightbox-nav:disabled {
  opacity: 0;
  pointer-events: none;
}

.lightbox-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 64rem;
  border-radius: 1.5rem;
  overflow: hidden;
  border: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
  background: var(--card);
  box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.5);
  animation: lightbox-zoom-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes lightbox-zoom-in {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.lightbox-img {
  width: 100%;
  max-height: 60vh;
  object-fit: cover;
  display: block;
  user-select: none;
}
.lightbox-caption {
  padding: 1.75rem 2rem;
  border-top: 1px solid color-mix(in oklch, var(--foreground) 5%, transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}
.lightbox-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lightbox-dots {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
}
.lightbox-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--muted-foreground) 30%, transparent);
  border: none;
  cursor: pointer;
  transition: all 0.5s ease;
  padding: 0;
}
.lightbox-dot.active {
  background: var(--foreground);
  transform: scale(1.5);
}
.lightbox-counter {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: color-mix(in oklch, var(--muted-foreground) 60%, transparent);
}
.lightbox-open {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--primary-foreground);
  background: var(--primary);
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px color-mix(in oklch, var(--primary) 30%, transparent);
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.lightbox-open:hover {
  filter: brightness(1.1);
  transform: scale(1.05);
}
.lightbox-open:active {
  transform: scale(0.95);
}
</style>
