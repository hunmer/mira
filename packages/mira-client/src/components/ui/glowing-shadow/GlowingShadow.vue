<script setup lang="ts">
/**
 * 发光阴影卡片组件
 * 复刻自 React 版 GlowingShadow（CSS Houdini @property + 色相/旋转动画）
 *
 * 配色模式 colorMode：
 *   - rainbow：彩虹色循环（默认，hue 0→360）
 *   - mono：单色，整张卡片固定一个颜色
 *   - multi：多色，在传入的颜色之间循环切换
 *
 * 用法：
 *   <GlowingShadow>Rainbow</GlowingShadow>
 *   <GlowingShadow color-mode="mono" color="#3b82f6">Mono</GlowingShadow>
 *   <GlowingShadow color-mode="multi" :colors="['#ef4444','#a855f7','#22c55e']">Multi</GlowingShadow>
 */
import { computed, useId, type CSSProperties } from "vue"

type ColorMode = "rainbow" | "mono" | "multi"

interface Props {
  /** 卡片宽度（px），同时驱动内部发光体尺寸 */
  width?: number
  /** 卡片宽高比 */
  aspectRatio?: string
  /** 圆角，未指定时用默认 3.6vw（适配大卡片）；按钮等小尺寸建议传 px */
  radius?: string
  /** 容器内联样式（透传） */
  style?: CSSProperties
  /** 配色模式 */
  colorMode?: ColorMode
  /** mono 模式颜色（任意 CSS 颜色） */
  color?: string
  /** multi 模式颜色列表（任意 CSS 颜色） */
  colors?: string[]
  /** 色相动画速度系数，越大变色越快 */
  hueSpeed?: number
  /** 整体动画周期 */
  animationSpeed?: string
  /** 卡片底色 */
  cardColor?: string
  /** 文本色 */
  textColor?: string
  /** 容器额外 class */
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 480,
  aspectRatio: "1.5/1",
  radius: undefined,
  colorMode: "rainbow",
  color: "#a855f7",
  colors: () => ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"],
  hueSpeed: 1,
  animationSpeed: "4s",
  cardColor: "hsl(260deg 100% 3%)",
  textColor: "hsl(260deg 10% 55%)",
})

// 解析任意 CSS 颜色 → hue（0-360）。借助浏览器原生临时 canvas 规范化。
function toHue(color: string): number {
  if (typeof document === "undefined") return 0
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return 0
  ctx.fillStyle = "#000"
  ctx.fillStyle = color
  const css = ctx.fillStyle as string
  const m = css.match(/rgba?\(([^)]+)\)/)
  if (!m) return 0
  const [r, g, b] = m[1].split(",").map(n => parseFloat(n))
  const rr = r / 255, gg = g / 255, bb = b / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6
    else if (max === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return Math.round(h)
}

// 每个实例唯一 keyframes 名，避免多个 multi 实例互相覆盖
const uid = useId().replace(/[^a-zA-Z0-9-]/g, "")
const multiAnimName = `glow-multi-hue-${uid}`

const monoHue = computed(() => toHue(props.color))
const multiHues = computed(() => {
  // round + 去重，避免相邻颜色 hue 几乎相同导致看不出切换
  return Array.from(new Set(props.colors.map(c => toHue(c))))
})
const multiKeyframes = computed(() => {
  const hues = multiHues.value
  if (hues.length === 0) return ""
  if (hues.length === 1) {
    return `@keyframes ${multiAnimName} { 0% { --hue: ${hues[0]}; } 100% { --hue: ${hues[0]}; } }`
  }
  const stops = hues
    .map((h, i) => `${(i / (hues.length - 1) * 100).toFixed(2)}% { --hue: ${h}; }`)
    .join(" ")
  return `@keyframes ${multiAnimName} { ${stops} }`
})

const containerStyle = computed<CSSProperties>(() => {
  const s: Record<string, string | number> = {
    "--card-width": `${props.width}px`,
    "--card-aspect": props.aspectRatio,
    "--hue-speed": props.colorMode === "rainbow" ? props.hueSpeed : 1,
    "--animation-speed": props.animationSpeed,
    "--card-color": props.cardColor,
    "--text-color": props.textColor,
    "--multi-anim": multiAnimName,
  }
  if (props.radius) {
    s["--card-radius"] = props.radius
  }
  if (props.colorMode === "mono") {
    s["--hue"] = monoHue.value
  }
  return s as CSSProperties
})
</script>

<template>
  <div
    class="glow-container"
    :class="[
      props.class,
      {
        'is-mono': colorMode === 'mono',
        'is-multi': colorMode === 'multi',
        'is-rainbow': colorMode === 'rainbow',
      },
    ]"
    :style="containerStyle"
    role="button"
    tabindex="0"
  >
    <!-- multi 模式运行时注入唯一 keyframes（全局），放容器内部以保证组件为单根节点 -->
    <component :is="'style'" v-if="colorMode === 'multi' && multiKeyframes">{{ multiKeyframes }}</component>
    <span class="glow" />
    <div class="glow-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
@import "./glowing.css";

/* rainbow：色相走 0→360 */
.is-rainbow .glow-content:before {
  animation: hue-animation var(--animation-speed) linear infinite,
    rotate-bg var(--animation-speed) linear infinite;
}
.is-rainbow .glow:after {
  animation: hue-animation var(--animation-speed) linear infinite;
}

/* mono：固定 hue，仅保留背景游走，不跑色相动画 */
.is-mono .glow-content:before {
  animation: rotate-bg var(--animation-speed) linear infinite;
}
.is-mono .glow:after {
  animation: none;
}

/* multi：色相走运行时注入的 keyframes（每实例唯一名） */
.is-multi .glow-content:before {
  animation: var(--multi-anim) var(--animation-speed) linear infinite,
    rotate-bg var(--animation-speed) linear infinite;
}
.is-multi .glow:after {
  animation: var(--multi-anim) var(--animation-speed) linear infinite;
}
</style>
