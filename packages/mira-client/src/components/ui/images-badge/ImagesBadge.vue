<script lang="ts">
export type BadgeImage = { src: string; alt: string }
export type ImagesBadgeSize = "sm" | "md" | "lg"
export type ImagesBadgeShape = "circle" | "rounded" | "square"
</script>

<script setup lang="ts">
/**
 * 图片堆叠徽章（由 21st.dev nexus-ui/images-badge 的 React 版移植，motion-v 驱动）
 *
 * - 收起态：图片层层叠压、各自微旋转；悬停：弹簧展开成扇形（边缘下沉、隐藏卡延迟浮现），溢出部分显示 +N 圆形卡
 * - 尺寸 sm/md/lg、形状 circle/rounded/square、堆叠右上角可选数字徽章 label
 * - bare 模式去掉胶囊外壳，用于嵌入工具栏等已有容器
 * - 尊重系统"减少动态效果"：reduced 时不旋转、直接平铺
 *
 * 用法：
 *   <ImagesBadge :images="[{ src, alt }]" label="3" />
 */
import { computed, ref } from "vue"
import { Motion, useReducedMotion } from "motion-v"
import { cn } from "@/lib/utils"

defineOptions({ name: "ImagesBadge" })

const props = withDefaults(
  defineProps<{
    images: BadgeImage[]
    /** 收起时可见的图片数 */
    maxVisible?: number
    /** 悬停时额外展开的图片数 */
    revealCount?: number
    /** 堆叠右上角的数字徽章内容（如选中数量） */
    label?: string
    size?: ImagesBadgeSize
    shape?: ImagesBadgeShape
    /** 去掉胶囊外壳（嵌入场景） */
    bare?: boolean
    /** 声明为可点击（button 语义 + 键盘触发 click） */
    clickable?: boolean
    class?: string
    imageClass?: string
  }>(),
  {
    maxVisible: 3,
    revealCount: 2,
    label: undefined,
    size: "md",
    shape: "rounded",
    bare: false,
    clickable: false,
    class: undefined,
    imageClass: undefined,
  },
)

const emit = defineEmits<{ click: [] }>()

const hovered = ref(false)
const prefersReducedMotion = useReducedMotion()

// ── 尺寸 token：px = 卡片边长；pill = 胶囊间距；barePill = 无外壳版间距 ──
const CFG: Record<ImagesBadgeSize, { px: number; gap: number; pill: string; barePill: string; cnt: string }> = {
  sm: { px: 32, gap: 8, pill: "h-9 pl-2 pr-3.5 gap-2 text-[11px]", barePill: "gap-2 text-[11px]", cnt: "text-[9px]" },
  md: { px: 42, gap: 10, pill: "h-11 pl-2.5 pr-4 gap-2.5 text-xs", barePill: "gap-2.5 text-xs", cnt: "text-[10px]" },
  lg: { px: 56, gap: 12, pill: "h-14 pl-3 pr-5 gap-3 text-sm", barePill: "gap-3 text-sm", cnt: "text-[12px]" },
}

const SHAPE: Record<ImagesBadgeShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-[10px]",
  square: "rounded-[4px]",
}

const SPRING = { type: "spring", stiffness: 280, damping: 24 } as const

// 每张卡的"手摆"旋转角：index 0 = 栈底（z 最低），越大越靠前
const REST_ROT = [-14, -7, -2, 5, 11, -9, 3, -5]
const HOVER_ROT = [-8, -4, -1, 2, 6, -6, 2, -3]

// 展开态的弧线 Y 偏移：外圈下沉、中心最高
function arcY(i: number, total: number): number {
  if (total <= 1) return 0
  const mid = (total - 1) / 2
  const t = (i - mid) / mid // -1 … 0 … +1
  return t * t * (CFG[props.size].px * 0.22) // 抛物线：中心 0，边缘 ~px*0.22
}

const cfg = computed(() => CFG[props.size])
const rendered = computed(() => props.images.slice(0, props.maxVisible + props.revealCount))
const overflow = computed(() => Math.max(0, props.images.length - props.maxVisible - props.revealCount))
// overflow > 0 时末尾补一张 +N 圆形占位卡
const slots = computed<Array<BadgeImage | null>>(() =>
  overflow.value > 0 ? [...rendered.value, null] : rendered.value,
)
const total = computed(() => slots.value.length)

// ── 收起几何：图片叠压，每张只露出 peekPx ──
const peekPx = computed(() => Math.round(cfg.value.px * 0.32))
const collapsedW = computed(() => {
  if (total.value === 0) return 0
  return cfg.value.px + (Math.min(props.maxVisible, total.value) - 1) * peekPx.value
})

