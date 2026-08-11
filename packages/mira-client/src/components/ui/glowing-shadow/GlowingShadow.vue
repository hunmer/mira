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
import { computed, type CSSProperties } from "vue"

type ColorMode = "rainbow" | "mono" | "multi"

interface Props {
  /** 卡片宽度（px），同时驱动内部发光体尺寸 */
  width?: number
  /** 卡片宽高比 */
  aspectRatio?: string
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
  colorMode: "rainbow",
  color: "#a855f7",
  colors: () => ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"],
  hueSpeed: 1,
  animationSpeed: "4s",
  cardColor: "hsl(260deg 100% 3%)",
  textColor: "hsl(260deg 10% 55%)",
})

// 解析任意 CSS 颜色 → hue（0-360）。借助浏览器原生临时 canvas。
function toHue(color: string): number {
  if (typeof document === "undefined") return 0
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return 0
  // 任意格式（hex/rgb/hsl/named）都能被规范成 rgba
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

// multi 模式：把颜色列表解析成 hue 列表，并生成 keyframes。
// mono：停止色相动画，固定 hue。rainbow：原版行为。
const monoHue = computed(() => toHue(props.color))
const multiHues = computed(() => {
  // 用 round + 去重避免相邻颜色 hue 几乎相同导致看不出切换
  return Array.from(new Set(props.colors.map(c => toHue(c))))
})
const multiKeyframes = computed(() => {
  const hues = multiHues.value
  if (hues.length === 0) return ""
  if (hues.length === 1) {
    return `@keyframes glow-multi-hue { 0% { --hue: ${hues[0]}; } 100% { --hue: ${hues[0]}; } }`
  }
  const stops = hues
    .map((h, i) => `${(i / (hues.length - 1) * 100).toFixed(2)}% { --hue: ${h}; }`)
    .join(" ")
  return `@keyframes glow-multi-hue { ${stops} }`
})

const containerStyle = computed<CSSProperties>(() => {
  const s: Record<string, string | number> = {
    "--card-width": `${props.width}px`,
    "--hue-speed": props.colorMode === "rainbow" ? props.hueSpeed : 1,
    "--animation-speed": props.animationSpeed,
    "--card-color": props.cardColor,
    "--text-color": props.textColor,
  }
  if (props.colorMode === "mono") {
    // 锁定 hue，色相动画停掉
    s["--hue"] = monoHue.value
  }
  return s as CSSProperties
})
</script>

<template>
  <!-- multi 模式需要运行时注入 keyframes；用 :deep 全局声明一次即可 -->
  <component :is="'style'" v-if="colorMode === 'multi' && multiKeyframes">{{ multiKeyframes }}</component>

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
    <span class="glow" />
    <div class="glow-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
@import "./glowing.css";

/* rainbow：沿用原版 @property --hue 0→360 循环 */
.is-rainbow .glow-content:before,
.is-rainbow .glow {
  animation-name: hue-animation, rotate-bg, rotate;
}
.is-rainbow .glow:after {
  animation-name: hue-animation;
}

/* mono：固定 hue，移除色相动画，只保留旋转/背景游走 */
.is-mono .glow-content:before {
  animation: rotate-bg var(--animation-speed) linear infinite;
  transition: --bg-size var(--interaction-speed) ease;
}
.is-mono .glow:after {
  animation: none;
}

/* multi：色相走自定义 keyframes，名称 glow-multi-hue */
.is-multi .glow-content:before {
  animation: glow-multi-hue var(--animation-speed) linear infinite,
    rotate-bg var(--animation-speed) linear infinite;
  transition: --bg-size var(--interaction-speed) ease;
}
.is-multi .glow:after {
  animation: glow-multi-hue var(--animation-speed) linear infinite;
}
</style>
