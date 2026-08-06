/**
 * Masonry —— 通用瀑布流公共组件（类型定义）
 *
 * 与原 React 版 `masonry.tsx` 对齐，使用 motion-v 实现入场 / 出场 / layout 动画。
 * 高度优先级：height > aspect > rowSpan × rowHeight
 */

import type { CSSProperties } from "vue"

/** 响应式列数：数字 或 Tailwind 断点映射（移动优先 base -> xl） */
export type MasonryColumns =
  | number
  | Partial<Record<"base" | "sm" | "md" | "lg" | "xl", number>>

/** 单个 item 的布局元信息 */
export interface MasonryItemMeta {
  /** 占用列数，默认 1 */
  colSpan?: number
  /** 占用行数（基准行高 rowHeight），默认 1；被 aspect/height 覆盖 */
  rowSpan?: number
  /** 宽高比，如 "16:9" / "9:16" / "1:1" */
  aspect?: string
  /** 显式高度（px），优先级最高 */
  height?: number
  /** 进入视窗才渲染内容（懒加载），默认 false */
  lazy?: boolean
}

export interface MasonrySortOption<T> {
  /** 取排序值，访问 item 自定义属性 */
  by: (item: T) => string | number | undefined
  /** 升序 / 降序，默认 asc */
  order?: "asc" | "desc"
}

export interface MasonryProps<T = any> {
  /** 数据数组 */
  data: T[]
  /** 稳定 key 提取（推荐用 id，排序/动画依赖它） */
  getKey?: (item: T, index: number) => string | number
  /** 提取 item 布局元信息 */
  getMeta?: (item: T, index: number) => MasonryItemMeta | undefined

  /** 列数，默认 3 */
  columns?: MasonryColumns
  /** item 间距 px，默认 16 */
  gap?: number
  /** 基准行高 px，默认 80 */
  rowHeight?: number

  /** 容器 class */
  class?: any
  /** 容器 style */
  style?: CSSProperties

  /** 排序（单字段或多字段） */
  sortBy?: MasonrySortOption<T> | MasonrySortOption<T>[]

  /** 入场动画；true 用默认，或自定义 from/duration */
  enterAnimation?: boolean | { from?: Record<string, number>; duration?: number }
  /** 出场动画 */
  exitAnimation?: boolean | { duration?: number }
  /** 每个 item 入场延迟（stagger），默认 0.05s */
  staggerDelay?: number
  /** 排序/列数变化时是否平滑过渡位置（layout 动画），默认 true */
  layoutTransition?: boolean

  /**
   * 布局模式：
   *  - "stream"（默认）：纯贪心流式，每个 item 放到当前最矮的起始列
   *  - "fill"：智能填充。宽图(colSpan>1)先按序流式定位并记录跨过的洞区，普通图(colSpan=1)
   *            再用 best-fit 优先回填这些洞区，减少坐标空洞。
   *            代价是普通图之间的相对顺序会被打破。
   */
  layoutMode?: "stream" | "fill"

  /** 懒加载触发的 rootMargin，默认 "300px" */
  lazyRootMargin?: string
}