// ── 展开几何：平铺 + 间距 ──
const spreadW = computed(() => {
  if (total.value === 0) return 0
  return total.value * cfg.value.px + (total.value - 1) * cfg.value.gap
})
const spreadX = (i: number) => i * (cfg.value.px + cfg.value.gap)
const collapsedX = (i: number) => {
  if (i >= props.maxVisible) return (props.maxVisible - 1) * peekPx.value // 藏在最后一张可见卡后面
  return i * peekPx.value
}

// 图片条宽度动画（width 非 transform 键，手动拼 px 保证单位正确）
const stripAnim = computed(() => ({
  width: `${prefersReducedMotion.value ? collapsedW.value : hovered.value ? spreadW.value : collapsedW.value}px`,
}))

function cardAnim(i: number) {
  const isHidden = i >= props.maxVisible && slots.value[i] !== null
  const tx = hovered.value ? spreadX(i) : collapsedX(i)
  return {
    x: prefersReducedMotion.value ? spreadX(i) : tx,
    y: hovered.value ? arcY(i, total.value) : 0,
    rotate: prefersReducedMotion.value ? 0 : hovered.value ? (HOVER_ROT[i] ?? 0) : (REST_ROT[i] ?? 0),
    opacity: isHidden ? (hovered.value ? 1 : 0) : 1,
    scale: isHidden ? (hovered.value ? 1 : 0.6) : 1,
  }
}

// 隐藏卡展开时按序延迟浮现
function cardTransition(i: number) {
  const isHidden = i >= props.maxVisible && slots.value[i] !== null
  return {
    ...SPRING,
    delay: !prefersReducedMotion.value && isHidden ? (i - props.maxVisible) * 0.06 : 0,
  }
}

function cardClass(slot: BadgeImage | null) {
  const isOverflow = slot === null
  return cn(
    "absolute top-0 left-0 flex shrink-0 items-center justify-center",
    !isOverflow && "overflow-hidden",
    SHAPE[isOverflow ? "circle" : props.shape],
    "border-2 border-background dark:border-zinc-900",
    "shadow-[0_2px_8px_rgba(0,0,0,.28)]",
    isOverflow && "bg-muted",
    props.imageClass,
  )
}

const rootClass = computed(() =>
  cn(
    "inline-flex cursor-default select-none items-center rounded-full",
    !props.bare &&
      "border border-border/60 bg-background/90 backdrop-blur-sm transition-shadow duration-300",
    !props.bare &&
      "shadow-[0_2px_12px_rgba(0,0,0,.10)] dark:shadow-[0_2px_16px_rgba(0,0,0,.35)]",
    !props.bare &&
      "dark:bg-zinc-900/80 dark:border-white/[0.09]",
    !props.bare &&
      "hover:shadow-[0_6px_24px_rgba(0,0,0,.16)] dark:hover:shadow-[0_6px_28px_rgba(0,0,0,.55)]",
    props.bare ? cfg.value.barePill : cfg.value.pill,
    props.clickable && "cursor-pointer",
    props.class,
  ),
)

function onKeydown(e: KeyboardEvent) {
  if (!props.clickable) return
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    emit("click")
  }
}
</script>

<template>
  <Motion as="div" :class="rootClass" :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined" :while-hover="prefersReducedMotion ? undefined : { y: -2, scale: 1.015 }"
    :transition="SPRING" @mouseenter="hovered = true" @mouseleave="hovered = false" @keydown="onKeydown"
    @click="clickable && emit('click')">
    <!-- 图片条：宽度随收起/展开弹簧过渡 -->
    <Motion as="div" class="relative shrink-0" :style="{ height: `${cfg.px + 12}px` }" :animate="stripAnim"
      :transition="SPRING">
      <Motion v-for="(slot, i) in slots" :key="i" as="div" :class="cardClass(slot)"
        :style="{ width: `${cfg.px}px`, height: `${cfg.px}px`, zIndex: hovered ? i + 1 : total - i }"
        :animate="cardAnim(i)" :transition="cardTransition(i)">
        <span v-if="!slot" :class="cn('font-semibold text-muted-foreground', cfg.cnt)">+{{ overflow }}</span>
        <img v-else :src="slot.src" :alt="slot.alt" :width="cfg.px" :height="cfg.px" class="h-full w-full object-cover"
          draggable="false">
      </Motion>
      <!-- 数字徽章：堆叠右上角，始终浮在所有卡片之上；展开时隐藏（计数由 +N 溢出卡承担） -->
      <Transition name="images-badge-fade">
        <span v-if="label && !hovered" :style="{ zIndex: total + 2 }"
          class="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1.5 font-semibold leading-none text-primary-foreground text-[10px] shadow-sm">
          {{ label }}
        </span>
      </Transition>
    </Motion>
  </Motion>
</template>

<style scoped>
/* 数字徽章随堆叠展开/收起淡入淡出 */
.images-badge-fade-enter-active,
.images-badge-fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.images-badge-fade-enter-from,
.images-badge-fade-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
</style>
