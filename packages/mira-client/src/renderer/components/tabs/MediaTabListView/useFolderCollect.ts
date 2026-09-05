import { nextTick, onScopeDispose, ref } from 'vue'
import { useLibraryStore } from '@renderer/stores/library'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import type { FileInfo } from '@/shared/types'

/**
 * 选中素材点击文件夹的「收入文件夹」动画（移植自 photo-library-organizer）：
 *  Phase 1 — 素材克隆从原卡片位置飞到目标文件夹上方（缩放 + 交错旋转，0.38s）
 *  Phase 2 — 素材从文件夹上方以弹簧过冲落进文件夹，文件夹本体弹跳
 * 动画期间原卡片隐藏占位，移动 API 与动画并行，全部完成后刷新并恢复占位卡片可见性。
 */

/** Phase 1：原位 → 文件夹上方（中心坐标 + 起点缩放，动画走纯 transform） */
export interface FolderCollectFlightItem {
  id: string
  thumb: string
  startCenterX: number
  startCenterY: number
  startScaleX: number
  startScaleY: number
  endCenterX: number
  endCenterY: number
  targetSize: number
  rotate: number
}

/** Phase 2：文件夹上方 → 文件夹口袋（left/top 为落定位置，fromX/fromY 为起始偏移） */
export interface FolderCollectDropState {
  size: number
  items: Array<{
    id: string
    thumb: string
    left: number
    top: number
    fromX: number
    fromY: number
    fromRotate: number
    settledRotate: number
    settledScale: number
  }>
}

// 落进文件夹后的堆叠姿态（与参考实现一致）
const SETTLED_OFFSETS = [
  { rotate: -8, x: -16, y: -10, scale: 0.86 },
  { rotate: 6, x: 14, y: -12, scale: 0.88 },
  { rotate: -3, x: -6, y: -16, scale: 0.92 },
  { rotate: 4, x: 8, y: -18, scale: 0.95 },
]

const PHASE1_DURATION = 380
const PHASE1_STAGGER = 20
const PHASE2_BASE = 700
const PHASE2_STAGGER = 120

