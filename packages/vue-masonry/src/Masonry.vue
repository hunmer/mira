<script setup lang="ts">
/**
 * Masonry —— 通用瀑布流公共组件
 *
 * 核心能力:
 *  1. 容器列数(数字 / 响应式断点);item 通过 getMeta 设置跨列(colSpan)、跨行(rowSpan)
 *  2. item 自定义宽高比 aspect("1:1" / "9:16" / "16:9" ...)或显式 height
 *  3. 容器 gap 间距
 *  4. item 懒加载(lazy,进入视窗才渲染内容)
 *  5. 出/入场动画(motion-v,支持 stagger)+ layout 位置过渡
 *  6. 容器按 item 自定义属性排序(sortBy,可多字段)
 *
 * 高度优先级:height > aspect > rowSpan × rowHeight
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { AnimatePresence, Motion } from "motion-v"
import { cn } from "./utils"
import LazyCell from "./LazyCell.vue"
import { layout, layoutFill } from "./layout"
import type {
  MasonryColumns,
  MasonryEmits,
  MasonryProps,
  MasonrySortOption
} from "./types"

type VT = MasonryProps["data"][number] // eslint-disable-line @typescript-eslint/no-explicit-any

const props = withDefaults(defineProps<MasonryProps<VT>>(), {
  columns: 3,
  gap: 16,
  rowHeight: 80,
  class: undefined,
  style: undefined,
  sortBy: undefined,
  getKey: undefined,
  getMeta: undefined,
  enterAnimation: true,
  exitAnimation: true,
  staggerDelay: 0.05,
  layoutTransition: true,
  layoutMode: "stream",
  lazyRootMargin: "300px"
})

const emit = defineEmits<MasonryEmits<VT>>()

const revealedKeys = ref<Set<string | number>>(new Set())

function handleCellReady(key: string | number): void {
  if (revealedKeys.value.has(key)) return
  revealedKeys.value = new Set([...revealedKeys.value, key])
}

/* --------------------------------------------------------------- helpers */

const TAILWIND_BP = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const

/** 按容器宽度解析列数(移动优先) */
function resolveColumns(width: number, cols: MasonryColumns): number {
  if (typeof cols === "number") return Math.max(1, Math.floor(cols))
  const w = width
  if (w >= TAILWIND_BP.xl && cols.xl) return cols.xl
  if (w >= TAILWIND_BP.lg && cols.lg) return cols.lg
  if (w >= TAILWIND_BP.md && cols.md) return cols.md
  if (w >= TAILWIND_BP.sm && cols.sm) return cols.sm
  return cols.base ?? 1
}

const PLACEHOLDER_COLORS = [
  "#dbeafe",
  "#dcfce7",
  "#fef3c7",
  "#fee2e2",
  "#ede9fe",
  "#cffafe",
  "#fce7f3",
  "#e2e8f0"
] as const

/** 根据稳定 key 生成稳定的随机感占位色,避免响应式重渲染时闪色。 */
function placeholderColor(key: string | number): string {
  const value = String(key)
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length]
}

/** 排序(不修改原数组) */
function sortData<T>(
  data: T[],
  sortBy: MasonrySortOption<T> | MasonrySortOption<T>[] | undefined
): T[] {
  if (!sortBy) return data
  const opts = Array.isArray(sortBy) ? sortBy : [sortBy]
  if (opts.length === 0) return data
  const arr = [...data]
  arr.sort((a, b) => {
    for (const o of opts) {
      const va = o.by(a)
      const vb = o.by(b)
      if (va === vb) continue
      const dir = o.order === "desc" ? -1 : 1
      // undefined 排到末尾
      if (va == null) return 1
      if (vb == null) return -1
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
    }
    return 0
  })
  return arr
}

/* ------------------------------------------------------------------ hooks */

// 容器宽度测量
const containerRef = ref<HTMLElement | null>(null)
const width = ref(0)
const layoutVersion = ref(0)
let ro: ResizeObserver | null = null

const refresh = () => {
  const containerWidth = containerRef.value?.clientWidth
  if (containerWidth) width.value = containerWidth
  layoutVersion.value++
}

defineExpose({ refresh })

onMounted(() => {
  const el = containerRef.value
  if (!el) return
  ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width
    if (w) width.value = w
  })
  ro.observe(el)
  width.value = el.clientWidth
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

