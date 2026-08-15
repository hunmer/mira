<script lang="ts">
export type FolderColor = "blue" | "black" | "grey" | "yellow" | "orange" | "red"
export type FolderSize = "sm" | "md" | "lg"
</script>

<script setup lang="ts">
/**
 * 文件夹卡片（由 React 版 Folder 移植，motion-v 驱动）
 *
 * - 悬停时内部纸张动起来：后侧两张反向扇开（rotate ±4→±6），前纸整体上浮
 * - 尺寸 sm/md/lg、六种配色，左下角可选标签
 * - 原 framer-motion variants 传播改为 Vue hover 状态驱动 :animate，动画参数一致
 *
 * 注意：tabBridge 圆角遮罩用内联 mask-image —— 项目 tailwind 4.0 尚无 mask-* 工具类（4.1 引入）。
 */
import { computed, ref } from "vue"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"

defineOptions({ name: "Folder" })

const props = withDefaults(
  defineProps<{
    /** 文件夹配色 */
    color?: FolderColor
    /** 整体尺寸 */
    size?: FolderSize
    /** 左下角标签文本 */
    label?: string
    class?: string
  }>(),
  {
    color: "blue",
    size: "lg",
    label: undefined,
    class: undefined,
  },
)

const sizeMap: Record<
  FolderSize,
  {
    container: string
    tabLeft: string
    tabRight: string
    tabBridge: string
    flapBody: string
    papers: string
    paperOffset: string
    paperH: string
    paperContent: string
    label: string
    hoverY: number
    hoverBackY: number
  }
> = {
  sm: {
    container: "size-24 rounded-[24px]",
    tabLeft: "w-9 h-3 rounded-tl-lg",
    tabRight: "w-2 h-3 rounded-tr-[24px]",
    tabBridge: "w-2 h-2",
    flapBody: "h-9",
    papers: "inset-x-5 top-2",
    paperOffset: "top-1",
    paperH: "h-16",
    paperContent: "pt-2.5 px-2.5 space-y-1",
    label: "bottom-2 left-2 text-[9px] py-0.5 px-1.5",
    hoverY: -3,
    hoverBackY: -4,
  },
  md: {
    container: "size-32 rounded-[32px]",
    tabLeft: "w-12 h-4 rounded-tl-lg",
    tabRight: "w-2.5 h-4 rounded-tr-[32px]",
    tabBridge: "w-2.5 h-2.5",
    flapBody: "h-12",
    papers: "inset-x-6 top-3",
    paperOffset: "top-1.5",
    paperH: "h-24",
    paperContent: "pt-3 px-3 space-y-1",
    label: "bottom-3 left-3 text-[10px] py-0.5 px-1.5",
    hoverY: -3,
    hoverBackY: -5,
  },
  lg: {
    container: "size-40 rounded-[40px]",
    tabLeft: "w-16 h-5.5 rounded-tl-xl",
    tabRight: "w-3.25 h-5.5 rounded-tr-[40px]",
    tabBridge: "w-3.25 h-3.25",
    flapBody: "h-16",
    papers: "inset-x-8 top-4",
    paperOffset: "top-2",
    paperH: "h-30",
    paperContent: "pt-4 px-4 space-y-1.5",
    label: "bottom-4 left-4 text-xs py-1 px-2",
    hoverY: -4,
    hoverBackY: -6,
  },
}

const colorMap: Record<
  FolderColor,
  {
    folder: string
    flap: string
    paperBack: string
    paperFront: string
    paperLine: string
    paperBorder: string
    labelBg: string
    folderBorder: string
  }
