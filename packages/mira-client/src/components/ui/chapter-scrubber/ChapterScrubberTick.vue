<script setup lang="ts">
/**
 * ChapterScrubber 内部刻度（不对外导出，由 ChapterScrubber 渲染）。
 * 宽度/不透明度/纵向缩放均为派生 MotionValue：指针经过时呈升余弦波纹隆起，
 * 全程无组件重渲染。
 */
import { toValue } from "vue"
import { Motion, useTransform, type MotionValue } from "motion-v"
import { cn } from "@/lib/utils"

defineOptions({ name: "ChapterScrubberTick" })

const props = defineProps<{
  index: number
  /** 指针所在行（弹簧平滑后的 MotionValue；getter 以支持减弱动效热切换） */
  pointer: () => MotionValue<number>
  /** 波纹强度 0~1（getter，同上） */
  strength: () => MotionValue<number>
  /** 波纹半径（行数） */
  radius: number
  /** 静息长度 px */
  restLength: number
  /** 波峰长度 px */
  peakLength: number
  isCurrent: boolean
}>()

// 升余弦波包：波峰处 1、超出半径为 0，两端零斜率无接缝
function bump(distance: number, radius: number) {
  if (distance >= radius) return 0
  return 0.5 * (1 + Math.cos(Math.PI * (distance / radius)))
}

function rise() {
  const pointer = toValue(props.pointer)
  const strength = toValue(props.strength)
  return strength.get() * bump(Math.abs(props.index - pointer.get()), props.radius)
}

const width = useTransform(() => `${props.restLength + rise() * (props.peakLength - props.restLength)}px`)
const opacity = useTransform(() => {
  const base = props.isCurrent ? 0.55 : 0.22
  return base + rise() * (1 - base)
})
// 峰值处仅轻微加粗（2px → ~2.8px）：长度承担主要起伏，粗细是次要线索
const scaleY = useTransform(() => 1 + rise() * 0.4)
</script>

<template>
  <Motion
    aria-hidden="true"
    as="span"
    :style="{ width, opacity, scaleY }"
    :class="cn('block h-[2px] rounded-full', props.isCurrent ? 'bg-primary' : 'bg-foreground')"
  />
</template>
