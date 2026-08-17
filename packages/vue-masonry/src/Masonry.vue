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
import type {
  MasonryColumns,
  MasonryEmits,
  MasonryItemMeta,
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

/** 宽高比字符串 -> height/width 比例 */
function aspectToRatio(aspect?: string): number | null {
  if (!aspect) return null
  const parts = aspect.split(/[:xX]/).map((n) => Number(n))
  if (parts.length !== 2 || parts.some((v) => !isFinite(v) || v <= 0)) return null
  const [w, h] = parts
  return h / w
}

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

interface PlacedItem<T> {
  key: string | number
  item: T
  index: number
  left: number
  top: number
  width: number
  height: number
  lazy: boolean
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

/** 贪心布局:每个 item 放到连续 colSpan 列中"当前最矮"的位置 */
function layout<T>(
  data: T[],
  columns: number,
  colWidth: number,
  gap: number,
  rowHeight: number,
  getMeta: ((item: T, i: number) => MasonryItemMeta | undefined) | undefined,
  getKey: (item: T, i: number) => string | number
): { items: PlacedItem<T>[]; totalHeight: number } {
  const items: PlacedItem<T>[] = []
  if (columns <= 0 || colWidth <= 0) return { items, totalHeight: 0 }

  // bottoms[k] = 第 k 列"下一个可用 top"(已含上方 gap)
  const bottoms = new Array(columns).fill(0)

  data.forEach((item, index) => {
    const meta = getMeta?.(item, index) ?? {}
    const cs = Math.min(Math.max(Math.floor(meta.colSpan ?? 1), 1), columns)

    // 在 [0, columns-cs] 内找 max(bottoms) 最小的起始列
    let bestStart = 0
    let minTop = Infinity
    for (let s = 0; s <= columns - cs; s++) {
      let top = 0
      for (let k = s; k < s + cs; k++) top = Math.max(top, bottoms[k])
      if (top < minTop) {
        minTop = top
        bestStart = s
      }
    }
    const top = minTop

    const width = cs * colWidth + (cs - 1) * gap
    let height: number
    if (typeof meta.height === "number") {
      height = meta.height
    } else {
      const ratio = aspectToRatio(meta.aspect)
      height = ratio != null ? width * ratio : (meta.rowSpan ?? 1) * rowHeight
    }

    for (let k = bestStart; k < bestStart + cs; k++) {
      bottoms[k] = top + height + gap
    }

    items.push({
      key: getKey(item, index),
      item,
      index,
      left: bestStart * (colWidth + gap),
      top,
      width,
      height,
      lazy: !!meta.lazy
    })
  })

  const totalHeight = Math.max(0, Math.max(...bottoms, 0) - gap)
  return { items, totalHeight }
}

/**
 * 智能填充布局:
 *  1. 宽图(colSpan>1)按原始顺序流式定位,作为保序锚点(跨列图必须保持相对位置才不违和)
 *  2. 记录宽图对齐时跨过的列内洞区,普通图(colSpan=1)先用 best-fit 回填洞区,
 *     再把剩余项目放到当前最矮列。
 * 代价:普通图之间的相对顺序会与原始数组不一致。
 */
function layoutFill<T>(
  data: T[],
  columns: number,
  colWidth: number,
  gap: number,
  rowHeight: number,
  getMeta: ((item: T, i: number) => MasonryItemMeta | undefined) | undefined,
  getKey: (item: T, i: number) => string | number
): { items: PlacedItem<T>[]; totalHeight: number } {
  const items: PlacedItem<T>[] = []
  if (columns <= 0 || colWidth <= 0) return { items, totalHeight: 0 }

  // bottoms[k] = 第 k 列"下一个可用 top"(已含上方 gap)
  const bottoms = new Array(columns).fill(0)
  const gapSlots: Array<{ column: number; top: number; maxBottom: number }> = []

  // 预解析每个 item 的占列数、高度、懒加载标记(避免对 getMeta 重复求值)
  const parsed = data.map((item, index) => {
    const meta = getMeta?.(item, index) ?? {}
    const cs = Math.min(Math.max(Math.floor(meta.colSpan ?? 1), 1), columns)
    const width = cs * colWidth + (cs - 1) * gap
    let height: number
    if (typeof meta.height === "number") {
      height = meta.height
    } else {
      const ratio = aspectToRatio(meta.aspect)
      height = ratio != null ? width * ratio : (meta.rowSpan ?? 1) * rowHeight
    }
    return { item, index, colSpan: cs, height, lazy: !!meta.lazy }
  })

  const pushPlacedItem = (
    p: { item: T; index: number; colSpan: number; height: number; lazy: boolean },
    startCol: number,
    top: number
  ) => {
    const width = p.colSpan * colWidth + (p.colSpan - 1) * gap
    items.push({
      key: getKey(p.item, p.index),
      item: p.item,
      index: p.index,
      left: startCol * (colWidth + gap),
      top,
      width,
      height: p.height,
      lazy: p.lazy
    })
  }

  const placeAtBottom = (
    p: { item: T; index: number; colSpan: number; height: number; lazy: boolean },
    startCol: number,
    top: number
  ) => {
    pushPlacedItem(p, startCol, top)
    for (let k = startCol; k < startCol + p.colSpan; k++) {
      bottoms[k] = top + p.height + gap
    }
  }

  // 1. 宽图流式定位(保序)
  for (const p of parsed) {
    if (p.colSpan <= 1) continue
    let bestStart = 0
    let minTop = Infinity
    for (let s = 0; s <= columns - p.colSpan; s++) {
      let top = 0
      for (let k = s; k < s + p.colSpan; k++) top = Math.max(top, bottoms[k])
      if (top < minTop) {
        minTop = top
        bestStart = s
      }
    }

    // 跨列项以最高列为 top;记录其他列被跨过的空间,供单列项稍后回填。
    for (let k = bestStart; k < bestStart + p.colSpan; k++) {
      const maxBottom = minTop - gap
      if (bottoms[k] < maxBottom) {
        gapSlots.push({ column: k, top: bottoms[k], maxBottom })
      }
    }
    placeAtBottom(p, bestStart, minTop)
  }

  // 2. 普通图先 best-fit 到跨列项留下的历史洞区。
  const singles = parsed.filter(p => p.colSpan === 1)
  const remainingSingles = new Set(singles)
  gapSlots.sort((a, b) => a.top - b.top || a.column - b.column)

  for (const slot of gapSlots) {
    while (remainingSingles.size > 0) {
      const capacity = slot.maxBottom - slot.top
      let best: (typeof singles)[number] | undefined
      let bestRemainder = Infinity

      for (const candidate of remainingSingles) {
        if (candidate.height > capacity) continue
        const remainder = capacity - candidate.height
        if (remainder < bestRemainder) {
          best = candidate
          bestRemainder = remainder
        }
      }

      if (!best) break
      pushPlacedItem(best, slot.column, slot.top)
      remainingSingles.delete(best)
      slot.top += best.height + gap
    }
  }

  // 3. 剩余普通图继续放到当前最矮列。
  for (const single of remainingSingles) {
    let minCol = 0
    let minBottom = bottoms[0]
    for (let k = 1; k < columns; k++) {
      if (bottoms[k] < minBottom) {
        minBottom = bottoms[k]
        minCol = k
      }
    }
    placeAtBottom(single, minCol, minBottom)
  }

  const totalHeight = Math.max(0, Math.max(...bottoms, 0) - gap)
  return { items, totalHeight }
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
    // fill 模式下 placed.items 顺序 ≠ 数据源顺序；按实际渲染顺序抛出 item 数组，
    // 供父组件修正"视觉顺序 ≠ 数据源顺序"相关逻辑（如 Shift 范围选择）
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
