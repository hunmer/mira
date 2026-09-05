<script lang="ts">
/**
 * 滚动条设置类型与默认值
 * 复刻自 scrollbar-but-cooler 的 hooks/useScrollbarSettings.ts
 * （dialkit 调参面板改为 settings prop 覆盖；波纹/标注为移植 ChapterScrubber 后新增）
 */
import {
  EASE_IN_OUT_CUBIC,
  EASE_OUT_CUBIC,
  type ScrollbarTransitionConfig,
} from "./scrollbarTransitions"

export type { ScrollbarEase, ScrollbarTransitionConfig, ScrollbarSpringConfig } from "./scrollbarTransitions"
export type { ScrollbarState, Geometry, LineEndpoints } from "./scrollbarPoses"

/** 标注点：在点列对应位置常显高亮（移植自 ChapterScrubber 的章节刻度） */
export interface ScrollbarMarker {
  id: string
  /** 内容总高比例位置 0~1，将吸附到最近的点 */
  position: number
  /** 可选标签（当前仅用于语义，不渲染） */
  label?: string
}

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
    /** 进度焦点/悬停波峰的伸展长度 px（超出轨道宽度的部分会被裁剪） */
    maxExtension: number
    /** 升余弦波纹半径（行数）——起伏从指针扩散的距离 */
    rippleRadius: number
    /** 标注点的放大倍数（线点粗细倍增即更大的圆点） */
    markerDotScale: number
    /** 进度焦点伸展随距离衰减的底数 */
    focusFalloff: number
    /** 进度焦点伸展平滑时间常数（秒） */
    smoothingTau: number
    /** 点击热区外扩 px */
    hitPadding: number
  }
  timing: {
    compressed: ScrollbarTransitionConfig
    extended: ScrollbarTransitionConfig
    split: ScrollbarTransitionConfig
    tracking: ScrollbarTransitionConfig
    /** 反向（点列收拢回箭头）过渡：所有线段共用这一条缓动曲线（移植适配新增） */
    reverse: ScrollbarTransitionConfig
  }
  appearance: {
    dotColor: string
    hoverColor: string
    /** 标注点颜色（任意 CSS 颜色，默认跟随主题 primary） */
    markerColor: string
    strokeWidth: number
  }
}

export type ScrollbarSettingsOverrides = {
  [K in keyof ScrollbarSettings]?: Partial<ScrollbarSettings[K]>
}

/**
 * 默认值面向窄占位轨道调整过（原仓库为全屏 overlay）：
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
    rippleRadius: 4,
    markerDotScale: 1.5,
    focusFalloff: 0.6,
    smoothingTau: 0.05,
    hitPadding: 4,
  },
  timing: {
    compressed: { type: "easing", duration: 0.15, ease: EASE_OUT_CUBIC },
    extended: { type: "easing", duration: 0.35, ease: EASE_IN_OUT_CUBIC },
    split: { type: "easing", duration: 0.2, ease: EASE_OUT_CUBIC },
    tracking: { type: "easing", duration: 0.2, ease: EASE_OUT_CUBIC },
    reverse: { type: "easing", duration: 0.3, ease: EASE_IN_OUT_CUBIC },
  },
  appearance: {
    dotColor: "#a6a6a6",
    hoverColor: "#ff00ea",
    markerColor: "var(--primary)",
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
 * 酷滚动条（由 React 版 scrollbar-but-cooler/Scrollbar.tsx 移植，
 * 并合入了 ChapterScrubber 的悬停波纹与标注点效果）
 *
 * 形态机：idle（右下角浮动箭头提示）→ compressed → extended → split → tracking，
 * 随滚动状态切换；正向展开走原版链式分段动画，反向收拢走 timing.reverse
 * 统一直达动画（所有线段同一条缓动曲线，箭头无延迟成形）。
 *
 * tracking 态交互（继承自 ChapterScrubber）：
 * - 悬停时指针附近的点按升余弦波纹向左隆起伸展并着色，
 *   波纹中心/强度分别由近临界阻尼弹簧与柔和弹簧跟手
 * - markers 标注点常显高亮（markerColor + 静息伸展），点击仅触发 marker-select
 * - 点击轨道跳到对应滚动位置；idle 态点击箭头直达底部
 *
 * 与原版的差异：原版监听 window 全页滚动且 fixed 全屏覆盖；本版是**右侧占位
 * 列**（流内 flex 子项，宽度 trackWidth），通过 container prop 指定滚动元素；
 * SVG 裁剪溢出内容，伸展/热区不会盖到左侧内容；dialkit 调参面板改为 settings prop。
 *
 * 用法（挂在滚动容器的 flex 父级里，与内容并排）：
 *   <div class="flex">
 *     <div ref="scrollRef" class="flex-1 min-w-0 overflow-y-auto">…内容…</div>
 *     <Scrollbar :container="scrollRef" :markers="markers" @marker-select="..." />
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
  /** 标注点列表（如分组章节），点击触发 marker-select */
  markers?: ScrollbarMarker[]
}

