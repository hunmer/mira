import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { dragContext } from '@he-tree/vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'
import type { HeTreeNode } from '../types'
import { resolveNodeId } from '../utils'

export interface DragConfirmInfo {
  dragId: string
  dragName: string
  newParentId: string | null
  targetLabel: string
  newSiblingIds: { id: number; sort_index: number }[]
}

/** 从 @he-tree 内部 stats 提取整棵最新树（拖拽落点已应用） */
function extractStatsTree(stats: any[]): HeTreeNode[] {
  return (stats || []).map((s) => ({
    ...s.data,
    open: s.open,
    children: s.children?.length ? extractStatsTree(s.children) : undefined,
  }))
}

/**
 * 树内拖拽排序：同层排序直接保存；跨层级移动弹确认框后再执行。
 * localMode 为 true 时跳过服务端接口与确认框，拖拽完成后把最新树结构
 * 通过 onLocalSorted 抛出，由外部自行持久化（本地数据树用）。
 */
export function useDragSort(options: {
  isFolder: Ref<boolean>
  treeRef: Ref<any>
  onRefresh: () => void
  localMode?: boolean
  onLocalSorted?: (nodes: HeTreeNode[]) => void
}) {
  const libraryStore = useLibraryStore()
  const { t } = useI18n()

  const resolveNodeNum = (node: HeTreeNode) => resolveNodeId(node, options.isFolder.value)

  // 拖拽确认状态
  const showDragConfirm = ref(false)
  const dragConfirmInfo = ref<DragConfirmInfo>({
    dragId: '',
    dragName: '',
    newParentId: null,
    targetLabel: '',
    newSiblingIds: [],
  })

  // 拖拽前记录旧 parentId
  let beforeDragParentId: string | null = null

  function onBeforeDragStart() {
    const dragNode = dragContext.dragNode
    if (!dragNode?.data) return
    beforeDragParentId = dragNode.parent?.data?.id ?? null
  }

  // 拖拽完成后：同层级排序 or 跨层级移动
  function onAfterDrop() {
    if (options.localMode) {
      options.onLocalSorted?.(extractStatsTree((options.treeRef.value as any)?.stats ?? []))
      return
    }

    if (!libraryStore.currentLibrary) return

    const dragNode = dragContext.dragNode
    if (!dragNode?.data) return

    const draggedId = dragNode.data.id as string

    const newParentId = dragNode.parent?.data?.id ?? null
    const isSameLevel = newParentId === beforeDragParentId

    if (isSameLevel) {
      // 同层级排序：直接保存
      const items = collectSiblingSortItems(dragNode)
      doUpdateSortIndex(items)
      return
    }

    // 跨层级移动：弹确认前先存好新兄弟排序
    const dragName = dragNode.data.label as string
    const parentLabel = dragNode.parent?.data?.label ?? ''
    const targetLabel = newParentId ? t('business.folderTreeComponent.dragTargetChild', { name: parentLabel }) : t('business.folderTreeComponent.dragTargetRoot')
    const newSiblingIds = collectSiblingSortItems(dragNode)

    dragConfirmInfo.value = { dragId: draggedId, dragName, newParentId, targetLabel, newSiblingIds }
    showDragConfirm.value = true
  }

  // 收集同级节点的 sort_index 映射
  function collectSiblingSortItems(dragNode: any): { id: number; sort_index: number }[] {
    const parent = dragNode.parent
    const siblings: any[] = parent ? parent.children : (options.treeRef.value as any)?.stats ?? []
    if (!siblings || siblings.length === 0) return []
    return siblings.map((s: any, i: number) => ({
      id: resolveNodeNum(s.data),
      sort_index: i,
    }))
  }

  async function doUpdateSortIndex(items: { id: number; sort_index: number }[]) {
    if (items.length === 0) { beforeDragParentId = null; options.onRefresh(); return }
    const libraryId = libraryStore.currentLibrary!.id
    try {
      if (options.isFolder.value) {
        await miraSDKService.updateFolderSortIndex(libraryId, items)
      } else {
        await miraSDKService.updateTagSortIndex(libraryId, items)
      }
    } catch (error) {
      console.error(`Failed to update ${options.isFolder.value ? 'folder' : 'tag'} sort index:`, error)
    }
    beforeDragParentId = null
    options.onRefresh()
  }

  // 跨层级移动确认
  async function confirmDragMove() {
    showDragConfirm.value = false
    if (!libraryStore.currentLibrary) return

    const { dragId, newParentId, newSiblingIds } = dragConfirmInfo.value
    const libraryId = libraryStore.currentLibrary.id
    try {
      // 1. 移动文件夹到新 parent
      await miraSDKService.moveFolder(
        libraryId,
        parseInt(dragId),
        newParentId ? parseInt(newParentId) : null,
      )
      // 2. 把拖拽时的落点位置写入新兄弟们的 sort_index
      if (newSiblingIds.length > 0) {
        await miraSDKService.updateFolderSortIndex(libraryId, newSiblingIds)
      }
    } catch (error) {
      console.error('Failed to move folder via drag and drop:', error)
    }
    beforeDragParentId = null
    options.onRefresh()
  }

  function cancelDragMove() {
    showDragConfirm.value = false
    beforeDragParentId = null
    options.onRefresh()
  }

  return {
    showDragConfirm,
    dragConfirmInfo,
    onBeforeDragStart,
    onAfterDrop,
    confirmDragMove,
    cancelDragMove,
  }
}
