import type { MasonryItemMeta } from "./types"

export interface PlacedItem<T> {
  key: string | number
  item: T
  index: number
  left: number
  top: number
  width: number
  height: number
  lazy: boolean
}

interface ParsedItem<T> {
  item: T
  index: number
  colSpan: number
  height: number
  lazy: boolean
}

/** 宽高比字符串 -> height/width 比例 */
function aspectToRatio(aspect?: string): number | null {
  if (!aspect) return null
  const parts = aspect.split(/[:xX]/).map((n) => Number(n))
  if (parts.length !== 2 || parts.some((v) => !isFinite(v) || v <= 0)) return null
  const [w, h] = parts
  return h / w
}

/** 贪心布局:每个 item 放到连续 colSpan 列中"当前最矮"的位置 */
export function layout<T>(
  data: T[],
  columns: number,
  colWidth: number,
  gap: number,
  rowHeight: number,
  getMeta: ((item: T, i: number) => MasonryItemMeta | undefined) | undefined,
  getKey: (item: T, i: number) => string | number
): { items: PlacedItem<T>[]; totalHeight: number } {
  const items: PlacedItem<T>[] = []
  if (columns <= 0 || colWidth <= 0) return { items, totalHeight: 0 }

  const bottoms = new Array(columns).fill(0)

  data.forEach((item, index) => {
    const meta = getMeta?.(item, index) ?? {}
    const colSpan = Math.min(Math.max(Math.floor(meta.colSpan ?? 1), 1), columns)

    let bestStart = 0
    let minTop = Infinity
    for (let start = 0; start <= columns - colSpan; start++) {
      let top = 0
      for (let column = start; column < start + colSpan; column++) {
        top = Math.max(top, bottoms[column])
      }
      if (top < minTop) {
        minTop = top
        bestStart = start
      }
    }

    const width = colSpan * colWidth + (colSpan - 1) * gap
    const ratio = aspectToRatio(meta.aspect)
    const height = typeof meta.height === "number"
      ? meta.height
      : ratio != null
        ? width * ratio
        : (meta.rowSpan ?? 1) * rowHeight

    for (let column = bestStart; column < bestStart + colSpan; column++) {
      bottoms[column] = minTop + height + gap
    }

    items.push({
      key: getKey(item, index),
      item,
      index,
      left: bestStart * (colWidth + gap),
      top: minTop,
      width,
      height,
      lazy: !!meta.lazy
    })
  })

  const totalHeight = Math.max(0, Math.max(...bottoms, 0) - gap)
  return { items, totalHeight }
}

/**
 * 智能填充布局:
 *  1. 按输入顺序逐项定位,后续项目不会改变已有项目的位置。
 *  2. 单列项优先回填此前跨列项产生的洞区,没有可用洞区时进入最矮列。
 */
export function layoutFill<T>(
  data: T[],
  columns: number,
  colWidth: number,
  gap: number,
  rowHeight: number,
  getMeta: ((item: T, i: number) => MasonryItemMeta | undefined) | undefined,
  getKey: (item: T, i: number) => string | number
): { items: PlacedItem<T>[]; totalHeight: number } {
  const items: PlacedItem<T>[] = []
  if (columns <= 0 || colWidth <= 0) return { items, totalHeight: 0 }

  const bottoms = new Array(columns).fill(0)
  const gapSlots: Array<{ column: number; top: number; maxBottom: number }> = []

  const parsed: ParsedItem<T>[] = data.map((item, index) => {
    const meta = getMeta?.(item, index) ?? {}
    const colSpan = Math.min(Math.max(Math.floor(meta.colSpan ?? 1), 1), columns)
    const width = colSpan * colWidth + (colSpan - 1) * gap
    const ratio = aspectToRatio(meta.aspect)
    const height = typeof meta.height === "number"
      ? meta.height
      : ratio != null
        ? width * ratio
        : (meta.rowSpan ?? 1) * rowHeight
    return { item, index, colSpan, height, lazy: !!meta.lazy }
  })

  const pushPlacedItem = (p: ParsedItem<T>, startCol: number, top: number) => {
    const width = p.colSpan * colWidth + (p.colSpan - 1) * gap
    items.push({
      key: getKey(p.item, p.index),
      item: p.item,
      index: p.index,
      left: startCol * (colWidth + gap),
      top,
      width,
      height: p.height,
      lazy: p.lazy
    })
  }

  const placeAtBottom = (p: ParsedItem<T>, startCol: number, top: number) => {
    pushPlacedItem(p, startCol, top)
    for (let column = startCol; column < startCol + p.colSpan; column++) {
      bottoms[column] = top + p.height + gap
    }
  }

  for (const p of parsed) {
    if (p.colSpan === 1) {
      let bestSlot: (typeof gapSlots)[number] | undefined
      let bestRemainder = Infinity

      for (const slot of gapSlots) {
        const remainder = slot.maxBottom - slot.top - p.height
        if (remainder < 0) continue
        if (remainder < bestRemainder) {
          bestSlot = slot
          bestRemainder = remainder
        }
      }

      if (bestSlot) {
        pushPlacedItem(p, bestSlot.column, bestSlot.top)
        bestSlot.top += p.height + gap
        continue
      }

      let minCol = 0
      let minBottom = bottoms[0]
      for (let column = 1; column < columns; column++) {
        if (bottoms[column] < minBottom) {
          minBottom = bottoms[column]
          minCol = column
        }
      }
      placeAtBottom(p, minCol, minBottom)
      continue
    }

    let bestStart = 0
    let minTop = Infinity
    for (let start = 0; start <= columns - p.colSpan; start++) {
      let top = 0
      for (let column = start; column < start + p.colSpan; column++) {
        top = Math.max(top, bottoms[column])
      }
      if (top < minTop) {
        minTop = top
        bestStart = start
      }
    }

    for (let column = bestStart; column < bestStart + p.colSpan; column++) {
      const maxBottom = minTop - gap
      if (bottoms[column] < maxBottom) {
        gapSlots.push({ column, top: bottoms[column], maxBottom })
      }
    }
    placeAtBottom(p, bestStart, minTop)
  }

  const totalHeight = Math.max(0, Math.max(...bottoms, 0) - gap)
  return { items, totalHeight }
}