const props = withDefaults(defineProps<Props>(), {
  container: null,
  settings: undefined,
  trackWidth: 34,
  markers: undefined,
})

const emit = defineEmits<{
  /** 点击标注点（index 为 markers 数组中的下标） */
  "marker-select": [marker: ScrollbarMarker, index: number]
}>()

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
// 实测点间距（px）与点列顶部偏移（px），connect 后更新，供点击/悬停行换算
const measuredSpacing = ref(settings.value.line.dotSpacing)
const trackTop = ref(0)
// 标注点悬停卡片（label 展示）；teleport 到 body 渲染，坐标为视口全局坐标
const hoverMarkerCard = ref<{ marker: ScrollbarMarker; top: number; left: number } | null>(null)
// 标注点吸附表：dot index -> marker
const markerDots = computed(() => {
  const map = new Map<number, ScrollbarMarker>()
  for (const marker of props.markers ?? []) {
    const dot = Math.round(
      Math.min(1, Math.max(0, marker.position)) * (dotCount.value - 1),
    )
    map.set(dot, marker)
  }
  return map
})
// 点列垂直轴贴轨道右缘（右侧不留空白），只留半个线宽防圆头被裁
const axisMarginRight = computed(() => settings.value.appearance.strokeWidth / 2)

// ---------- 模板引用 ----------
const svgRef = ref<SVGSVGElement | null>(null)
const leftWingRef = ref<SVGLineElement | null>(null)
const rightWingRef = ref<SVGLineElement | null>(null)
const arrowHitRef = ref<SVGRectElement | null>(null)
const pieceRefs = ref<(SVGLineElement | null)[]>([])

const setPieceRef = (i: number, el: unknown) => {
  pieceRefs.value[i] = (el as SVGLineElement | null) ?? null
}

// 当前连接暴露的渲染/唤醒入口（重连时更新，供组件级事件触发一帧）
let activeRender: (() => void) | null = null
let activeKick: (() => void) | null = null
const kickOnce = () => activeKick?.()

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
let arrowHovered = false
// 悬停波纹状态（跨重连共享）：pointer 为行坐标（弹簧跟手），strength 0~1（柔和弹簧）
const pointerSpring: SpringState = { pos: 0, vel: 0 }
const strengthSpring: SpringState = { pos: 0, vel: 0 }
let hoverRow = 0
let hoverActive = false
/** 模板绑定的 data-state（syncState 更新） */
const svgState = ref<ScrollbarState>("idle")
/** 容器是否可滚动（scrollHeight 超出 clientHeight）；不足时整列隐藏 */
const scrollable = ref(true)

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

const onArrowEnter = () => {
  arrowHovered = true
  kickOnce()
}
const onArrowLeave = () => {
  arrowHovered = false
  kickOnce()
}

// 轨道悬停：tracking 态下按指针行更新波纹中心；命中标注点时展示 label 卡片
const onTrackPointerMove = (event: PointerEvent) => {
  const svg = svgRef.value
  if (!svg || anim.state !== "tracking") return
  const rect = svg.getBoundingClientRect()
  // 行换算以点列顶部为基准（点列在容器内垂直居中，上方有留白）
  const row = (event.clientY - rect.top - trackTop.value) / measuredSpacing.value - 0.5
  hoverRow = row
  hoverActive = true
  const dot = Math.min(dotCount.value - 1, Math.max(0, Math.round(row)))
  const marker = markerDots.value.get(dot)
  hoverMarkerCard.value = marker?.label
    ? {
        marker,
        top: rect.top + trackTop.value + (dot + 0.5) * measuredSpacing.value,
        left: rect.left,
      }
    : null
  kickOnce()
}