> = {
  blue: {
    folder: "from-blue-400 to-blue-500",
    flap: "bg-blue-300/50",
    paperBack: "bg-blue-100/60",
    paperFront: "bg-blue-50",
    paperLine: "bg-blue-300/40",
    paperBorder: "border-blue-200",
    labelBg: "bg-blue-800/20",
    folderBorder: "border-white/30",
  },
  black: {
    folder: "from-neutral-800 to-neutral-900",
    flap: "bg-neutral-600/50",
    paperBack: "bg-neutral-500/60",
    paperFront: "bg-neutral-100",
    paperLine: "bg-neutral-300",
    paperBorder: "border-neutral-500",
    labelBg: "bg-white/10",
    folderBorder: "border-white/10",
  },
  yellow: {
    folder: "from-yellow-400 to-yellow-500",
    flap: "bg-yellow-200/50",
    paperBack: "bg-yellow-100/60",
    paperFront: "bg-yellow-50",
    paperLine: "bg-yellow-400/40",
    paperBorder: "border-yellow-200",
    labelBg: "bg-yellow-800/20",
    folderBorder: "border-white/30",
  },
  orange: {
    folder: "from-orange-400 to-orange-500",
    flap: "bg-orange-300/50",
    paperBack: "bg-orange-100/60",
    paperFront: "bg-orange-50",
    paperLine: "bg-orange-400/40",
    paperBorder: "border-orange-200",
    labelBg: "bg-orange-900/20",
    folderBorder: "border-white/30",
  },
  red: {
    folder: "from-red-400 to-red-500",
    flap: "bg-red-300/50",
    paperBack: "bg-red-100/60",
    paperFront: "bg-red-50",
    paperLine: "bg-red-400/40",
    paperBorder: "border-red-200",
    labelBg: "bg-red-900/20",
    folderBorder: "border-white/30",
  },
  grey: {
    folder: "from-gray-400 to-gray-500",
    flap: "bg-gray-300/50",
    paperBack: "bg-gray-200/60",
    paperFront: "bg-gray-100",
    paperLine: "bg-gray-400/40",
    paperBorder: "border-gray-300",
    labelBg: "bg-gray-800/20",
    folderBorder: "border-white/40",
  },
}

const spring = { type: "spring", stiffness: 300, damping: 22 } as const

const c = computed(() => colorMap[props.color])
const s = computed(() => sizeMap[props.size])

const hovered = ref(false)

// 后侧纸张：左右反向扇开（originY:1 → origin-bottom，绕底边旋转）
const backPaperRight = computed(() =>
  hovered.value ? { rotate: 6, y: s.value.hoverBackY } : { rotate: 4, y: 0 },
)
const backPaperLeft = computed(() =>
  hovered.value ? { rotate: -6, y: s.value.hoverBackY } : { rotate: -4, y: 0 },
)
// 前侧纸张：整体上浮
const frontPaper = computed(() => (hovered.value ? { y: s.value.hoverY } : { y: 0 }))

// 桥接块圆角遮罩（tailwind 4.0 无 mask-* 工具类，内联实现）
const bridgeMask = "radial-gradient(200% 200% at 100% 0%, transparent 50%, black 50%)"
const bridgeStyle = {
  maskImage: bridgeMask,
  "-webkit-mask-image": bridgeMask,
}
</script>

<template>
  <div
    :aria-label="props.label ?? 'Folder'"
    :class="cn(
      'relative cursor-pointer overflow-hidden border-t-2 bg-linear-to-b',
      s.container,
      c.folder,
      c.folderBorder,
      props.class,
    )"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- 前挡板 -->
    <div class="absolute right-0 bottom-0 left-0 z-20">
      <div class="flex items-end">
        <div :class="cn(s.tabLeft, 'backdrop-blur-sm', c.flap)" />
        <div :class="cn(s.tabRight, 'backdrop-blur-sm', c.flap)" />
        <div :class="cn(s.tabBridge, c.flap)" :style="bridgeStyle" />
      </div>
      <div :class="cn(s.flapBody, 'rounded-tr-xl backdrop-blur-sm', c.flap)" />
    </div>

    <!-- 纸张 -->
    <div :class="cn('absolute z-10', s.papers)">
      <!-- 后纸：向右扇 -->
      <Motion
        :animate="backPaperRight"
        :transition="spring"
        class="absolute inset-x-0 origin-bottom rounded-2xl"
        :class="cn(s.paperOffset, s.paperH, c.paperBack)"
      />
      <!-- 后纸：向左扇 -->
      <Motion
        :animate="backPaperLeft"
        :transition="spring"
        class="absolute inset-x-0 origin-bottom rounded-2xl"
        :class="cn(s.paperOffset, s.paperH, c.paperBack)"
      />
      <!-- 前纸：直接抬起 -->
      <Motion
        :animate="frontPaper"
        :transition="spring"
        class="absolute inset-x-0 top-0 rounded-xl border-t"
        :class="cn(s.paperH, c.paperFront, c.paperBorder)"
      >
        <div :class="s.paperContent">
          <div :class="cn('h-1 w-3/4 rounded-full', c.paperLine)" />
          <div :class="cn('h-1 w-1/2 rounded-full', c.paperLine)" />
          <div :class="cn('h-1 w-2/3 rounded-full', c.paperLine)" />
        </div>
      </Motion>
    </div>

    <!-- 标签 -->
    <div v-if="props.label" :class="cn('absolute z-20 rounded-full', s.label, c.labelBg)">
      <span class="font-medium text-white">{{ props.label }}</span>
    </div>
  </div>
</template>
