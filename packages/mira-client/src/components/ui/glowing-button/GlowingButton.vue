<script setup lang="ts">
/**
 * 发光阴影按钮
 * 基于 GlowingShadow 视觉，加按钮语义、点击、预设配色与紧凑布局。
 *
 * 配色 preset：
 *   - rainbow（默认）/ mono / multi / blue / purple / green / sunset / ocean
 *   其中 blue/purple/green 为 mono 单色，sunset/ocean 为 multi 多色
 *
 * 用法：
 *   <GlowingButton @click="onClick">默认彩虹</GlowingButton>
 *   <GlowingButton preset="blue">蓝色</GlowingButton>
 *   <GlowingButton preset="sunset" size="lg">日落多色</GlowingButton>
 *   <GlowingButton color-mode="multi" :colors="['#ef4444','#10b981']">自定义多色</GlowingButton>
 */
import { computed, type CSSProperties } from "vue"
import { cn } from "@/lib/utils"
import { GlowingShadow } from "@/components/ui/glowing-shadow"

type ColorMode = "rainbow" | "mono" | "multi"
type Preset = "rainbow" | "mono" | "multi" | "blue" | "purple" | "green" | "sunset" | "ocean"
type Size = "sm" | "default" | "lg"

interface Props {
  /** 预设配色，等价于一次性设置 colorMode + color/colors */
  preset?: Preset
  /** 显式配色模式（覆盖 preset 派生） */
  colorMode?: ColorMode
  /** mono 颜色 */
  color?: string
  /** multi 颜色列表 */
  colors?: string[]
  /** 整体动画周期 */
  animationSpeed?: string
  /** 色相动画速度系数 */
  hueSpeed?: number
  /** 尺寸 */
  size?: Size
  /** 禁用 */
  disabled?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  preset: "rainbow",
  size: "default",
  disabled: false,
  animationSpeed: "4s",
  hueSpeed: 1,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const PRESETS: Record<Preset, { mode: ColorMode; color?: string; colors?: string[] }> = {
  rainbow: { mode: "rainbow" },
  mono: { mode: "mono", color: "#a855f7" },
  multi: { mode: "multi", colors: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"] },
  blue: { mode: "mono", color: "#3b82f6" },
  purple: { mode: "mono", color: "#a855f7" },
  green: { mode: "mono", color: "#22c55e" },
  sunset: { mode: "multi", colors: ["#f59e0b", "#ef4444", "#ec4899"] },
  ocean: { mode: "multi", colors: ["#06b6d4", "#3b82f6", "#6366f1"] },
}

const resolved = computed(() => {
  const base = PRESETS[props.preset]
  return {
    mode: props.colorMode ?? base.mode,
    color: props.color ?? base.color,
    colors: props.colors ?? base.colors,
  }
})

// 按钮尺寸：宽度、字号、内容内边距
const SIZE_MAP: Record<Size, { width: number; fontSize: string }> = {
  sm: { width: 120, fontSize: "13px" },
  default: { width: 180, fontSize: "15px" },
  lg: { width: 240, fontSize: "17px" },
}

const width = computed(() => SIZE_MAP[props.size].width)
const aspect = "3.5/1" // 扁平按钮比例
const contentStyle = computed<CSSProperties>(() => ({
  fontSize: SIZE_MAP[props.size].fontSize,
  fontWeight: 600,
}))
</script>

<template>
  <GlowingShadow
    :class="cn('glow-button', { 'is-disabled': disabled }, props.class)"
    :width="width"
    :aspect-ratio="aspect"
    :color-mode="resolved.mode"
    :color="resolved.color"
    :colors="resolved.colors"
    :hue-speed="hueSpeed"
    :animation-speed="animationSpeed"
    :style="{ pointerEvents: disabled ? 'none' : 'auto' }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || undefined"
    @click="!disabled && emit('click', $event)"
    @keydown.enter.prevent="!disabled && emit('click', $event as unknown as MouseEvent)"
    @keydown.space.prevent="!disabled && emit('click', $event as unknown as MouseEvent)"
  >
    <span class="glow-button-content" :style="contentStyle">
      <slot />
    </span>
  </GlowingShadow>
</template>

<style scoped>
.glow-button {
  outline: none;
}
.glow-button:focus-visible {
  outline: 2px solid white;
  outline-offset: 4px;
  border-radius: var(--card-radius);
}
/* 按钮比例更扁，盖掉默认 padding */
.glow-button :deep(.glow-content) {
  padding: 0 1.2em;
}
.glow-button :deep(.glow-content .glow-button-content) {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  white-space: nowrap;
  color: var(--text-color);
  transition: color 0.2s ease;
}
.glow-button :deep(.glow-container:hover .glow-button-content) {
  color: white;
}
/* 禁用态 */
.glow-button.is-disabled {
  opacity: 0.5;
  filter: grayscale(0.6);
  cursor: not-allowed;
}
</style>