export function useFolderCollect(deps: {
  getSelectedIds: () => string[]
  getMediaItems: () => FileInfo[]
  handleRefresh: (preserveSelection?: boolean) => Promise<void>
  clearSelection: () => void
}) {
  const flights = ref<FolderCollectFlightItem[]>([])
  const drops = ref<FolderCollectDropState | null>(null)
  const isCollecting = ref(false)

  const libraryStore = useLibraryStore()
  let phaseTimer: number | null = null
  let hiddenCards: HTMLElement[] = []

  const clearTimers = () => {
    if (phaseTimer !== null) {
      clearTimeout(phaseTimer)
      phaseTimer = null
    }
  }

  const restoreHiddenCards = () => {
    hiddenCards.forEach(el => {
      if (el.isConnected) el.style.visibility = ''
    })
    hiddenCards = []
  }

  /**
   * 把选中素材收入目标文件夹（带两阶段动画）。
   * 返回 false 表示当前状态无法启动（无选中 / 找不到卡片），调用方应回退到原导航行为。
   */
  async function collectToFolder(folder: { id: number | string }): Promise<boolean> {
    const selectedIds = deps.getSelectedIds()
    if (isCollecting.value || selectedIds.length === 0) return false

    const folderEl = document.querySelector<HTMLElement>(`[data-folder-id="${CSS.escape(String(folder.id))}"]`)
    if (!folderEl) return false

    const byId = new Map(deps.getMediaItems().map(item => [item.id, item]))
    const targets = selectedIds.map(id => byId.get(id)).filter((item): item is FileInfo => !!item)
    if (targets.length === 0) return false

    // 采集起点：优先卡片内缩略图（列表视图整行过宽），否则用卡片本身
    const cards: Array<{ el: HTMLElement; rect: DOMRect; item: FileInfo }> = []
    for (const item of targets) {
      const el = document.querySelector<HTMLElement>(`[data-selectable-id="${CSS.escape(item.id)}"]`)
      if (!el) continue
      const img = el.querySelector('img')
      const source = img && img.getBoundingClientRect().height > 0 ? img : el
      cards.push({ el, rect: source.getBoundingClientRect(), item })
    }
    if (cards.length === 0) return false

    const folderRect = folderEl.getBoundingClientRect()
    const size = Math.round(Math.min(64, Math.max(44, folderRect.width * 0.42)))
    const centerX = folderRect.left + folderRect.width / 2
    const folderCenterY = folderRect.top + folderRect.height / 2

    isCollecting.value = true
    deps.clearSelection()

    // 原卡片立即隐藏（保留占位避免布局跳动），克隆元素从原位置起飞
    cards.forEach(({ el }) => { el.style.visibility = 'hidden' })
    hiddenCards = cards.map(({ el }) => el)

    // Phase 1 目标：文件夹上方悬浮，交错偏移与旋转（与参考实现一致）
    const flightItems: FolderCollectFlightItem[] = cards.map(({ rect, item }, index) => ({
      id: item.id,
      thumb: item.thumbnailPath || item.url || '',
      startCenterX: rect.left + rect.width / 2,
      startCenterY: rect.top + rect.height / 2,
      startScaleX: rect.width / size,
      startScaleY: rect.height / size,
      endCenterX: centerX + (index % 2 === 0 ? -1 : 1) * (4 + index * 3),
      endCenterY: folderRect.top - 65 - index * 12 + size / 2,
      targetSize: size,
      rotate: (index % 2 === 0 ? -6 : 6) + index * 2,
    }))
    console.debug('[FolderCollect] folder rect:', folderRect.toJSON(), 'items:', flightItems)
    flights.value = flightItems

    // 移动 API 与动画并行执行
    const libraryId = libraryStore.currentLibrary?.id
    const movePromise = (async () => {
      if (!libraryId) return
      for (const item of cards) {
        try {
          await miraSDKService.moveFileToFolder(libraryId, Number(item.item.id), Number(folder.id))
        } catch (error) {
          console.error('[FolderCollect] moveFileToFolder failed:', item.item.id, error)
        }
      }
    })()

    // Phase 1 结束 → Phase 2：无缝衔接（起始偏移 = Phase 1 终点 - 落定位置）
    phaseTimer = window.setTimeout(() => {
      flights.value = []
      drops.value = {
        size,
        items: flightItems.map((flight, index) => {
          const offset = SETTLED_OFFSETS[index % SETTLED_OFFSETS.length]
          const settledCenterX = centerX + offset.x
          const settledCenterY = folderCenterY + offset.y
          return {
            id: flight.id,
            thumb: flight.thumb,
            left: settledCenterX - size / 2,
            top: settledCenterY - size / 2,
            fromX: flight.endCenterX - settledCenterX,
            fromY: flight.endCenterY - settledCenterY,
            fromRotate: flight.rotate,
            settledRotate: offset.rotate,
            settledScale: offset.scale,
          }
        }),
      }

      // 文件夹本体弹跳（与参考 keyframes 一致：y [0,4,-2,2,0] / scale [1,0.98,1.02,0.99,1]）
      folderEl.animate(
        [
          { transform: 'translateY(0px) scale(1)' },
          { transform: 'translateY(4px) scale(0.98)' },
          { transform: 'translateY(-2px) scale(1.02)' },
          { transform: 'translateY(2px) scale(0.99)' },
          { transform: 'translateY(0px) scale(1)' },
        ],
        { duration: 450, easing: 'ease-out' },
      )

      phaseTimer = window.setTimeout(async () => {
        drops.value = null
        await movePromise
        await deps.handleRefresh()
        await nextTick()
        restoreHiddenCards()
        isCollecting.value = false
      }, PHASE2_BASE + PHASE2_STAGGER * (flightItems.length - 1))
    }, PHASE1_DURATION + PHASE1_STAGGER * (flightItems.length - 1))

    return true
  }

  onScopeDispose(() => {
    clearTimers()
    restoreHiddenCards()
    flights.value = []
    drops.value = null
  })

  return { flights, drops, isCollecting, collectToFolder }
}
