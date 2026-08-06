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
import { useRouter } from 'vue-router'
import { Motion, AnimatePresence } from 'motion-v'
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

const router = useRouter()
const mediaStore = useMediaStore()
const libraryStore = useLibraryStore()

const PREVIEW_COUNT = 5 // 扇形展开的预览卡片数

// ----------------------------------------
// 状态
// ----------------------------------------
const isHovered = ref(false)

// 缩略图项：保留跳转 preview 路由所需的字段（id/libraryId/title/path/mimeType）
interface ThumbItem {
  id: string
  src: string
  title: string
  path?: string
  mimeType?: string
  libraryId?: string
}
const thumbnails = ref<ThumbItem[]>([])
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
  const arr: ThumbItem[] = []
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

// 动画过渡参数（spring 让扇形展开更有弹性）
const FAN_TRANSITION = { type: 'spring' as const, stiffness: 260, damping: 26 }

// 单张扇形卡片的动画目标：折叠态（藏在前板下）vs 展开态（扇形飞出）
function getFanTarget(index: number, hovered: boolean) {
  const l = fanLayout.value[index] ?? { rotation: 0, tx: 0, ty: 0 }
  if (hovered) {
    return {
      y: -100 + l.ty,
      x: l.tx,
      rotate: l.rotation,
      scale: 1,
      opacity: 1,
    }
  }
  return {
    y: 0,
    x: 0,
    rotate: 0,
    scale: 0.4,
    opacity: 0,
  }
}

// 每张卡片的 stagger 延迟（展开时从中间向两侧 / 从前到后依次出现）
function getFanDelay(index: number) {
  return index * 0.04
}

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
          path: f.path || '',
          mimeType: f.mimeType || 'application/octet-stream',
          libraryId: effectiveLibraryId.value,
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

// 点击缩略图：直接跳转 preview 路由（不再弹 lightbox）
const previewFile = (index: number) => {
  if (thumbnails.value.length === 0) return
  const realIndex = index % thumbnails.value.length
  const file = thumbnails.value[realIndex]
  if (!file?.id) return
  router.push({
    path: '/file-preview',
    query: {
      id: file.id,
      libraryId: file.libraryId || effectiveLibraryId.value,
      title: file.title || '未命名',
      path: file.path || '',
      mimeType: file.mimeType || 'application/octet-stream',
    },
  })
}

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

        <!-- 扇形预览卡片（motion-v 驱动：展开/折叠 + 进入/退出动画） -->
        <div class="fan-center">
          <AnimatePresence>
            <Motion
              v-for="(thumb, index) in previewThumbs"
              :key="thumb.id + '-' + index"
              as="div"
              class="fan-card"
              :initial="{ y: 0, x: 0, rotate: 0, scale: 0.4, opacity: 0 }"
              :animate="getFanTarget(index, isHovered)"
              :while-hover="{ scale: 1.25, y: -124 + (fanLayout[index]?.ty ?? 0), boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }"
              :exit="{ y: 0, x: 0, rotate: 0, scale: 0.4, opacity: 0 }"
              :transition="{ ...FAN_TRANSITION, delay: isHovered ? getFanDelay(index) : 0 }"
              :style="{ zIndex: 10 + index }"
              @click.stop="previewFile(index % thumbnails.length)"
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
            </Motion>
          </AnimatePresence>
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
  /* transform / opacity 由 motion-v 驱动，此处不再设 transition */
}
/* 注：hover 上浮 + 缩放由 motion-v 的 whileHover 接管，避免与动画 transform 冲突 */

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
</style>
