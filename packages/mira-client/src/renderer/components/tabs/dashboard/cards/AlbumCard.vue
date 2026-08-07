<template>
  <div ref="rootEl" class="album-card flex h-full w-full">
    <!-- 加载中 -->
    <div v-if="loading" class="flex flex-1 items-center justify-center text-muted-foreground">
      <span class="material-icons animate-spin">refresh</span>
    </div>

    <!-- 错误 -->
    <div
      v-else-if="error"
      class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground"
      @click="loadImages"
    >
      <StatusImage name="error" size="2rem" />
      <span class="text-xs">{{ error }}</span>
      <span class="text-xs text-primary">点击重试</span>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="images.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground"
    >
      <StatusImage name="empty" size="2rem" />
      <span class="text-xs">暂无图片</span>
    </div>

    <!-- 轮播：key 随配置整体变化，确保方向/每屏数量/自动播放参数切换后重建 Embla -->
    <Carousel
      v-else-if="ready"
      :key="carouselKey"
      class="h-full w-full"
      :orientation="config.orientation"
      :opts="carouselOpts"
      :plugins="autoplayPlugin"
      @init-api="onCarouselInit"
      @wheel="onWheel"
    >
      <CarouselContent class="h-full">
        <CarouselItem
          v-for="(img, idx) in images"
          :key="img.id"
          :class="[slideBasisClass, config.orientation === 'vertical' ? 'h-full' : '']"
        >
          <div
            class="group/img relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-muted/40"
            :class="config.orientation === 'horizontal' ? 'justify-center' : 'justify-center'"
            :title="img.name"
            @click="openPreview(img)"
          >
            <img
              :src="img.url"
              :alt="img.name"
              class="max-h-full max-w-full object-contain transition-transform group-hover/img:scale-[1.02]"
              draggable="false"
              @error="onImgError(idx, $event)"
            />
            <!-- 悬浮遮罩 + 预览提示 -->
            <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover/img:bg-black/20 group-hover/img:opacity-100">
              <span class="material-icons text-2xl text-white/90">visibility</span>
            </div>
            <!-- 底部文件名条 -->
            <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1">
              <p class="truncate text-xs text-white/90">{{ img.name }}</p>
            </div>
            <!-- 计数 -->
            <span class="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90">
              {{ idx + 1 }} / {{ images.length }}
            </span>
          </div>
        </CarouselItem>
      </CarouselContent>

      <!-- 左右/上下切换按钮（按配置显示） -->
      <CarouselPrevious v-if="config.showArrows" />
      <CarouselNext v-if="config.showArrows" />
    </Carousel>

    <!-- 容器尺寸就绪前的占位（仅极短瞬间，垂直模式依赖确定高度） -->
    <div v-else class="flex flex-1 items-center justify-center text-muted-foreground">
      <span class="material-icons animate-spin">refresh</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Autoplay from 'embla-carousel-autoplay'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import StatusImage from '@renderer/components/common/StatusImage.vue'
import { useLibraryStore } from '@renderer/stores/library'

/**
 * 相册小组件。
 * - 数据来源参考 HistoryPanel：miraSDKService.listFiles(libraryId, { sort:'imported_at', order:'desc' })
 *   只保留图片类型，取最近 N 张；展示用原图（url）而非缩略图。
 * - 用 shadcn-vue Carousel 展示，行为由卡片配置控制：
 *     autoplay / autoplayDuration(ms) / showArrows / orientation / slidesPerView(每屏张数)
 *
 * 关键点（垂直 autoplay 不工作的根因）：
 *   Embla 在 axis='y' 时要求容器有确定的高度，否则 slides 总高与视口相等，
 *   scrollSnapList().length <= 1，Autoplay 插件 init 阶段直接 return 不启动。
 *   本组件用 ResizeObserver 在容器尺寸确定后再渲染 Carousel（ready 标志），
 *   并保证 Carousel 根与内容都继承高度，从而让垂直模式也能正确分页与自动播放。
 */
interface AlbumImage {
  id: string
  name: string
  /** 原图 URL（非缩略图） */
  url: string
  /** 跳转预览路由所需字段 */
  libraryId?: string
  path?: string
  mimeType?: string
}

interface Props {
  /** 卡片配置（由 CardConfigDialog 编辑后透传） */
  config?: {
    autoplay?: boolean
    /** 滑条控件存的是 number[]，取首项 */
    autoplayDuration?: number[] | number
    showArrows?: boolean
    orientation?: 'horizontal' | 'vertical'
    /** 每屏显示几张图片（1-6），滑条控件存的是 number[] */
    slidesPerView?: number[] | number
  }
  /** 拉取数量上限，默认 20 */
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 20,
})

/** 把滑条控件可能存成数组的值归一化为 number */
function unwrapNum(v: number[] | number | undefined, fallback: number): number {
  if (Array.isArray(v)) return typeof v[0] === 'number' ? v[0] : fallback
  if (typeof v === 'number') return v
  return fallback
}

