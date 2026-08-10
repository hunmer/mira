<script setup lang="ts">
/**
 * 3D 倾斜卡片（由 React be-ui-tilt-card 移植）
 *
 * - 鼠标悬停时随光标位置做 3D rotateX/rotateY 倾斜
 * - 同时渲染跟随光标的径向光晕（glare），可用 glare=false 关闭
 * - 自动跳过「精确指针不可用」与「减弱动效」的环境
 *
 * 仅依赖 motion-v（useMotionValue/useSpring/useMotionTemplate/useReducedMotion）+ cn 工具。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'motion-v'
import { cn } from '@/lib/utils'

type MaybeElement = HTMLElement | null

defineOptions({ name: 'TiltCard', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 最大倾斜角度（deg） */
    max?: number
    /** 是否显示跟随光标的径向光晕 */
    glare?: boolean
    /** 透传给根节点的 class */
    class?: string
  }>(),
  {
    max: 12,
    glare: true,
    class: undefined,
  },
)

// 减弱动效：返回 Ref<boolean>
const reduce = useReducedMotion()

// 是否具备精确指针（hover:hover + pointer:fine）
const canHover = ref(false)
const HOVER_MQ = '(hover: hover) and (pointer: fine)'
let mq: MediaQueryList | null = null
const syncCanHover = () => {
  if (mq) canHover.value = mq.matches
}

onMounted(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return
  mq = window.matchMedia(HOVER_MQ)
  syncCanHover()
  mq.addEventListener?.('change', syncCanHover)
})
onUnmounted(() => {
  mq?.removeEventListener?.('change', syncCanHover)
  mq = null
})

// 仅在「非减弱动效 + 精确指针」时启用倾斜与光晕
const enabled = computed(() => !reduce.value && canHover.value)

// 鼠标驱动的基础 motion value
const rx = useMotionValue(0) // rotateX
const ry = useMotionValue(0) // rotateY
const gx = useMotionValue(50) // glare 中心 x(%)
const gy = useMotionValue(50) // glare 中心 y(%)

// 弹性跟随：与 React 版 SPRING_MOUSE 对齐
const SPRING_MOUSE = { stiffness: 200, damping: 15, mass: 0.3 }
const srx = useSpring(rx, SPRING_MOUSE)
const sry = useSpring(ry, SPRING_MOUSE)

const onMouseMove = (e: MouseEvent) => {
  const node = (e.currentTarget as MaybeElement) ?? null
  if (!node || !enabled.value) return

  const rect = node.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width
  const py = (e.clientY - rect.top) / rect.height

  ry.set((px - 0.5) * props.max)
  rx.set((0.5 - py) * props.max)
  gx.set(px * 100)
  gy.set(py * 100)
}

const onMouseLeave = () => {
  rx.set(0)
  ry.set(0)
}

// 模板拼接出 transform / glare 背景
const transform = useMotionTemplate`perspective(1000px) rotateX(${srx}deg) rotateY(${sry}deg)`
const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, var(--foreground), transparent 50%)`
</script>

<template>
  <Motion
    as="div"
    :style="{ transform, transformStyle: 'preserve-3d' }"
    :class="cn('relative overflow-hidden rounded-2xl will-change-transform', props.class)"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <slot />

    <Motion
      v-if="glare && enabled"
      aria-hidden="true"
      as="div"
      :style="{ background: glareBg }"
      class="pointer-events-none absolute inset-0 opacity-15"
    />
  </Motion>
</template>