const onTrackPointerLeave = () => {
  hoverActive = false
  hoverMarkerCard.value = null
  kickOnce()
}

// ---------- 悬停着色工具 ----------
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

// 升余弦波包：波峰处 1、超出半径为 0，两端零斜率无接缝（移植自 ChapterScrubberTick）
const bump = (distance: number, radius: number) => {
  if (distance >= radius) return 0
  return 0.5 * (1 + Math.cos(Math.PI * (distance / radius)))
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

const scrollToBottom = () => {
  const container = props.container
  if (!container) return
  container.scrollTo({
    top: container.scrollHeight,
    behavior: reduceMotion.matches ? "auto" : "smooth",
  })
}

// 点击轨道：tracking 态下跳到最近点；命中标注点则仅触发 marker-select
const onTrackClick = (event: MouseEvent) => {
  const svg = svgRef.value
  if (!svg || svgState.value !== "tracking") return
  const rect = svg.getBoundingClientRect()
  const row = (event.clientY - rect.top - trackTop.value) / measuredSpacing.value - 0.5
  const dot = Math.min(dotCount.value - 1, Math.max(0, Math.round(row)))
  const marker = markerDots.value.get(dot)
  if (marker) {
    const index = props.markers?.indexOf(marker) ?? -1
    emit("marker-select", marker, index)
    return
  }
  scrollToDot(dot)
}

// ---------- 动画连接（svg / container / settings 任一就绪或变化时重建） ----------
let cleanup: (() => void) | null = null

// 线段几何快照：direct 动画的插值端点（伸展/浮动效果已折算进端点值）
type Quad = [number, number, number, number]
interface PoseSnapshot {
  leftWing: Quad
  rightWing: Quad
  pieces: Quad[]
}
type PoseLike = {
  leftWing: LineEndpoints
  rightWing: LineEndpoints
  pieces: readonly LineEndpoints[]
}

// 弹簧参数（移植自 ChapterScrubber）：
// 近临界阻尼：几乎无滞后、无过冲，波纹像吸附在指针上
const POINTER_SPRING = { stiffness: 700, damping: 52, mass: 0.5 }
// 柔和弹簧：起伏优雅地隆起与回落
const STRENGTH_SPRING = { stiffness: 260, damping: 30, mass: 0.6 }

interface SpringState {
  pos: number
  vel: number
}

const advanceSpring = (
  state: SpringState,
  target: number,
  cfg: { stiffness: number; damping: number; mass: number },
  dt: number,
): boolean => {
  if (reduceMotion.matches) {
    state.pos = target
    state.vel = 0
    return true
  }
  const a = (cfg.stiffness * (target - state.pos) - cfg.damping * state.vel) / cfg.mass
  state.vel += a * dt
  state.pos += state.vel * dt
  return Math.abs(target - state.pos) < 0.005 && Math.abs(state.vel) < 0.01
}

const connectScrollbar = (svg: SVGSVGElement, container: HTMLElement) => {
  const leftWing = leftWingRef.value
  const rightWing = rightWingRef.value
  const pieces = pieceRefs.value.slice(0, dotCount.value).filter((el): el is SVGLineElement => !!el)
  if (!leftWing || !rightWing || pieces.length < dotCount.value) return null

  const s = settings.value
  const a = anim

  // 轨道长度：line.length > 0 作为上限，否则自适应占满容器（上下各留 40px）
  const resolveTrackLength = () => {
    const available = Math.max(100, svg.clientHeight - 80)
    return s.line.length > 0 ? Math.min(s.line.length, available) : available
  }

  // 点数与实测轨道长度对齐；有修正时更新 dotCount 触发模板重渲，由 watch 重连
  const syncDotCount = (): boolean => {
    const trackLength = resolveTrackLength()
    const expected = Math.max(1, Math.round(trackLength / s.line.dotSpacing))
    if (expected !== dotCount.value) {
      dotCount.value = expected
      return true
    }
    measuredSpacing.value = trackLength / dotCount.value
    trackTop.value = (svg.clientHeight - trackLength) / 2
    return false
  }

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

  // idle 箭头的隐形点击热区
  const placeArrowHitArea = () => {
    const arrowHit = arrowHitRef.value
    if (!arrowHit) return
    const [, , arrowAxis, bottomY] = poses.idle.leftWing
    const arrowHitTop =
      bottomY - s.arrow.arrowLength - s.arrow.bobAmplitude - s.arrow.hitPadding
    const arrowHitBottom = bottomY + s.arrow.bobAmplitude + s.arrow.hitPadding
    arrowHit.setAttribute("x", String(arrowAxis - s.arrow.wingSpread - s.arrow.hitPadding))
    arrowHit.setAttribute("y", String(arrowHitTop))
    arrowHit.setAttribute("width", String(2 * (s.arrow.wingSpread + s.arrow.hitPadding)))
    arrowHit.setAttribute("height", String(arrowHitBottom - arrowHitTop))
  }

  // direct（反向收拢/直达）动画：所有线段共用一条缓动曲线过渡到目标 pose
  let direct: {
    from: PoseSnapshot
    toKey: ScrollbarState
    t: number
    duration: number
    ease: (t: number) => number
  } | null = null

  // 最近一次渲染处于 tracking 形态的权重（0~1），标注点放大随其渐入
  let lastTrackingScale = 0

  // 进度焦点伸展（原版 tracking 效果）：当前滚动位置附近的点常显伸展，
  // 目标按 focusFalloff 指数衰减，extensions 数组每帧向目标指数平滑
  const extensions = new Float64Array(dotCount.value)
  const getFocusExtension = (i: number, focusDot: number) =>
    s.tracking.maxExtension * s.tracking.focusFalloff ** Math.abs(i - focusDot)
  const advanceExtensions = (dt: number): boolean => {
    const focusDot = getFocusDot(container, dotCount.value)
    const alpha = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / s.tracking.smoothingTau)
    let settled = true
    for (let i = 0; i < dotCount.value; i++) {
      const targetLength = getFocusExtension(i, focusDot)
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

  // 每点伸展量：进度焦点 + 悬停波纹隆起（弹簧强度 × 升余弦）
  const extensionOf = (i: number) =>
    extensions[i] +
    strengthSpring.pos *
      bump(Math.abs(i - pointerSpring.pos), s.tracking.rippleRadius) *
      s.tracking.maxExtension

  const writeLine = (el: SVGLineElement, [x1, y1, x2, y2]: Quad) => {
    el.setAttribute("x1", String(x1))
    el.setAttribute("y1", String(y1))
    el.setAttribute("x2", String(x2))
    el.setAttribute("y2", String(y2))
  }

  // 两套线段集合按 local 插值，并叠加伸展（extendLeft）与 idle 浮动（bobOffset）
  const composeSnapshot = (
    from: PoseLike,
    to: PoseLike,
    local: number,
    extScale: number,
    bobScale: number,
  ): PoseSnapshot => {
    const bobOffset =
      bobScale * s.arrow.bobAmplitude * Math.sin((2 * Math.PI * bobTime) / s.arrow.bobPeriod)
    const mix = (f: LineEndpoints, g: LineEndpoints, extendLeft: number): Quad => [
      lerp(f[0], g[0], local) - extendLeft,
      lerp(f[1], g[1], local) + bobOffset,
      lerp(f[2], g[2], local),
      lerp(f[3], g[3], local) + bobOffset,
    ]
    lastTrackingScale = extScale
    return {
      leftWing: mix(from.leftWing, to.leftWing, 0),
      rightWing: mix(from.rightWing, to.rightWing, 0),
      pieces: from.pieces.map((f, i) => mix(f, to.pieces[i], extScale * extensionOf(i))),
    }
  }

  // 链式分段插值快照（idle→tracking 的原版展开动画）
  const chainSnapshot = (t: number): PoseSnapshot => {
    const segment = Math.min(Math.max(Math.floor(t), 0), transitions.length - 1)
    const from = poses[POSE_ORDER[segment]]
    const to = poses[POSE_ORDER[segment + 1]]
    const local = transitions[segment].ease(t - segment)
    const trackingExtensionScale = segment === transitions.length - 1 ? local : 0
    const idleBobScale = segment === 0 ? 1 - local : 0
    return composeSnapshot(from, to, local, trackingExtensionScale, idleBobScale)
  }

  // direct 动画当前快照；bob 渐入仅目标为 idle、伸展渐入仅目标为 tracking
  const directSnapshot = (): PoseSnapshot => {
    const d = direct
    if (!d) return chainSnapshot(a.current)
    const e = d.ease(d.t)
    const extScale = d.toKey === "tracking" ? e : 0
    const bobScale = d.toKey === "idle" ? e : 0
    return composeSnapshot(d.from, poses[d.toKey], e, extScale, bobScale)
  }

  // 渲染：几何 + 逐点着色（波纹混色 / 箭头悬停色）；标注由独立圆点元素展示
  const renderCurrent = () => {
    const snap = direct ? directSnapshot() : chainSnapshot(a.current)
    writeLine(leftWing, snap.leftWing)
    writeLine(rightWing, snap.rightWing)
    const { appearance, tracking } = s
    const dotColor = parseHexColor(appearance.dotColor)
    const hoverColor = parseHexColor(appearance.hoverColor)
    const arrowStroke = arrowHovered ? appearance.hoverColor : ""
    leftWing.style.stroke = arrowStroke
    rightWing.style.stroke = arrowStroke
    const hoverT = strengthSpring.pos
    pieces.forEach((el, i) => {
      writeLine(el, snap.pieces[i])
      if (markerDots.value.has(i)) {
        // 标注即点列中的点本身：markerColor 着色 + 随 tracking 形态渐入的圆点放大
        el.style.stroke = appearance.markerColor
        el.setAttribute(
          "stroke-width",
          String(appearance.strokeWidth * (1 + (tracking.markerDotScale - 1) * lastTrackingScale)),
        )
      } else {
        el.style.stroke = mixColors(
          dotColor,
          hoverColor,
          hoverT * bump(Math.abs(i - pointerSpring.pos), tracking.rippleRadius),
        )
        el.removeAttribute("stroke-width")
      }
    })
  }

  // 状态切换动画选择：静止 idle → tracking 走原版链式展开；
  // 其余（收拢回箭头、动画进行中被打断）走 direct 统一动画
  const startTransition = (next: ScrollbarState) => {
    const idleAtRest = next === "tracking" && direct === null && a.current === a.target
    a.target = getTargetForState(next)
    if (idleAtRest) return
    direct = {
      from: direct ? directSnapshot() : chainSnapshot(a.current),
      toKey: next,
      t: reduceMotion.matches ? 1 : 0,
      ...resolveTransition(s.timing.reverse),
    }
  }

  const syncState = () => {
    const next = getStateForScroll(container.scrollTop)
    if (next !== a.state) {
      a.state = next
      svgState.value = next
      startTransition(next)
    }
  }

  // 内容高度不足（无滚动空间）时整列隐藏；滚动/尺寸/内容变化时复查
  const updateScrollable = () => {
    scrollable.value = container.scrollHeight - container.clientHeight > 0
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
    // 波纹弹簧：仅在 tracking 态且指针悬停时激活
    const strengthTarget = hoverActive && a.state === "tracking" ? 1 : 0
    const pointerSettled = advanceSpring(pointerSpring, hoverRow, POINTER_SPRING, dt)
    const strengthSettled = advanceSpring(strengthSpring, strengthTarget, STRENGTH_SPRING, dt)
    const extensionsSettled = advanceExtensions(dt)
    const settled = pointerSettled && strengthSettled && extensionsSettled
    if (!reduceMotion.matches) bobTime += dt
    if (direct) {
      direct.t = reduceMotion.matches ? 1 : Math.min(1, direct.t + dt / direct.duration)
      if (direct.t >= 1 && settled) {
        direct = null
        a.current = a.target // 直达完成，标量对齐目标 pose
      }
    } else {
      advance(dt)
    }
    renderCurrent()
    const bobbing = direct === null && a.current === 0 && !reduceMotion.matches
    if (direct === null && a.current === a.target && settled && !bobbing) {
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

  const onScroll = () => {
    updateScrollable()
    syncState()
    kick()
  }

  updateScrollable()
  syncState()
  a.target = getTargetForState(a.state)
  if (!didEnter) {
    // 挂载时只播进入目标 pose 的最后一段过渡（滚动过则 split -> tracking）；
    // 减弱动效直接就位。后续设置变化保持动画位置不变
    a.current = reduceMotion.matches ? a.target : Math.max(a.target - 1, 0)
    didEnter = true
  }
  // 进度焦点伸展挂载即就位（不平滑），避免初始一帧全收拢
  {
    const mountFocusDot = getFocusDot(container, dotCount.value)
    for (let i = 0; i < dotCount.value; i++) {
      extensions[i] = getFocusExtension(i, mountFocusDot)
    }
  }
  renderCurrent()
  placeArrowHitArea()
  kick() // 启动 idle 浮动或入场动画
  activeRender = renderCurrent
  activeKick = kick

  const resizeObserver = new ResizeObserver(() => {
    if (!scrollable.value) return // 隐藏时尺寸为 0，跳过重测，重新显示时会再触发
    if (syncDotCount()) return // 高度变化导致点数变化，等 watch(dotCount) 重连
    poses = getPoses(svg.getBoundingClientRect(), buildGeometry())
    renderCurrent()
    placeArrowHitArea()
  })
  resizeObserver.observe(svg)

  // 内容增删不改变容器自身尺寸，需监听 DOM 变化复查可滚动性
  const mutationObserver = new MutationObserver(updateScrollable)
  mutationObserver.observe(container, { childList: true, subtree: true })

  container.addEventListener("scroll", onScroll, { passive: true })
  return () => {
    container.removeEventListener("scroll", onScroll)
    resizeObserver.disconnect()
    mutationObserver.disconnect()
    if (a.rafId !== null) cancelAnimationFrame(a.rafId)
    a.rafId = null
    activeRender = null
    activeKick = null
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
// 标注点变化只影响颜色/伸展（rAF 中读取 markerDots），重绘一帧即可，无需重连
watch(markerDots, () => activeRender?.())

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
  <div v-show="scrollable" class="scrollbar-wrap" :style="{ width: `${trackWidth}px` }" @pointermove="onTrackPointerMove"
    @pointerleave="onTrackPointerLeave">
    <svg ref="svgRef" class="scrollbar" :data-state="svgState" aria-hidden="true" :style="svgStyle">
      <line ref="leftWingRef" />
      <line ref="rightWingRef" />
      <line v-for="(_, i) in dotCount" :key="`piece-${i}`" :ref="(el: any) => setPieceRef(i, el)" />
      <!-- tracking 态整轨点击热区 -->
      <rect class="hit-area" x="0" y="0" width="100%" height="100%" @click="onTrackClick" />
      <!-- idle 态箭头点击热区 -->
      <rect ref="arrowHitRef" class="arrow-hit" @click="scrollToBottom"
        @mouseenter="onArrowEnter" @mouseleave="onArrowLeave" />
    </svg>

    <!-- 标注点悬停卡片：teleport 到 body，悬浮于所有容器之上，展示在轨道左侧 -->
    <Teleport to="body">
      <Transition name="scrollbar-marker">
        <div v-if="hoverMarkerCard" class="scrollbar-marker-card"
          :style="{ top: `${hoverMarkerCard.top}px`, left: `${hoverMarkerCard.left - 8}px` }">
          {{ hoverMarkerCard.marker.label }}
        </div>
      </Transition>
    </Teleport>
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
}

/* 整轨点击热区：仅 tracking 态激活 */
.scrollbar .hit-area {
  fill: none;
  pointer-events: none;
}

.scrollbar[data-state="tracking"] .hit-area {
  pointer-events: all;
  cursor: pointer;
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

/* 标注点悬停卡片（teleport 到 body，fixed 定位） */
.scrollbar-marker-card {
  position: fixed;
  transform: translate(-100%, -50%);
  z-index: 9999;
  pointer-events: none;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--popover);
  color: var(--popover-foreground);
  padding: 0.25rem 0.625rem;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.08), 0 8px 24px -8px rgba(0, 0, 0, 0.18);
}

.scrollbar-marker-enter-active,
.scrollbar-marker-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.scrollbar-marker-enter-from,
.scrollbar-marker-leave-to {
  opacity: 0;
  transform: translate(-100%, -50%) translateX(4px);
}
</style>
