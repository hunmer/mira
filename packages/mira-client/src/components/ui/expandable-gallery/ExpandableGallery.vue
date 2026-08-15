<script lang="ts">
export interface GalleryItem {
  /** 稳定唯一标识（参与 layoutId 共享布局动画） */
  id: string
  /** 图片地址 */
  src: string
  alt?: string
  /** 以下仅作用于未展开的堆叠态：旋转角(deg)、位移(px)、层叠顺序 */
  rotation?: number
  x?: number
  y?: number
  zIndex?: number
}
</script>

<script setup lang="ts">
/**
 * 可展开画廊（复刻自 21st.dev larsen66/expandable-gallery，motion-v 驱动）
 *
 * - 默认态：前 3 张卡按 rotation/x/y/zIndex 堆叠散落，hover 时上浮旋转衰减
 * - 点击卡片展开为 grid-cols-2 lg:grid-cols-3 网格；
 *   展开态点击卡片区域外或 "Go back" 收起
 * - 展开/收起经 layoutId 共享布局动画：卡片与内图从旧位置平滑形变到新位置
 *
 * 与原版的差异：
 * - 去掉了原版堆叠态下方的标题与 CTA 按钮（按需可自行在组件外部搭配）
 * - next/image(fill) → 原生 img 绝对定位填充（无 Next 图片管线依赖）
 * - lucide-react → @lucide/vue（ArrowLeft）
 * - framer-motion IdProvider → layoutId 直接加 useId 前缀防多实例冲突
 */
import { computed, onMounted, onUnmounted, ref, useId } from "vue"
import { AnimatePresence, Motion } from "motion-v"
import { ArrowLeft } from "@lucide/vue"
import { cn } from "@/lib/utils"

defineOptions({ name: "ExpandableGallery" })

const props = withDefaults(
  defineProps<{
    /** 画廊条目；未展开时仅前 3 张参与堆叠 */
    items: GalleryItem[]
    /** 展开态左上角返回按钮文案 */
    backLabel?: string
    class?: string
  }>(),
  {
    items: () => [],
    backLabel: "Go back",
    class: undefined,
  },
)

const emit = defineEmits<{
  /** 由堆叠态展开为网格 */
  expand: []
  /** 由网格收起为堆叠态（外点 / Go back） */
  collapse: []
}>()

// 与原版 gc 一致的共享布局弹簧
const SPRING = { type: "spring", stiffness: 160, damping: 18, mass: 1 } as const
// 堆叠态 hover 的更脆弹簧
const HOVER_SPRING = { type: "spring", stiffness: 400, damping: 25 } as const
// 堆叠态参与散落的卡片数
const STACK_COUNT = 3

const expanded = ref(false)
const uid = useId()
// 外点检测的目标：网格/堆叠容器（原版 rM 绑定的 ref）
const gridRef = ref<HTMLElement | null>(null)

const visibleItems = computed(() => (expanded.value ? props.items : props.items.slice(0, STACK_COUNT)))

function setGridRef(node: unknown) {
  gridRef.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null
}

function expand() {
  if (expanded.value) return
  expanded.value = true
  emit("expand")
}

function collapse() {
  if (!expanded.value) return
  expanded.value = false
  emit("collapse")
}

// 原版 rM：mousedown/touchstart 落在容器外且处于展开态时收起
function onDocPointerDown(event: Event) {
  if (!expanded.value) return
  const el = gridRef.value
  if (!el) return
  if (event.target instanceof Node && el.contains(event.target)) return
  collapse()
}

onMounted(() => {
  document.addEventListener("mousedown", onDocPointerDown)
  document.addEventListener("touchstart", onDocPointerDown)
})
onUnmounted(() => {
  document.removeEventListener("mousedown", onDocPointerDown)
  document.removeEventListener("touchstart", onDocPointerDown)
})

// 卡片 layoutId 加 useId 命名空间，防多实例撞名
const cardLayoutId = (item: GalleryItem) => `${uid}-card-container-${item.id}`
const imageLayoutId = (item: GalleryItem) => `${uid}-image-inner-${item.id}`

// 堆叠态按数据散落，展开态全部归位
function cardAnimate(item: GalleryItem, index: number) {
  if (expanded.value) return { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, zIndex: 10 }
  return {
    opacity: 1,
    scale: 1,
    rotate: item.rotation ?? 0,
    x: item.x ?? 0,
    y: item.y ?? 0,
    zIndex: item.zIndex ?? index,
  }
}

function cardHover(item: GalleryItem) {
  if (expanded.value) return { scale: 1.02 }
  return {
    scale: 1.05,
    y: (item.y ?? 0) - 15,
    rotate: (item.rotation ?? 0) * 0.8,
    zIndex: 50,
    transition: HOVER_SPRING,
  }
}
</script>

<template>
  <section
    :class="cn(
      'relative w-full px-4 md:px-8 bg-background flex flex-col items-center justify-start min-h-[850px] overflow-hidden',
      props.class,
    )"
  >
    <div class="w-full max-w-6xl mx-auto flex flex-col items-center">
      <!-- 顶栏：展开态的返回按钮 -->
      <div class="w-full h-12 flex items-center justify-between px-4 mb-2">
        <AnimatePresence>
          <Motion
            v-if="expanded"
            as="button"
            type="button"
            :initial="{ opacity: 0, x: -10 }"
            :animate="{ opacity: 1, x: 0 }"
            :exit="{ opacity: 0, x: -10 }"
            class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group z-50"
            @click="collapse"
          >
            <div class="p-2 rounded-full bg-muted group-hover:bg-accent transition-colors text-foreground">
              <ArrowLeft :size="20" />
            </div>
            <span class="font-medium">{{ props.backLabel }}</span>
          </Motion>
        </AnimatePresence>
      </div>

      <!-- 堆叠 / 网格容器 -->
      <Motion
        :ref="setGridRef"
        layout
        :transition="SPRING"
        :class="cn(
          'relative w-full',
          expanded
            ? 'grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-4'
            : 'flex flex-col items-center justify-start pt-4',
        )"
      >
        <div
          :class="cn(
            'relative',
            expanded ? 'contents' : 'h-[450px] w-full flex items-center justify-center mb-8',
          )"
        >
          <Motion
            v-for="item in visibleItems"
            :key="item.id"
            :layout-id="cardLayoutId(item)"
            layout
            :initial="{ opacity: 0, scale: 0.9 }"
            :animate="cardAnimate(item, props.items.indexOf(item))"
            :transition="SPRING"
            :while-hover="cardHover(item)"
            :class="cn(
              'cursor-pointer overflow-hidden bg-muted',
              expanded
                ? 'relative aspect-square rounded-[2rem] md:rounded-[3rem] border-4 md:border-[6px] border-background shadow-lg'
                : 'absolute w-44 h-44 md:w-60 md:h-60 rounded-[2.5rem] md:rounded-[3rem] border-[6px] border-background shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
            )"
            @click="!expanded && expand()"
          >
            <Motion
              :layout-id="imageLayoutId(item)"
              layout="position"
              :transition="SPRING"
              class="w-full h-full relative"
            >
              <img
                :src="item.src"
                :alt="item.alt ?? ''"
                draggable="false"
                class="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              />
            </Motion>
          </Motion>
        </div>
      </Motion>
    </div>
  </section>
</template>
