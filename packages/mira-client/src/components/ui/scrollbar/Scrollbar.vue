<script lang="ts">
/**
 * 滚动条设置类型与默认值
 * 复刻自 scrollbar-but-cooler 的 hooks/useScrollbarSettings.ts
 * （dialkit 调参面板改为 settings prop 覆盖）
 */
import {
  EASE_IN_OUT_CUBIC,
  EASE_OUT_CUBIC,
  type ScrollbarTransitionConfig,
} from "./scrollbarTransitions"

export type { ScrollbarEase, ScrollbarTransitionConfig, ScrollbarSpringConfig } from "./scrollbarTransitions"
export type { ScrollbarState, Geometry, LineEndpoints } from "./scrollbarPoses"

/** 外部可覆盖的滚动条设置（深一层 Partial） */
export interface ScrollbarSettings {
  arrow: {
    /** 箭头竖杆长度 px */
    arrowLength: number
    /** 箭头两翼展开宽度 px */
    wingSpread: number
    /** idle 态箭头上下浮动幅度 px */
    bobAmplitude: number
    /** idle 态浮动周期（秒） */
    bobPeriod: number
    /** 箭头点击热区外扩 px */
    hitPadding: number
  }
  line: {
    /** 轨道长度上限 px；0 表示自适应占满容器高度（上下各留 40px，默认） */
    length: number
    /** 点间距 px，点数 = 轨道长度 / dotSpacing */
    dotSpacing: number
  }
  tracking: {
    /** 悬停点向左伸出的最大长度 px（超出轨道宽度的部分会被裁剪） */
    maxExtension: number
    /** 伸展量随离焦点距离衰减的底数 */
    extensionFalloff: number
    /** 悬停着色随离焦点距离衰减的底数 */
    colorFalloff: number
    /** 伸展平滑时间常数（秒） */
    smoothingTau: number
    /** 点击热区外扩 px */
    hitPadding: number
  }
  timing: {
    compressed: ScrollbarTransitionConfig
    extended: ScrollbarTransitionConfig
    split: ScrollbarTransitionConfig
    tracking: ScrollbarTransitionConfig
  }
  appearance: {
    dotColor: string
    hoverColor: string
    strokeWidth: number
  }
}

export type ScrollbarSettingsOverrides = {
  [K in keyof ScrollbarSettings]?: Partial<ScrollbarSettings[K]>
}

/**
 * 默认值面向 40px 占位轨道调整过（原仓库为全屏 overlay）：
 * maxExtension 50→24、tracking.hitPadding 10→4，保证伸展/热区不溢出轨道
 */
export const DEFAULT_SCROLLBAR_SETTINGS: ScrollbarSettings = {
  arrow: {
    arrowLength: 28,
    wingSpread: 8,
    bobAmplitude: 3,
    bobPeriod: 2,
    hitPadding: 10,
  },
  line: {
    length: 0,
    dotSpacing: 10,
  },
  tracking: {
    maxExtension: 24,
    extensionFalloff: 0.6,
    colorFalloff: 0.3,
    smoothingTau: 0.05,
    hitPadding: 4,
  },
  timing: {
    compressed: { type: "easing", duration: 0.15, ease: EASE_OUT_CUBIC },
    extended: { type: "easing", duration: 0.35, ease: EASE_IN_OUT_CUBIC },
    split: { type: "easing", duration: 0.2, ease: EASE_OUT_CUBIC },
    tracking: { type: "easing", duration: 0.2, ease: EASE_OUT_CUBIC },
  },
  appearance: {
    dotColor: "#a6a6a6",
    hoverColor: "#ff00ea",
    strokeWidth: 4,
  },
}

export const resolveScrollbarSettings = (
  overrides?: ScrollbarSettingsOverrides,
): ScrollbarSettings => {
  const base = DEFAULT_SCROLLBAR_SETTINGS
  if (!overrides) return base
  return {
    arrow: { ...base.arrow, ...overrides.arrow },
    line: { ...base.line, ...overrides.line },
    tracking: { ...base.tracking, ...overrides.tracking },
    timing: { ...base.timing, ...overrides.timing },
    appearance: { ...base.appearance, ...overrides.appearance },
  }
}
</script>

