/**
 * 五个形态的几何 pose 计算
 * 复刻自 scrollbar-but-cooler 的 utils/poses.ts
 */

export type ScrollbarState =
  | "idle" // 右下角箭头提示
  | "compressed" // 箭头折叠成一条圆头短线
  | "extended" // 线增长到整个轨道高度
  | "split" // 线断成一列点
  | "tracking" // 靠近当前位置的点向左伸展

const IDLE_TIP_MARGIN_BOTTOM = 40
const SPLIT_DOT_LENGTH = 0.01 // 需要非零值避免渲染不出

export const POSE_ORDER = ["idle", "compressed", "extended", "split", "tracking"] as const

export type LineEndpoints = readonly [x1: number, y1: number, x2: number, y2: number]
type Pose = {
  leftWing: LineEndpoints
  rightWing: LineEndpoints
  pieces: readonly LineEndpoints[] // dotCount 条
}
type Size = { width: number; height: number }
export type Geometry = {
  arrowLength: number
  wingSpread: number
  lineLength: number
  dotCount: number
  /** 点列垂直轴距轨道右缘的距离 */
  axisMarginRight: number
  /** idle 箭头中心轴 x；缺省与点列轴重合（窄轨道下点列贴右缘，箭头在轨道内居中以免右翼被裁） */
  arrowAxis?: number
}

// 把一条线画成共线的短段拼接（extended 步）
const linePieces = (x: number, top: number, bottom: number, dotCount: number): LineEndpoints[] => {
  const step = (bottom - top) / dotCount
  return Array.from({ length: dotCount }, (_, i): LineEndpoints => [
    x,
    top + i * step,
    x,
    top + (i + 1) * step,
  ])
}

// 画点列（split 步）
const dotPieces = (x: number, top: number, bottom: number, dotCount: number): LineEndpoints[] => {
  const step = (bottom - top) / dotCount
  return Array.from({ length: dotCount }, (_, i): LineEndpoints => {
    const center = top + (i + 0.5) * step
    return [x, center - SPLIT_DOT_LENGTH / 2, x, center + SPLIT_DOT_LENGTH / 2]
  })
}

// [x1, y1, x2, y2]
export const getPoses = ({ width, height }: Size, geometry: Geometry) => {
  const verticalAxis = width - geometry.axisMarginRight
  const arrowAxis = geometry.arrowAxis ?? verticalAxis
  const bottomY = height - IDLE_TIP_MARGIN_BOTTOM
  const extendedLineTop = height / 2 - geometry.lineLength / 2
  const extendedLineBottom = height / 2 + geometry.lineLength / 2
  // idle 箭头（杆+翼）沿 arrowAxis，其余形态沿点列轴 verticalAxis
  const shaftPieces = linePieces(
    arrowAxis,
    bottomY - geometry.arrowLength,
    bottomY,
    geometry.dotCount,
  )

  const splitBottomDotCenter =
    extendedLineBottom - geometry.lineLength / geometry.dotCount / 2 // 翼点需要

  const dotsPose: Pose = {
    leftWing: [verticalAxis, splitBottomDotCenter, verticalAxis, splitBottomDotCenter],
    rightWing: [verticalAxis, splitBottomDotCenter, verticalAxis, splitBottomDotCenter],
    pieces: dotPieces(verticalAxis, extendedLineTop, extendedLineBottom, geometry.dotCount),
  }
  return {
    idle: {
      leftWing: [arrowAxis - geometry.wingSpread, bottomY - geometry.wingSpread, arrowAxis, bottomY],
      rightWing: [arrowAxis + geometry.wingSpread, bottomY - geometry.wingSpread, arrowAxis, bottomY],
      pieces: shaftPieces,
    },
    compressed: {
      leftWing: [verticalAxis, bottomY, verticalAxis, bottomY],
      rightWing: [verticalAxis, bottomY, verticalAxis, bottomY],
      pieces: shaftPieces,
    },
    extended: {
      // 折叠的翼此后一直贴着线的底端，藏在圆头线帽下面
      leftWing: [verticalAxis, extendedLineBottom, verticalAxis, extendedLineBottom],
      rightWing: [verticalAxis, extendedLineBottom, verticalAxis, extendedLineBottom],
      pieces: linePieces(verticalAxis, extendedLineTop, extendedLineBottom, geometry.dotCount),
    },
    split: dotsPose,
    tracking: dotsPose,
  } satisfies Partial<Record<ScrollbarState, Pose>>
}

export const getTargetForState = (state: ScrollbarState): number => {
  const i = POSE_ORDER.findIndex(pose => pose === state)
  return i === -1 ? POSE_ORDER.length - 1 : i
}
