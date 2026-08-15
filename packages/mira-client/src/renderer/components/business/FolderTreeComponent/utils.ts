import type { FolderItem } from '@renderer/types/components'
import { pinyinMatch } from '@renderer/utils/helpers'
import type { HeTreeNode } from './types'

export const convertColorToHex = (color?: number | null): string => {
  if (color === null || color === undefined) return '#6B7280'
  if (typeof color === 'number' && color > 0) return `#${color.toString(16).padStart(6, '0')}`
  return '#6B7280'
}

export function resolveNodeId(node: HeTreeNode, isFolder: boolean): number {
  // tag 节点 id 格式为 "tag-123"
  const raw = node.id
  return parseInt(isFolder ? raw : raw.replace('tag-', ''))
}

// 数据转换：FolderItem[] -> HeTreeNode[]
export function convertFoldersToNodes(items: FolderItem[]): HeTreeNode[] {
  return items.map(f => ({
    id: f.id,
    label: f.label || (f as any).title || (f as any).name,
    icon: f.icon || 'folder',
    count: f.count,
    color: (f as any).originalData?.color ?? (f as any).color,
    nodeType: 'folder',
    originalData: (f as any).originalData || f,
    children: f.children ? convertFoldersToNodes(f.children) : undefined,
  }))
}

export function convertTagsToNodes(tags: any[]): HeTreeNode[] {
  return tags.map(t => ({
    id: `tag-${t.id}`,
    label: t.name || t.title || t.label,
    icon: t.icon || 'label',
    count: t.fileCount || t.count,
    color: t.color,
    nodeType: 'tag',
    originalData: t,
    children: undefined,
  }))
}

// 过滤（拼音匹配；子节点命中时保留父节点）
export function filterNodes(nodes: HeTreeNode[], query: string): HeTreeNode[] {
  const result: HeTreeNode[] = []
  for (const node of nodes) {
    const match = pinyinMatch(node.label, query)
    const filteredChildren = node.children ? filterNodes(node.children, query) : []
    if (match || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      })
    }
  }
  return result
}

// 递归收集节点及其所有后代 id
export function collectDescendantIds(node: HeTreeNode, acc: string[] = []): string[] {
  acc.push(node.id)
  if (node.children?.length) {
    for (const child of node.children) collectDescendantIds(child, acc)
  }
  return acc
}

// 构造 emit('select') 载荷
// id 放在 originalData 展开之后，避免被原始数据中的数字 id 覆盖（节点 id 始终是字符串）
export function buildSelectPayload(node: HeTreeNode, defaultIcon: string, extra?: Record<string, any>) {
  return {
    label: node.label,
    icon: node.icon || defaultIcon,
    count: node.count,
    ...node.originalData,
    id: node.id,
    ...extra,
  }
}

// 收集实际要删除的节点：仅保留被选中、且不被某个已选中的祖先节点包含的节点
// （避免对分组勾选时重复删除其后代）
export function collectTopLevelSelectedNodes(nodes: HeTreeNode[], selectedSet: Set<string>): { nodes: HeTreeNode[]; total: number } {
  const topLevel: HeTreeNode[] = []
  const visit = (list: HeTreeNode[], ancestorSelected: boolean) => {
    for (const node of list) {
      const isSelected = selectedSet.has(node.id)
      if (isSelected && !ancestorSelected) {
        topLevel.push(node)
      }
      if (node.children?.length) {
        visit(node.children, ancestorSelected || isSelected)
      }
    }
  }
  visit(nodes, false)
  return { nodes: topLevel, total: selectedSet.size }
}

// —— 文件拖放辅助 ——

export function hasAcceptableFileDrag(e: DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types || [])
  return Boolean(
    (window as any).__miraInternalDrag ||
    (window as any).__miraInternalDragFilePaths?.length ||
    e.dataTransfer?.files?.length ||
    types.includes('Files')
  )
}

function normalizeDragPath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

export function resolveInternalDraggedFileIds(e: DragEvent): string[] {
  const cachedIds = ((window as any).__miraInternalDragFileIds || []) as string[]
  const cachedPaths = ((window as any).__miraInternalDragFilePaths || []) as string[]

  if ((window as any).__miraInternalDrag && cachedIds.length > 0) {
    return cachedIds
  }

  if (!e.dataTransfer?.files?.length || cachedIds.length === 0 || cachedPaths.length === 0) {
    return []
  }

  const droppedPaths = Array.from(e.dataTransfer.files)
    .map(file => (file as File & { path?: string }).path || '')
    .filter(Boolean)
    .map(normalizeDragPath)

  if (droppedPaths.length === 0) return []

  const droppedPathSet = new Set(droppedPaths)
  const matchedIds = cachedPaths
    .map((path, index) => droppedPathSet.has(normalizeDragPath(path)) ? cachedIds[index] : null)
    .filter((id): id is string => Boolean(id))

  return matchedIds.length > 0 ? matchedIds : []
}

export function clearInternalDragState() {
  ; (window as any).__miraInternalDrag = false
    ; (window as any).__miraInternalDragFileIds = []
    ; (window as any).__miraInternalDragFilePaths = []
}