<script setup lang="ts">
/**
 * 酷滚动条（由 React 版 scrollbar-but-cooler/Scrollbar.tsx 移植）
 *
 * 形态机：idle（右下角浮动箭头提示）→ compressed → extended → split → tracking，
 * 随滚动状态切换；tracking 态呈点列，悬停/点击某点时该点向左伸展并着色，
 * 点击跳到对应滚动位置；idle 态点击箭头下滚一屏。
 *
 * 与原版的差异：原版监听 window 全页滚动且 fixed 全屏覆盖；本版是**右侧占位
 * 列**（流内 flex 子项，宽度 trackWidth），通过 container prop 指定滚动元素；
 * SVG 裁剪溢出内容，伸展/热区不会盖到左侧内容；dialkit 调参面板改为 settings prop。
 *
 * 用法（挂在滚动容器的 flex 父级里，与内容并排）：
 *   <div class="flex">
 *     <div ref="scrollRef" class="flex-1 min-w-0 overflow-y-auto">…内容…</div>
 *     <Scrollbar :container="scrollRef" />
 *   </div>
 */
import { computed, onBeforeUnmount, ref, watch, type CSSProperties } from "vue"
import { lerp, resolveTransition } from "./scrollbarTransitions"
import {
  getPoses,
  getTargetForState,
  POSE_ORDER,
  type Geometry,
  type LineEndpoints,
  type ScrollbarState,
} from "./scrollbarPoses"

defineOptions({ name: "Scrollbar" })

interface Props {
  /** 滚动容器元素（监听其 scrollTop 并控制其滚动） */
  container?: HTMLElement | null
  /** 覆盖默认值的设置项，见 DEFAULT_SCROLLBAR_SETTINGS */
  settings?: ScrollbarSettingsOverrides
  /** 右侧占位轨道宽度 px */
  trackWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  container: null,
  settings: undefined,
  trackWidth: 34,
})

const settings = computed(() => resolveScrollbarSettings(props.settings))
// 点数取决于实测轨道长度：先按视口高度估算，connect 时按容器实测修正
const dotCount = ref(
  Math.max(
    1,
    Math.round(
      (typeof window === "undefined" ? 800 : Math.max(100, window.innerHeight - 240)) /
        settings.value.line.dotSpacing,
    ),
  ),
)
// 点列垂直轴贴轨道右缘（右侧不留空白），只留半个线宽防圆头被裁
const axisMarginRight = computed(() => settings.value.appearance.strokeWidth / 2)

// 调试输出：排查「无动画」类问题时在 DevTools Console 过滤 [Scrollbar]
const dbg = (msg: string, ...args: unknown[]) => console.log(`[Scrollbar] ${msg}`, ...args)

// ---------- 模板引用 ----------
const svgRef = ref<SVGSVGElement | null>(null)
const leftWingRef = ref<SVGLineElement | null>(null)
const rightWingRef = ref<SVGLineElement | null>(null)
const pieceRefs = ref<(SVGLineElement | null)[]>([])
const hitRefs = ref<(SVGRectElement | null)[]>([])
const arrowHitRef = ref<SVGRectElement | null>(null)

const setPieceRef = (i: number, el: unknown) => {
  pieceRefs.value[i] = (el as SVGLineElement | null) ?? null
}
const setHitRef = (i: number, el: unknown) => {
  hitRefs.value[i] = (el as SVGRectElement | null) ?? null
}

// ---------- 状态（跨重连持久，对应 React useRef） ----------
interface AnimState {
  current: number
  target: number
  rafId: number | null
  lastTime: number
  state: ScrollbarState
}

const anim: AnimState = { current: 0, target: 0, rafId: null, lastTime: 0, state: "idle" }
let didEnter = false // 入场动画只播一次
let bobTime = 0
let loggedFirstFrame = false
/** 模板绑定的 data-state（syncState 更新） */
const svgState = ref<ScrollbarState>("idle")

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
const canHover = window.matchMedia("(hover: hover)")
if (reduceMotion.matches) dbg("prefers-reduced-motion: reduce 命中，动画将被禁用")