const config = computed(() => {
  const { autoplayDuration, slidesPerView, ...rest } = props.config ?? {}
  return {
    autoplay: true,
    showArrows: true,
    orientation: 'horizontal' as const,
    ...rest,
    // 滑条控件存的是 number[]，这里归一化成 number
    autoplayDuration: unwrapNum(autoplayDuration, 4000),
    slidesPerView: unwrapNum(slidesPerView, 1),
  }
})

const libraryStore = useLibraryStore()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const images = ref<AlbumImage[]>([])

/** 点击图片 → 跳转到预览路由（与 HomeView/index.vue openFilePreview 一致） */
function openPreview(img: AlbumImage) {
  router.push({
    path: '/file-preview',
    query: {
      id: img.id,
      libraryId: img.libraryId || '',
      title: img.name,
      path: img.path || img.url || '',
      mimeType: img.mimeType || 'image/*',
    },
  })
}

const isImage = (mimeType?: string) => !!mimeType && mimeType.startsWith('image/')

async function loadImages() {
  const libraryId = libraryStore.currentLibrary?.id
  if (!libraryId) {
    images.value = []
    loading.value = false
    error.value = '未选择素材库'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await miraSDKService.listFiles(libraryId, {
      sort: 'imported_at',
      order: 'desc',
      limit: props.limit,
      recycled: 0,
    })
    images.value = (result.files || [])
      .filter((f: any) => isImage(f.mimeType) && (f.url || f.thumbnailPath))
      .map((f: any) => ({
        id: String(f.id),
        name: f.name,
        // 展示原图，不用缩略图
        url: f.url || f.thumbnailPath,
        // 预览路由跳转所需
        libraryId: f.libraryId || libraryId,
        path: f.path,
        mimeType: f.mimeType,
      }))
  } catch (e: any) {
    console.error('[AlbumCard] 加载失败:', e)
    error.value = e?.message || '加载失败'
    images.value = []
  } finally {
    loading.value = false
  }
}

// 图片加载失败时降低透明度作为占位
function onImgError(_idx: number, e: any) {
  e.target.style.opacity = '0.15'
}

/** 每屏张数 -> CarouselItem 的 basis 宽（横向）/ 高（竖向）比例类 */
const slideBasisClass = computed(() => {
  const n = Math.min(6, Math.max(1, Number(config.value.slidesPerView) || 1))
  // 横向用 basis-1/n；竖向时 embla 仍按 basis 控制单个 slide 在轴上的占比
  const map: Record<number, string> = {
    1: 'basis-full',
    2: 'basis-1/2',
    3: 'basis-1/3',
    4: 'basis-1/4',
    5: 'basis-1/5',
    6: 'basis-1/6',
  }
  return map[n] || 'basis-full'
})

/** Embla 选项：loop 循环；containScroll 隐藏两端留白；slidesToScroll 按每屏张数滚动 */
const carouselOpts = computed(() => ({
  loop: images.value.length > 1,
  align: 'start' as const,
  containScroll: 'trimSnaps' as const,
  slidesToScroll: Math.min(6, Math.max(1, Number(config.value.slidesPerView) || 1)),
}))

/**
 * Autoplay 插件实例。仅在启用时提供。
 * Embla 在 v-model:layout 变化、配置变化后会随 :key 重建，插件随之重新 init。
 */
const autoplayPlugin = computed(() => {
  if (!config.value.autoplay) return []
  const delay = Math.max(500, Number(config.value.autoplayDuration) || 4000)
  return [Autoplay({ delay, stopOnInteraction: false, stopOnMouseEnter: true })]
})

// Embla 原生支持拖拽；滚轮事件需按方向主动驱动 snap，避免被仪表盘外层滚动吞掉。
const carouselApi = ref<any>(null)
function onCarouselInit(api: any) {
  carouselApi.value = api
}
function onWheel(event: WheelEvent) {
  if (config.value.orientation !== 'vertical' || !carouselApi.value || images.value.length < 2) return
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
  event.preventDefault()
  event.stopPropagation()
  if (event.deltaY > 0) carouselApi.value.scrollNext()
  else carouselApi.value.scrollPrev()
}

/**
 * Carousel 重建 key：方向 / 每屏张数 / autoplay 参数任一变化都重建，
 * 确保 Embla 重新测量容器尺寸（垂直模式尤其依赖此步骤）。
 */
const carouselKey = computed(
  () => `${config.value.orientation}-${config.value.slidesPerView}-${config.value.autoplay}-${config.value.autoplayDuration}`,
)

// 等容器获得确定尺寸后再渲染 Carousel，避免垂直模式因 0 高度导致 snapList<=1
const rootEl = ref<HTMLElement | null>(null)
const ready = ref(false)
let ro: ResizeObserver | null = null
function ensureReady() {
  if (ready.value || !rootEl.value) return
  const h = rootEl.value.clientHeight
  const w = rootEl.value.clientWidth
  if (h > 0 && w > 0) ready.value = true
}

onMounted(() => {
  loadImages()
  if (rootEl.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => ensureReady())
    ro.observe(rootEl.value)
  }
  ensureReady()
})
// 切库重新加载
watch(
  () => libraryStore.currentLibrary?.id,
  () => loadImages(),
)
</script>

<style scoped>
.album-card .material-icons {
  font-size: 20px;
}
.album-card .animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
