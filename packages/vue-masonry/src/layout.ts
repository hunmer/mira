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
  /** 由 aspect / rowSpan 推导的高度可以在后处理中填补列间空隙。 */
  growable: boolean
}

interface GapSlot {
  column: number
  top: number
  maxBottom: number
  order: number
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
 *  2. 单列项或能匹配连续洞区的跨列项优先回填,没有可用洞区时进入最矮列。
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
  // 按列索引洞区，避免每次跨列查找都对全部洞区 filter/sort。
  const gapSlotsByColumn = Array.from({ length: columns }, () => [] as GapSlot[])
  let nextGapSlotOrder = 0

  const removeGapSlot = (slot: GapSlot) => {
    const columnSlots = gapSlotsByColumn[slot.column]
    const columnIndex = columnSlots.indexOf(slot)
    if (columnIndex >= 0) columnSlots.splice(columnIndex, 1)
  }

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
    return {
      item,
      index,
      colSpan,
      height,
      lazy: !!meta.lazy,
      growable: typeof meta.height !== "number"
    }
  })

  const placements: Array<{ startCol: number; colSpan: number; growable: boolean }> = []
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
    placements.push({ startCol, colSpan: p.colSpan, growable: p.growable })
  }

  const placeAtBottom = (p: ParsedItem<T>, startCol: number, top: number) => {
    pushPlacedItem(p, startCol, top)
    for (let column = startCol; column < startCol + p.colSpan; column++) {
      bottoms[column] = top + p.height + gap
    }
  }

  const findGapRange = (p: ParsedItem<T>) => {
    let best: { startCol: number; top: number; slots: GapSlot[] } | undefined
    let bestRemainder = Infinity

    for (let startCol = 0; startCol <= columns - p.colSpan; startCol++) {
      const slots: GapSlot[] = []
      let valid = true

      for (let column = startCol; column < startCol + p.colSpan; column++) {
        const candidates = gapSlotsByColumn[column]
        let bestSlot: GapSlot | undefined
        let bestRemainderForColumn = Infinity
        for (const slot of candidates) {
          const remainder = slot.maxBottom - slot.top - p.height
          if (remainder >= 0 && remainder < bestRemainderForColumn) {
            bestSlot = slot
            bestRemainderForColumn = remainder
          }
        }
        if (!bestSlot) {
          valid = false
          break
        }
        slots.push(bestSlot)
      }

      if (!valid) continue
      const top = Math.max(...slots.map((slot) => slot.top))
      const maxBottom = Math.min(...slots.map((slot) => slot.maxBottom))
      if (top + p.height > maxBottom) continue

      const remainder = maxBottom - top - p.height
      if (remainder < bestRemainder) {
        best = { startCol, top, slots }
        bestRemainder = remainder
      }
    }

    return best
  }

  for (const p of parsed) {
    if (p.colSpan === 1) {
      let bestSlot: GapSlot | undefined
      let bestRemainder = Infinity

      for (const columnSlots of gapSlotsByColumn) {
        for (const slot of columnSlots) {
          const remainder = slot.maxBottom - slot.top - p.height
          if (remainder < 0) continue
          // 保持原 gapSlots 全局扫描的 tie-break:按创建顺序取第一个。
          if (remainder < bestRemainder || (remainder === bestRemainder && bestSlot && slot.order < bestSlot.order)) {
            bestSlot = slot
            bestRemainder = remainder
          }
        }
      }

      if (bestSlot) {
        pushPlacedItem(p, bestSlot.column, bestSlot.top)
        bestSlot.top += p.height + gap
        if (bestSlot.top >= bestSlot.maxBottom) removeGapSlot(bestSlot)
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

    const gapRange = findGapRange(p)
    if (gapRange) {
      pushPlacedItem(p, gapRange.startCol, gapRange.top)
      const nextTop = gapRange.top + p.height + gap
      for (const slot of gapRange.slots) {
        slot.top = Math.max(slot.top, nextTop)
        if (slot.top >= slot.maxBottom) removeGapSlot(slot)
      }
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
        gapSlotsByColumn[column].push({
          column,
          top: bottoms[column],
          maxBottom,
          order: nextGapSlotOrder++
        })
      }
    }
    placeAtBottom(p, bestStart, minTop)
  }

  // 跨列定位会以占用列中的最高 bottom 为准，较短列因此可能留下超过 gap 的空隙。
  // 在不改变 item 位置且不覆盖下一项的前提下，将可推导高度的 item 拉伸到下一项前。
  const columnItems = Array.from({ length: columns }, () => [] as number[])
  for (let index = 0; index < placements.length; index++) {
    const placement = placements[index]
    for (let column = placement.startCol; column < placement.startCol + placement.colSpan; column++) {
      columnItems[column].push(index)
    }
  }
  for (const indices of columnItems) {
    indices.sort((a, b) => items[a].top - items[b].top || a - b)
  }

  for (let index = 0; index < items.length; index++) {
    if (!placements[index].growable) continue
    const item = items[index]
    const currentBottom = item.top + item.height
    let nextTop = Infinity
    const { startCol, colSpan } = placements[index]
    for (let column = startCol; column < startCol + colSpan; column++) {
      for (const candidateIndex of columnItems[column]) {
        if (candidateIndex === index) continue
        const candidateTop = items[candidateIndex].top
        if (candidateTop > currentBottom && candidateTop < nextTop) nextTop = candidateTop
      }
    }
    if (!Number.isFinite(nextTop)) continue
    const adjustedHeight = nextTop - gap - item.top
    if (adjustedHeight > item.height) item.height = adjustedHeight
  }

  const totalHeight = Math.max(
    0,
    Math.max(...items.map(item => item.top + item.height), 0),
    Math.max(...bottoms, 0) - gap
  )
  return { items, totalHeight }
}
