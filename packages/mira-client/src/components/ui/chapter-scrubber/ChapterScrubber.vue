<script lang="ts">
export interface Chapter {
  /** 章节稳定唯一标识 */
  id: string
  /** 预览卡片顶部加粗标题 */
  title: string
  /** 标题下方说明（最多三行截断） */
  description?: string
  /** 标题上方小号弱化标签（如时间戳、序号） */
  meta?: string
}
</script>

<script setup lang="ts">
/**
 * 章节刻度导航（由 React 版 ChapterScrubber 移植，motion-v 驱动）
 *
 * - 纵向均匀刻度轨，悬停/聚焦时指针附近刻度呈升余弦波纹隆起
 * - 波纹中心由近临界阻尼弹簧跟手，起伏由较柔弹簧过渡
 * - 预览卡片跟随指针纵向滑动并自动夹紧在轨道内，靠边时自动翻转展开方向
 * - 完整键盘可达：roving tabindex + 方向键/Home/End + Enter/Space 选中
 * - 减弱动效时去掉弹簧时间缓动，保留空间波纹
 *
 * 仅依赖 motion-v + cn 工具。
 */
import { computed, useId, ref, watch } from "vue"
import { Motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion-v"
import { cn } from "@/lib/utils"
import ChapterScrubberTick from "./ChapterScrubberTick.vue"

defineOptions({ name: "ChapterScrubber" })

const props = withDefaults(
  defineProps<{
    /** 自上而下渲染的章节，每章一行刻度 */
    chapters: Chapter[]
    /** 预览卡片展开方向，靠近视口边缘时自动翻转 */
    side?: "left" | "right"
    /** 波峰处刻度长度 px */
    peakLength?: number
    /** 刻度静息长度 px */
    restLength?: number
    /** 行高 px（即刻度间距），越小越密 */
    rowHeight?: number
    /** 波纹半径（行数）——起伏从指针扩散的距离 */
    radius?: number
    /** 标记为「当前」位置的章节 */
    currentIndex?: number
    /** 轨道的无障碍名称 */
    label?: string
    class?: string
  }>(),
  {
    side: "right",
    peakLength: 56,
    restLength: 14,
    rowHeight: 10,
    radius: 4,
    currentIndex: undefined,
    label: "Chapters",
    class: undefined,
  },
)

const emit = defineEmits<{
  /** 激活（悬停/聚焦）的章节变化；未激活时为 (null, -1) */
  "active-change": [chapter: Chapter | null, index: number]
  /** 点击、Enter 或 Space 选中章节 */
  select: [chapter: Chapter, index: number]
}>()

const CARD_WIDTH = 260
const GAP = 20
// 近临界阻尼弹簧：几乎无滞后、无过冲，波纹像吸附在指针上
const POINTER_SPRING = { stiffness: 700, damping: 52, mass: 0.5 }
// 更柔的弹簧：起伏优雅地隆起与回落
const STRENGTH_SPRING = { stiffness: 260, damping: 30, mass: 0.6 }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const prefersReducedMotion = useReducedMotion()
const containerRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
// 命名空间化，保证 option id 跨实例唯一，且不依赖 chapter.id 是合法 DOM id
const baseId = useId()
const optionId = (index: number) => `${baseId}-opt-${index}`

const rawPointer = useMotionValue(0)
const rawStrength = useMotionValue(0)
const springPointer = useSpring(rawPointer, POINTER_SPRING)
const springStrength = useSpring(rawStrength, STRENGTH_SPRING)
// 减弱动效：丢弃时间缓动但保留空间波纹，起伏即时呈现
const pointer = computed(() => (prefersReducedMotion.value ? rawPointer : springPointer))
const strength = computed(() => (prefersReducedMotion.value ? rawStrength : springStrength))

const activeIndex = ref(0)
const engaged = ref(false)
const flipped = ref(false)
const cardHeight = ref(0)

// 非渲染用的镜像状态，普通变量即可
let hovering = false
let focusedIndex: number | null = null
let activeMirror = 0
const buttonEls: Array<HTMLElement | null> = []

const last = computed(() => props.chapters.length - 1)

function commitActive(index: number) {
  if (index !== activeMirror) {
    activeMirror = index
    activeIndex.value = index
  }
}

watch(
  [engaged, activeIndex, () => props.chapters],
  () => {
    emit(
      "active-change",
      engaged.value ? props.chapters[activeIndex.value] ?? null : null,
      engaged.value ? activeIndex.value : -1,
    )
  },
  { immediate: true },
)

// 量取卡片高度，纵向行程才能夹紧在轨道内
watch(
  [activeIndex, () => props.chapters],
  () => {
    if (cardRef.value) cardHeight.value = cardRef.value.offsetHeight
  },
  { immediate: true, flush: "post" },
)

// 卡片会溢出视口时翻向更空的一侧
watch(
  [engaged, activeIndex, () => props.side],
  () => {
    if (!engaged.value) return
    const el = containerRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = el.ownerDocument.defaultView?.innerWidth ?? 0
    const need = CARD_WIDTH + GAP + 8
    let useRight = props.side === "right"
    if (useRight && vw - rect.right < need && rect.left >= need) useRight = false
    if (!useRight && rect.left < need && vw - rect.right >= need) useRight = true
    flipped.value = useRight !== (props.side === "right")
  },
  { flush: "post" },
)

const resolvedSide = computed(() => {
  if (props.side === "right") return flipped.value ? "left" : "right"
  return flipped.value ? "right" : "left"
})

const totalHeight = computed(() => props.chapters.length * props.rowHeight)
// roving tabindex：同一时刻仅一个刻度可 Tab 聚焦
const rovingIndex = computed(() => (engaged.value ? activeIndex.value : props.currentIndex ?? 0))
const activeChapter = computed(() => props.chapters[activeIndex.value])

// 卡片纵向跟随：中心随指针行移动并夹紧在轨道内
const cardTop = useTransform(() => {
  const p = pointer.value.get()
  const half = cardHeight.value / 2
  const center = clamp((p + 0.5) * props.rowHeight, half, Math.max(half, totalHeight.value - half))
  return `${center - half}px`
})
const cardScale = useTransform(() => 0.97 + 0.03 * strength.value.get())
const cardX = useTransform(() => {
  const from = resolvedSide.value === "right" ? -6 : 6
  return from * (1 - strength.value.get())
})

const cardStyle = computed(() => {
  const style: {
    top: MotionValue<string>
    x: MotionValue<number>
    scale: MotionValue<number>
    opacity: MotionValue<number>
    left?: string
    right?: string
  } = { top: cardTop, x: cardX, scale: cardScale, opacity: strength.value }
  style[resolvedSide.value === "right" ? "left" : "right"] = `${props.peakLength + GAP}px`
  return style
})

function setButtonRef(index: number, el: unknown) {
  buttonEls[index] = (el as HTMLElement | null) ?? null
}

function setCardRef(node: unknown) {
  cardRef.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null
}

function engageAt(pointerRow: number, activeAt: number) {
  rawPointer.set(pointerRow)
  rawStrength.set(1)
  commitActive(clamp(activeAt, 0, last.value))
  if (!engaged.value) engaged.value = true
}

function onPointerMove(event: PointerEvent) {
  const el = listRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const row = (event.clientY - rect.top) / props.rowHeight - 0.5
  hovering = true
  engageAt(clamp(row, -0.5, last.value + 0.5), Math.round(row))
}

function onButtonFocus(index: number) {
  focusedIndex = index
  engageAt(index, index)
}

function onPointerLeave() {
  hovering = false
  if (focusedIndex != null) {
    rawPointer.set(focusedIndex)
  } else {
    rawStrength.set(0)
    engaged.value = false
  }
}

function onFocusOut(event: FocusEvent) {
  const related = event.relatedTarget
  if (related instanceof Node && listRef.value?.contains(related)) return
  focusedIndex = null
  if (!hovering) {
    rawStrength.set(0)
    engaged.value = false
  }
}

function onKeyDown(event: KeyboardEvent) {
  let next = focusedIndex ?? activeMirror
  switch (event.key) {
    case "ArrowDown":
    case "ArrowRight":
      next = Math.min(last.value, next + 1)
      break
    case "ArrowUp":
    case "ArrowLeft":
      next = Math.max(0, next - 1)
      break
    case "Home":
      next = 0
      break
    case "End":
      next = last.value
      break
    default:
      return
  }
  event.preventDefault()
  buttonEls[next]?.focus()
}
</script>

<template>
  <div ref="containerRef" :style="{ width: `${props.peakLength}px` }" :class="cn('relative', props.class)">
    <div
      ref="listRef"
      role="listbox"
      :aria-label="props.label"
      aria-orientation="vertical"
      :aria-activedescendant="engaged ? optionId(activeIndex) : undefined"
      class="flex w-full flex-col"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
      @keydown="onKeyDown"
      @focusout="onFocusOut"
    >
      <button
        v-for="(chapter, index) in props.chapters"
        :key="chapter.id"
        :id="optionId(index)"
        :ref="(el: any) => setButtonRef(index, el)"
        type="button"
        role="option"
        :aria-selected="index === props.currentIndex"
        :aria-label="chapter.description ? `${chapter.title}. ${chapter.description}` : chapter.title"
        :tabindex="index === rovingIndex ? 0 : -1"
        :style="{ height: `${props.rowHeight}px` }"
        :class="cn(
          'flex w-full items-center rounded-sm outline-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          resolvedSide === 'left' ? 'justify-end' : 'justify-start',
        )"
        @focus="onButtonFocus(index)"
        @click="emit('select', chapter, index)"
      >
        <ChapterScrubberTick
          :index="index"
          :pointer="() => pointer"
          :strength="() => strength"
          :radius="props.radius"
          :rest-length="props.restLength"
          :peak-length="props.peakLength"
          :is-current="index === props.currentIndex"
        />
      </button>
    </div>

    <Motion
      v-if="activeChapter"
      :ref="setCardRef"
      aria-hidden="true"
      :style="cardStyle"
      :class="cn(
        'pointer-events-none absolute z-10 w-[260px] rounded-2xl border border-border bg-popover px-4 py-3.5 text-popover-foreground',
        'shadow-[0_2px_6px_-2px_rgba(0,0,0,0.08),0_16px_36px_-12px_rgba(0,0,0,0.22)]',
        resolvedSide === 'right' ? 'origin-left' : 'origin-right',
      )"
    >
      <div v-if="activeChapter.meta" class="mb-1 text-xs font-medium tabular-nums text-muted-foreground">
        {{ activeChapter.meta }}
      </div>
      <div class="truncate text-sm font-semibold leading-snug tracking-[-0.01em]">
        {{ activeChapter.title }}
      </div>
      <p v-if="activeChapter.description" class="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {{ activeChapter.description }}
      </p>
    </Motion>
  </div>
</template>
