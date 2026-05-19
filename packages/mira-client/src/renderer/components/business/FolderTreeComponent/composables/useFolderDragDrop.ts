import type { Ref } from 'vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'

export function useFolderDragDrop(
  nodeIdMap: Ref<Map<string, { id: string; parentId: string | null; nodeType: string; data: any }>>,
  emit: {
    (e: 'refresh-folders'): void
    (e: 'refresh-tags'): void
  },
) {
  const libraryStore = useLibraryStore()

  function analyzeDropTarget(dropTarget: HTMLElement, draggedFolderId: string) {
    const dragTargetArea = dropTarget.closest('.drag-target-area')
    if (dragTargetArea) {
      const targetType = (dragTargetArea as HTMLElement).dataset?.targetType
      const targetNode = (dragTargetArea as HTMLElement).dataset?.targetNode
      const targetParent = (dragTargetArea as HTMLElement).dataset?.targetParent
      return {
        isValid: true,
        newParentId: targetParent ? parseInt(targetParent) : null,
        insertPosition: targetType,
        targetNodeId: targetNode,
      }
    }

    const nodeContent = dropTarget.closest('.node-content')
    if (nodeContent) {
      const targetFolderId = (nodeContent as HTMLElement).dataset?.folderId
      const targetNodeType = (nodeContent as HTMLElement).dataset?.nodeType
      if (targetNodeType === 'tag' || targetFolderId === draggedFolderId) {
        return { isValid: false }
      }
      return {
        isValid: true,
        newParentId: targetFolderId ? parseInt(targetFolderId) : null,
        insertPosition: 'child',
        targetNodeId: targetFolderId,
      }
    }

    const treeDragArea = dropTarget.closest('.tree-drag-area')
    if (treeDragArea) {
      let currentElement = treeDragArea.parentElement
      while (currentElement && !currentElement.classList.contains('folder-tree-container')) {
        const nc = currentElement.querySelector('.node-content')
        if (nc) {
          const parentFolderId = (nc as HTMLElement).dataset?.folderId
          const parentNodeType = (nc as HTMLElement).dataset?.nodeType
          if (parentNodeType !== 'tag' && parentFolderId !== draggedFolderId) {
            return {
              isValid: true,
              newParentId: parentFolderId ? parseInt(parentFolderId) : null,
              insertPosition: 'child',
              targetNodeId: parentFolderId,
            }
          }
        }
        currentElement = currentElement.parentElement
      }
      return { isValid: true, newParentId: null, insertPosition: 'root', targetNodeId: null }
    }

    const treeContainer = dropTarget.closest('.folder-tree-container')
    if (treeContainer) {
      return { isValid: true, newParentId: null, insertPosition: 'root', targetNodeId: null }
    }

    let el = dropTarget.parentElement
    while (el) {
      const nc = el.querySelector('.node-content')
      if (nc) {
        const parentFolderId = (nc as HTMLElement).dataset?.folderId
        const parentNodeType = (nc as HTMLElement).dataset?.nodeType
        if (parentNodeType !== 'tag' && parentFolderId !== draggedFolderId) {
          return {
            isValid: true,
            newParentId: parentFolderId ? parseInt(parentFolderId) : null,
            insertPosition: 'child',
            targetNodeId: parentFolderId,
          }
        }
      }
      el = el.parentElement
    }

    return { isValid: false }
  }

  function setupDragEventListeners() {
    const container = document.querySelector('.folder-tree-container')
    if (!container) return

    container.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement
      const nodeContent = target.closest('.node-content')
      if (nodeContent) nodeContent.classList.add('dragging')
    })

    container.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement
      const nodeContent = target.closest('.node-content')
      if (nodeContent) nodeContent.classList.remove('dragging')
      container.querySelectorAll('.drag-target-area.drag-over').forEach(el => {
        el.classList.remove('drag-over')
      })
    })

    container.addEventListener('dragenter', (e) => {
      e.preventDefault()
      const target = e.target as HTMLElement
      const dragTargetArea = target.closest('.drag-target-area')
      if (dragTargetArea) dragTargetArea.classList.add('drag-over')
    })

    container.addEventListener('dragleave', (e) => {
      const target = e.target as HTMLElement
      const dragTargetArea = target.closest('.drag-target-area')
      if (dragTargetArea) {
        const rect = dragTargetArea.getBoundingClientRect()
        const x = (e as DragEvent).clientX
        const y = (e as DragEvent).clientY
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          dragTargetArea.classList.remove('drag-over')
        }
      }
    })

    container.addEventListener('dragover', (e) => {
      e.preventDefault()
    })
  }

  async function onDragEnd(event: any) {
    if (!libraryStore.currentLibrary) return

    try {
      let draggedFolderId: string | null = null
      let nodeInfo: any = null

      if (event.item) {
        const draggedElement = event.item
        draggedFolderId = draggedElement.dataset?.folderId || draggedElement.getAttribute?.('data-folder-id')
        if (draggedFolderId) {
          nodeInfo = nodeIdMap.value.get(draggedFolderId)
        }
      }

      if (!draggedFolderId || !nodeInfo) return
      if (nodeInfo.nodeType === 'tag') return

      const dropInfo = analyzeDropTarget(event.to, draggedFolderId)
      if (!dropInfo.isValid) return

      const currentParentId = nodeInfo.parentId
      const currentParentIdNum = currentParentId ? parseInt(currentParentId) : null

      if (currentParentIdNum === dropInfo.newParentId) return
      if (dropInfo.newParentId && dropInfo.newParentId.toString() === draggedFolderId) return

      const libraryId = libraryStore.currentLibrary.id
      await miraSDKService.moveFolder(libraryId, parseInt(draggedFolderId), dropInfo.newParentId ?? null)
      await new Promise(resolve => setTimeout(resolve, 100))
      emit('refresh-folders')
    } catch (error) {
      console.error('Failed to move folder via drag and drop:', error)
      emit('refresh-folders')
    }
  }

  async function onTagDragEnd(event: any) {
    if (!event.item || !libraryStore.currentLibrary) return

    try {
      const draggedNode = event.item
      let draggedElement = draggedNode.querySelector('.node-content')

      if (!draggedElement) {
        if (draggedNode.classList?.contains('node-content')) {
          draggedElement = draggedNode
        } else {
          draggedElement = draggedNode.closest('.node-content')
        }
      }

      if (!draggedElement) {
        draggedElement = draggedNode.querySelector('[data-folder-id]') ||
                        draggedNode.closest('[data-folder-id]') ||
                        draggedNode
      }

      const draggedTagId = draggedElement.dataset?.folderId || draggedElement.getAttribute?.('data-folder-id')
      const nodeType = draggedElement.dataset?.nodeType || draggedElement.getAttribute?.('data-node-type')

      if (!draggedTagId || nodeType !== 'tag') return

      const dropInfo = analyzeDropTarget(event.to, draggedTagId)
      console.log('Tag drag completed, tag ID:', draggedTagId, 'Drop info:', dropInfo)
      emit('refresh-tags')
    } catch (error) {
      console.error('Failed to handle tag drag and drop:', error)
      emit('refresh-tags')
    }
  }

  return {
    setupDragEventListeners,
    onDragEnd,
    onTagDragEnd,
  }
}