// ---------- 悬停着色（组件级，模板事件驱动） ----------
type Rgb = readonly [r: number, g: number, b: number]

const parseHexColor = (hex: string): Rgb => {
  const digits = hex.trim().slice(1)
  const full = digits.length === 3 ? [...digits].map(d => d + d).join("") : digits
  const n = parseInt(full, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

const mixColors = (from: Rgb, to: Rgb, t: number) =>
  `rgb(${Math.round(lerp(from[0], to[0], t))}, ${Math.round(
    lerp(from[1], to[1], t),
  )}, ${Math.round(lerp(from[2], to[2], t))})`

let hoveredDot: number | null = null
let arrowHovered = false

const applyHoverColors = () => {
  const leftWing = leftWingRef.value
  const rightWing = rightWingRef.value
  if (!leftWing || !rightWing) return
  const { appearance, tracking } = settings.value
  const dotColor = parseHexColor(appearance.dotColor)
  const dotHoverColor = parseHexColor(appearance.hoverColor)
  // idle 态所有线段都是箭头的一部分，一起着色
  const arrowStroke = arrowHovered ? "var(--dot-hover-color)" : ""
  leftWing.style.stroke = arrowStroke
  rightWing.style.stroke = arrowStroke
  pieceRefs.value.slice(0, dotCount.value).forEach((el, i) => {
    if (!el) return
    el.style.stroke = arrowHovered
      ? arrowStroke
      : hoveredDot === null
        ? ""
        : mixColors(dotColor, dotHoverColor, tracking.colorFalloff ** Math.abs(i - hoveredDot))
  })
}

const onHitEnter = (i: number) => {
  if (!canHover.matches) return
  hoveredDot = i
  applyHoverColors()
}
const onHitLeave = (i: number) => {
  if (hoveredDot !== i) return
  hoveredDot = null
  applyHoverColors()
}
const onArrowEnter = () => {
  if (!canHover.matches) return
  arrowHovered = true
  applyHoverColors()
}
const onArrowLeave = () => {
  arrowHovered = false
  applyHoverColors()
}

// ---------- 滚动工具（基于容器而非 window） ----------
const getStateForScroll = (scrollTop: number): ScrollbarState =>
  scrollTop > 0 ? "tracking" : "idle"

const getScrollFraction = (container: HTMLElement) => {
  const maxScroll = container.scrollHeight - container.clientHeight
  return maxScroll > 0
    ? Math.min(1, Math.max(0, container.scrollTop / maxScroll))
    : 0
}
const getFocusDot = (container: HTMLElement, count: number) =>
  Math.round(getScrollFraction(container) * (count - 1))

// getScrollFraction 的逆运算：某个点对应的滚动位置
const getScrollPositionForDot = (container: HTMLElement, dot: number, count: number) => {
  const maxScroll = container.scrollHeight - container.clientHeight
  const fraction = count > 1 ? dot / (count - 1) : 1
  return fraction * maxScroll
}

const scrollToDot = (dot: number) => {
  const container = props.container
  if (!container) return
  container.scrollTo({
    top: getScrollPositionForDot(container, dot, dotCount.value),
    behavior: reduceMotion.matches ? "auto" : "smooth",
  })
}

const scrollDownOneViewport = () => {
  const container = props.container
  if (!container) return
  container.scrollTo({
    top: container.scrollTop + container.clientHeight,
    behavior: reduceMotion.matches ? "auto" : "smooth",
  })
}

// ---------- 动画连接（svg / container / settings 任一就绪或变化时重建） ----------
let cleanup: (() => void) | null = null

const connectScrollbar = (svg: SVGSVGElement, container: HTMLElement) => {
  const leftWing = leftWingRef.value
  const rightWing = rightWingRef.value
  const pieces = pieceRefs.value.slice(0, dotCount.value).filter((el): el is SVGLineElement => !!el)
  const hits = hitRefs.value.slice(0, dotCount.value).filter((el): el is SVGRectElement => !!el)
  const arrowHit = arrowHitRef.value
  if (!leftWing || !rightWing || !arrowHit || pieces.length < dotCount.value || hits.length < dotCount.value) {
    dbg("connect 失败：refs 未就绪", {
      pieces: pieces.length,
      hits: hits.length,
      need: dotCount.value,
      leftWing: !!leftWing,
      rightWing: !!rightWing,
      arrowHit: !!arrowHit,
    })
    return null
  }

  const s = settings.value
  const a = anim

  // 轨道长度：line.length > 0 作为上限，否则自适应占满容器（上下各留 40px）
  const resolveTrackLength = () => {
    const available = Math.max(100, svg.clientHeight - 80)
    return s.line.length > 0 ? Math.min(s.line.length, available) : available
  }

  // 点数与实测轨道长度对齐；有修正时更新 dotCount 触发模板重渲，由 watch 重连
  const syncDotCount = (): boolean => {
    const expected = Math.max(1, Math.round(resolveTrackLength() / s.line.dotSpacing))
    if (expected !== dotCount.value) {
      dbg("dotCount 修正", dotCount.value, "->", expected, "trackLength", resolveTrackLength())
      dotCount.value = expected
      return true
    }
    return false
  }
  if (syncDotCount()) return null // 等 v-for 按新点数重渲后由 watch 重连

  const transitions = [
    resolveTransition(s.timing.compressed),
    resolveTransition(s.timing.extended),
    resolveTransition(s.timing.split),
    resolveTransition(s.timing.tracking),
  ]

  const buildGeometry = (): Geometry => ({
    arrowLength: s.arrow.arrowLength,
    wingSpread: s.arrow.wingSpread,
    lineLength: resolveTrackLength(),
    dotCount: dotCount.value,
    axisMarginRight: axisMarginRight.value,
    // 箭头中心在轨道内居中，保证右翼完整（点列轴已贴右缘）
    arrowAxis: props.trackWidth / 2,
  })
  let poses = getPoses(svg.getBoundingClientRect(), buildGeometry())

  const getExtensionLength = (dot: number, focusDot: number) =>
    s.tracking.maxExtension * s.tracking.extensionFalloff ** Math.abs(dot - focusDot)

  // 点与点之间的隐形点击热区，向左延伸到伸展后点的长度
  const placeHitAreas = () => {
    const spacing = resolveTrackLength() / dotCount.value
    hits.forEach((el, i) => {
      const [x, y1, , y2] = poses.split.pieces[i]
      el.setAttribute("x", String(x - s.tracking.maxExtension - s.tracking.hitPadding))
      el.setAttribute("y", String((y1 + y2) / 2 - spacing / 2))
      el.setAttribute("width", String(s.tracking.maxExtension + 2 * s.tracking.hitPadding))
      el.setAttribute("height", String(spacing))
    })

    const [, , arrowAxis, bottomY] = poses.idle.leftWing
    const arrowHitTop =
      bottomY - s.arrow.arrowLength - s.arrow.bobAmplitude - s.arrow.hitPadding
    const arrowHitBottom = bottomY + s.arrow.bobAmplitude + s.arrow.hitPadding
    arrowHit.setAttribute("x", String(arrowAxis - s.arrow.wingSpread - s.arrow.hitPadding))
    arrowHit.setAttribute("y", String(arrowHitTop))
    arrowHit.setAttribute("width", String(2 * (s.arrow.wingSpread + s.arrow.hitPadding)))
    arrowHit.setAttribute("height", String(arrowHitBottom - arrowHitTop))
  }

  const extensions = new Float64Array(dotCount.value)
  const advanceExtensions = (dt: number): boolean => {
    const focusDot = getFocusDot(container, dotCount.value)
    // 指数平滑：把补间的进度按时间分摊到每帧（而非一帧到位）
    const alpha = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / s.tracking.smoothingTau)
    let settled = true
    for (let i = 0; i < dotCount.value; i++) {
      const targetLength = getExtensionLength(i, focusDot)
      const frameLength = extensions[i] + (targetLength - extensions[i]) * alpha
      if (Math.abs(targetLength - frameLength) < 0.05) {
        extensions[i] = targetLength
      } else {
        extensions[i] = frameLength
        settled = false
      }
    }
    return settled
  }

  const setLine = (
    el: SVGLineElement,
    f: LineEndpoints,
    g: LineEndpoints,
    t: number,
    extendLeft = 0,
    offsetY = 0,
  ) => {
    el.setAttribute("x1", String(lerp(f[0], g[0], t) - extendLeft))
    el.setAttribute("y1", String(lerp(f[1], g[1], t) + offsetY))
    el.setAttribute("x2", String(lerp(f[2], g[2], t)))
    el.setAttribute("y2", String(lerp(f[3], g[3], t) + offsetY))
  }

  const applyGeometry = (t: number) => {
    const segment = Math.min(Math.max(Math.floor(t), 0), transitions.length - 1)
    const from = poses[POSE_ORDER[segment]]
    const to = poses[POSE_ORDER[segment + 1]]
    const local = transitions[segment].ease(t - segment)
    const trackingExtensionScale = segment === transitions.length - 1 ? local : 0
    const idleBobScale = segment === 0 ? 1 - local : 0
    const bobOffset =
      idleBobScale *
      s.arrow.bobAmplitude *
      Math.sin((2 * Math.PI * bobTime) / s.arrow.bobPeriod)
    // 绘制所有线段
    setLine(leftWing, from.leftWing, to.leftWing, local, 0, bobOffset)
    setLine(rightWing, from.rightWing, to.rightWing, local, 0, bobOffset)
    pieces.forEach((el, i) =>
      setLine(el, from.pieces[i], to.pieces[i], local, trackingExtensionScale * extensions[i], bobOffset),
    )
  }

  const syncState = () => {
    const next = getStateForScroll(container.scrollTop)
    if (next !== a.state) {
      dbg("state:", a.state, "->", next, { scrollTop: container.scrollTop })
      a.state = next
      svgState.value = next
      if (next !== "tracking" && hoveredDot !== null) {
        hoveredDot = null
        applyHoverColors()
      }
      if (next !== "idle" && arrowHovered) {
        arrowHovered = false
        applyHoverColors()
      }
    }
  }

  const advance = (dt: number) => {
    if (reduceMotion.matches) {
      a.current = a.target
      return
    }
    let remaining = dt
    while (remaining > 0 && a.current !== a.target) {
      const dir = a.target > a.current ? 1 : -1
      // 状态边界处按行进方向选段，避免两段速度叠加溢出
      const segment =
        dir > 0
          ? Math.min(Math.floor(a.current), transitions.length - 1)
          : Math.max(Math.ceil(a.current) - 1, 0)
      const boundary = dir > 0 ? segment + 1 : segment
      const stop = dir > 0 ? Math.min(a.target, boundary) : Math.max(a.target, boundary)
      const { duration } = transitions[segment]
      const timeToStop = Math.abs(stop - a.current) * duration
      if (timeToStop <= remaining) {
        a.current = stop
        remaining -= timeToStop
      } else {
        a.current += (remaining / duration) * dir
        remaining = 0
      }
    }
  }

  const step = (now: number) => {
    const dt = Math.min((now - a.lastTime) / 1000, 0.1)
    a.lastTime = now
    if (!loggedFirstFrame) {
      loggedFirstFrame = true
      dbg("动画循环启动", {
        current: a.current,
        target: a.target,
        state: a.state,
        reduceMotion: reduceMotion.matches,
        svgSize: `${svg.clientWidth}x${svg.clientHeight}`,
        dotCount: dotCount.value,
      })
    }
    advance(dt)
    const extensionsSettled = advanceExtensions(dt) // 点伸展期间循环保持存活
    if (!reduceMotion.matches) bobTime += dt
    applyGeometry(a.current)
    const bobbing = a.current === 0 && !reduceMotion.matches
    if (a.current === a.target && extensionsSettled && !bobbing) {
      a.rafId = null
      return
    }
    a.rafId = requestAnimationFrame(step)
  }

  const kick = () => {
    if (a.rafId === null) {
      a.lastTime = performance.now()
      a.rafId = requestAnimationFrame(step)
    }
  }

  let loggedFirstScroll = false
  const onScroll = () => {
    if (!loggedFirstScroll) {
      loggedFirstScroll = true
      dbg("scroll 事件到达")
    }
    syncState()
    a.target = getTargetForState(a.state)
    kick()
  }

  syncState()
  a.target = getTargetForState(a.state)
  if (!didEnter) {
    // 挂载时只播进入目标 pose 的最后一段过渡（滚动过则 split -> tracking）；
    // 减弱动效直接就位。后续设置变化保持动画位置不变
    a.current = reduceMotion.matches ? a.target : Math.max(a.target - 1, 0)
    didEnter = true
  }
  const mountFocusDot = getFocusDot(container, dotCount.value)
  for (let i = 0; i < dotCount.value; i++) {
    extensions[i] = getExtensionLength(i, mountFocusDot)
  }
  applyGeometry(a.current)
  placeHitAreas()
  kick() // 启动 idle 浮动或入场动画
  dbg("connect 成功", {
    dotCount: dotCount.value,
    svgSize: `${svg.clientWidth}x${svg.clientHeight}`,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
    state: a.state,
  })

  const resizeObserver = new ResizeObserver(() => {
    if (syncDotCount()) return // 高度变化导致点数变化，等 watch(dotCount) 重连
    poses = getPoses(svg.getBoundingClientRect(), buildGeometry())
    applyGeometry(a.current)
    placeHitAreas()
  })
  resizeObserver.observe(svg)

  container.addEventListener("scroll", onScroll, { passive: true })
  return () => {
    container.removeEventListener("scroll", onScroll)
    resizeObserver.disconnect()
    if (a.rafId !== null) cancelAnimationFrame(a.rafId)
    a.rafId = null
  }
}

const setupScrollbar = () => {
  cleanup?.()
  cleanup = null
  const svg = svgRef.value
  const container = props.container
  if (!svg || !container) return
  cleanup = connectScrollbar(svg, container)
}

// svg ref / container / settings / dotCount 任一就绪或变化即（重）连接；flush post 保证 DOM 先就绪
watch([svgRef, () => props.container, () => props.settings, dotCount], setupScrollbar, { flush: "post" })

onBeforeUnmount(() => {
  cleanup?.()
  cleanup = null
})

const svgStyle = computed(() => {
  const { appearance } = settings.value
  return {
    "--dot-color": appearance.dotColor,
    "--dot-hover-color": appearance.hoverColor,
    "--stroke-width": String(appearance.strokeWidth),
  } as CSSProperties
})
</script>

<template>
  <div class="scrollbar-wrap" :style="{ width: `${trackWidth}px` }">
    <svg ref="svgRef" class="scrollbar" :data-state="svgState" aria-hidden="true" :style="svgStyle">
      <line ref="leftWingRef" />
      <line ref="rightWingRef" />
      <line v-for="(_, i) in dotCount" :key="`piece-${i}`" :ref="(el: any) => setPieceRef(i, el)" />
      <rect
        v-for="(_, i) in dotCount"
        :key="`hit-${i}`"
        class="hit-area"
        :ref="(el: any) => setHitRef(i, el)"
        @click="scrollToDot(i)"
        @mouseenter="onHitEnter(i)"
        @mouseleave="onHitLeave(i)"
      />
      <rect ref="arrowHitRef" class="arrow-hit" @click="scrollDownOneViewport"
        @mouseenter="onArrowEnter" @mouseleave="onArrowLeave" />
    </svg>
  </div>
</template>

<style scoped>
.scrollbar-wrap {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  align-self: stretch;
}

.scrollbar {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  /* 溢出轨道的内容一律裁剪：伸展/热区绝不遮到左侧内容 */
  overflow: hidden;
  /* --dot-color / --dot-hover-color 由内联 style 提供 */
  color: var(--dot-color);
}

.scrollbar line {
  stroke: currentColor;
  stroke-width: var(--stroke-width, 4);
  stroke-linecap: round;
  transition: stroke 250ms ease;
}

/* 仅 tracking 态激活点击条 */
.scrollbar .hit-area {
  fill: none;
  pointer-events: none;
}

/* 箭头条仅 idle 态激活 */
.scrollbar .arrow-hit {
  fill: none;
  pointer-events: none;
}

.scrollbar[data-state="idle"] .arrow-hit {
  pointer-events: all;
  cursor: pointer;
}

.scrollbar[data-state="tracking"] .hit-area {
  pointer-events: all;
  cursor: pointer;
}
</style>