/* --------------------------------------------------------------- computed */

const keyExtractor = computed(() => {
  const getKey = props.getKey
  return (item: VT, index: number): string | number =>
    getKey ? getKey(item, index) : ((item as any)?.id ?? index) // eslint-disable-line @typescript-eslint/no-explicit-any
})

// 1. 排序
const sorted = computed(() => sortData(props.data, props.sortBy))

// 2. 列数 / 列宽
const colCount = computed(() => resolveColumns(width.value, props.columns))
const colWidth = computed(() =>
  width.value > 0 ? (width.value - (colCount.value - 1) * props.gap) / colCount.value : 0
)

// 3. 布局(fill 模式智能回填空隙,stream 模式纯流式)
const placed = computed(() => {
  void layoutVersion.value
  const args = [colCount.value, colWidth.value, props.gap, props.rowHeight, props.getMeta, keyExtractor.value] as const
  return props.layoutMode === "fill"
    ? layoutFill(sorted.value, ...args)
    : layout(sorted.value, ...args)
})

/* --------------------------------------------------------------- 动画配置 */

const enterOpt = computed(() =>
  typeof props.enterAnimation === "object" ? props.enterAnimation : {}
)
const enterEnabled = computed(() => props.enterAnimation !== false)
const exitOpt = computed(() => (typeof props.exitAnimation === "object" ? props.exitAnimation : {}))
const exitEnabled = computed(() => props.exitAnimation !== false)

const enterFrom = computed(() => ({
  opacity: 0,
  y: 24,
  scale: 0.96,
  ...(enterOpt.value.from ?? {})
}))
const enterTransition = computed(() => ({
  duration: enterOpt.value.duration ?? 0.4,
  delay: props.staggerDelay,
  ease: "easeOut"
}))
const exitTransition = computed(() => ({
  duration: exitOpt.value.duration ?? 0.25,
  ease: "easeIn"
}))

/** item 入场 transition:首屏前 colCount 个 stagger,其余统一 */
function itemTransition(i: number): Record<string, unknown> {
  if (!enterEnabled.value) return { duration: 0 }
  if (i < colCount.value) {
    return { ...enterTransition.value, delay: i * props.staggerDelay }
  }
  return enterTransition.value
}

// motion-v 的 exit 期望 VariantLabels | VariantType,此处对象字面量结构匹配,
// 用 any 规避复杂的变体类型推导
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function itemExit(): any {
  return exitEnabled.value
    ? { opacity: 0, y: -20, scale: 0.96, transition: exitTransition.value }
    : { opacity: 0 }
}

/* 监听 placed 变化触发 after-render 事件(向上层暴露渲染完成)，并抛出实际渲染顺序 */
watch(
  () => placed.value,
  (val) => {
    emit("after-render")
    // 抛出实际布局处理顺序，供父组件处理 Shift 范围选择等顺序相关逻辑。
    if (val.items.length > 0) {
      emit("layout-order", val.items.map(p => p.item))
    }
  },
  { flush: "post" }
)
</script>

<template>
  <div ref="containerRef" :class="cn('masonry-container', props.class)"
    :style="{ height: `${placed.totalHeight}px`, ...props.style }">
    <AnimatePresence>
      <Motion v-for="(p, i) in placed.items" :key="p.key" :layout="props.layoutTransition"
        :initial="enterEnabled ? enterFrom : false" :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="itemExit()"
        :transition="itemTransition(i)" :style="{
          position: 'absolute',
          left: p.left,
          top: p.top,
          width: p.width,
          height: p.height,
          overflow: 'hidden',
          contain: 'layout paint'
        }">
        <LazyCell :lazy="p.lazy" :root-margin="props.lazyRootMargin" :placeholder-color="placeholderColor(p.key)"
          :revealed="revealedKeys.has(p.key)" @ready="handleCellReady(p.key)">
          <template #default="{ preload }">
            <slot :item="p.item" :index="p.index" :preload="preload" />
          </template>
        </LazyCell>
      </Motion>
    </AnimatePresence>
  </div>
</template>

<style scoped>
/* 等价于 Tailwind 的 `relative w-full`(脱离 Tailwind 运行时) */
.masonry-container {
  position: relative;
  width: 100%;
}
</style>
