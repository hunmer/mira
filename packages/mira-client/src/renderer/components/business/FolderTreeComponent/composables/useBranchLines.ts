import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { HeTreeNode } from '../types'

const LINE_INDENT = 20
const LINE_R = 6

export interface BranchPath {
  key: string
  d: string
  stroke: string
}

interface NodeInfo {
  node: HeTreeNode
  parent: HeTreeNode | null
  level: number
}

/**
 * 基于 @he-tree/vue 的可见行 DOM 生成整路径 SVG 连线。
 * 每条路径对应 parent -> child，hover/选中时按祖先链点亮完整路径。
 */
export function useBranchLines(options: {
  treeData: () => HeTreeNode[]
  selectedKey: () => string | undefined
  layerRef: Ref<HTMLElement | null>
  rowsRef: Ref<HTMLElement | null>
  iconIndent: () => boolean
}) {
  const paths = ref<BranchPath[]>([])
  const width = ref(1)
  const height = ref(1)
  const hoverId = ref<string | null>(null)

  const infoMap = computed(() => {
    const map = new Map<string, NodeInfo>()
    const walk = (nodes: HeTreeNode[], parent: HeTreeNode | null, level: number) => {
      for (const node of nodes) {
        map.set(node.id, { node, parent, level })
        if (node.children?.length) walk(node.children, node, level + 1)
      }
    }
    walk(options.treeData(), null, 1)
    return map
  })

  function collectPathKeys(targetId: string | null | undefined): Set<string> {
    const keys = new Set<string>()
    let current = targetId ? infoMap.value.get(targetId) : undefined
    while (current?.parent) {
      keys.add(`${current.parent.id}->${current.node.id}`)
      current = infoMap.value.get(current.parent.id)
    }
    return keys
  }

  const activePathKeys = computed(() => collectPathKeys(options.selectedKey()))
  const hoverPathKeys = computed(() => collectPathKeys(hoverId.value))

  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  function setHover(id: string | null) {
    if (hoverTimer) clearTimeout(hoverTimer)
    if (id) {
      hoverId.value = id
      return
    }
    hoverTimer = setTimeout(() => { hoverId.value = null }, 120)
  }

  function colorHex(color?: number | null): string {
    if (color == null || color === 0) return 'var(--primary)'
    return `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`
  }

  async function measureRows() {
    await nextTick()
    const layer = options.layerRef.value
    const rowsRoot = options.rowsRef.value
    if (!layer || !rowsRoot) return

    const layerRect = layer.getBoundingClientRect()
    const rowElements = Array.from(rowsRoot.querySelectorAll<HTMLElement>('[data-folder-tree-node-id]'))
    const rowMap = new Map(rowElements.map(row => [row.dataset.folderTreeNodeId || '', row]))
    const nextPaths: BranchPath[] = []

    for (const row of rowElements) {
      const id = row.dataset.folderTreeNodeId || ''
      const info = infoMap.value.get(id)
      if (!info?.parent) continue
      const parentRow = rowMap.get(info.parent.id)
      if (!parentRow) continue

      const rowRect = row.getBoundingClientRect()
      const parentRect = parentRow.getBoundingClientRect()
      const iconOffset = options.iconIndent() ? (info.level - 1) * LINE_INDENT : 0
      const endX = rowRect.left - layerRect.left + 7 + iconOffset
      const trunkX = endX - 10
      const startY = parentRect.bottom - layerRect.top
      const y = rowRect.top - layerRect.top + rowRect.height / 2
      const turnY = Math.max(startY, y - LINE_R)

      nextPaths.push({
        key: `${info.parent.id}->${id}`,
        d: `M ${trunkX} ${startY} L ${trunkX} ${turnY} A ${LINE_R} ${LINE_R} 0 0 0 ${trunkX + LINE_R} ${y} L ${endX} ${y}`,
        stroke: colorHex(info.parent.color),
      })
    }

    paths.value = nextPaths
    width.value = Math.max(1, Math.ceil(layer.scrollWidth))
    height.value = Math.max(1, Math.ceil(layer.scrollHeight))
  }

  let measureFrame = 0
  function scheduleMeasure() {
    if (measureFrame) return
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0
      void measureRows()
    })
  }

  let mutationObserver: MutationObserver | null = null
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    const rowsRoot = options.rowsRef.value
    if (rowsRoot) {
      mutationObserver = new MutationObserver(scheduleMeasure)
      mutationObserver.observe(rowsRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
      resizeObserver = new ResizeObserver(scheduleMeasure)
      resizeObserver.observe(rowsRoot)
    }
    scheduleMeasure()
  })

  watch(() => [options.treeData(), options.iconIndent()], scheduleMeasure, { deep: true })

  onBeforeUnmount(() => {
    if (hoverTimer) clearTimeout(hoverTimer)
    if (measureFrame) cancelAnimationFrame(measureFrame)
    mutationObserver?.disconnect()
    resizeObserver?.disconnect()
  })

  return {
    paths,
    width,
    height,
    activePathKeys,
    hoverPathKeys,
    setHover,
    scheduleMeasure,
  }
}
