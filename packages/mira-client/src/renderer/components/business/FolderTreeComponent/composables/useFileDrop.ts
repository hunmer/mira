import { ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'
import { useTagStore } from '@renderer/stores/tag'
import { useMediaStore } from '@renderer/stores/media'
import { useSettingsStore } from '@renderer/stores/settings'
import { useToast } from '@renderer/composables/useToast'
import type { HeTreeNode } from '../types'
import {
  clearInternalDragState,
  hasAcceptableFileDrag,
  resolveInternalDraggedFileIds,
  resolveNodeId,
} from '../utils'

/**
 * 文件拖放：外部文件拖入节点上传；内部素材拖入节点设置文件夹/标签。
 * 树容器捕获阶段（capture）与节点级事件共同工作。
 */
export function useFileDrop(options: {
  isFolder: Ref<boolean>
  nodeMap: ComputedRef<Map<string, HeTreeNode>>
}) {
  const libraryStore = useLibraryStore()
  const tagStore = useTagStore()
  const mediaStore = useMediaStore()
  const settingsStore = useSettingsStore()
  const toast = useToast()
  const { t } = useI18n()

  // 拖拽 drop 状态
  const dragOverNodeId = ref<string | null>(null)

  const resolveNodeNum = (node: HeTreeNode) => resolveNodeId(node, options.isFolder.value)

  function findDropNode(target: EventTarget | null): HeTreeNode | null {
    const element = target instanceof HTMLElement
      ? target.closest<HTMLElement>('[data-folder-tree-node-id]')
      : null
    const nodeId = element?.dataset.folderTreeNodeId
    return nodeId ? options.nodeMap.value.get(nodeId) || null : null
  }

  function acceptFileDropEvent(e: DragEvent, node: HeTreeNode) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
    dragOverNodeId.value = node.id
  }

  function handleTreeDragOver(e: DragEvent) {
    if (!hasAcceptableFileDrag(e)) return
    const node = findDropNode(e.target)
    if (!node) return
    acceptFileDropEvent(e, node)
  }

  function handleTreeDragLeave(e: DragEvent) {
    const current = e.currentTarget as HTMLElement | null
    const related = e.relatedTarget as Node | null
    if (current && related && current.contains(related)) return
    dragOverNodeId.value = null
  }

  async function handleTreeDrop(e: DragEvent) {
    if (!hasAcceptableFileDrag(e)) return
    const node = findDropNode(e.target)
    if (!node) return
    acceptFileDropEvent(e, node)
    await processNodeDrop(e, node)
  }

  function handleNodeDragOver(e: DragEvent, node: HeTreeNode) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    dragOverNodeId.value = node.id
  }

  function handleNodeDragLeave(e: DragEvent, _node: HeTreeNode) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      dragOverNodeId.value = null
    }
  }

  async function handleNodeDrop(e: DragEvent, node: HeTreeNode) {
    await processNodeDrop(e, node)
  }

  async function processNodeDrop(e: DragEvent, node: HeTreeNode) {
    dragOverNodeId.value = null
    if (!libraryStore.currentLibrary) return
    const libraryId = libraryStore.currentLibrary.id

    const internalFileIds = resolveInternalDraggedFileIds(e)
    // 内部拖拽：素材库文件 → 设置文件夹/标签
    if (internalFileIds.length > 0) {
      await handleInternalDrop(libraryId, internalFileIds, node)
      clearInternalDragState()
      return
    }

    // 外部文件拖拽 → 上传
    if (!e.dataTransfer?.files?.length) return
    const files = Array.from(e.dataTransfer.files)
    const nodeIdNum = resolveNodeNum(node)
    if (isNaN(nodeIdNum)) return

    if (settingsStore.settings.directImportMode) {
      const metadata: Record<string, any> = {}
      if (options.isFolder.value) metadata.folderId = String(nodeIdNum)
      else metadata.tags = [String(nodeIdNum)]
      for (const file of files) {
        mediaStore.uploadFile(file, libraryId, metadata)
      }
      toast.add({ severity: 'success', detail: t('business.folderTreeComponent.uploadingFiles', { count: files.length, name: node.label }), life: 2000 })
      return
    }

    // 非直接导入模式：通过 SDK 上传并带上文件夹/标签
    for (const file of files) {
      const opts: any = {}
      if (options.isFolder.value) opts.folderId = String(nodeIdNum)
      else opts.tags = [String(nodeIdNum)]
      try {
        await miraSDKService.uploadFile(file, libraryId, opts)
      } catch (err) {
        console.error('Upload failed:', err)
      }
    }
    toast.add({ severity: 'success', detail: t('business.folderTreeComponent.uploadedFiles', { count: files.length, name: node.label }), life: 2000 })
  }

  async function handleInternalDrop(libraryId: string, fileIds: string[], node: HeTreeNode) {
    const nodeIdNum = resolveNodeNum(node)
    if (isNaN(nodeIdNum)) return

    let success = 0
    for (const fid of fileIds) {
      try {
        if (options.isFolder.value) {
          await miraSDKService.moveFileToFolder(libraryId, parseInt(fid), nodeIdNum)
        } else {
          await miraSDKService.addTagsToFile(libraryId, parseInt(fid), [String(nodeIdNum)])
        }
        success++
      } catch (err) {
        console.error(`Failed to set ${options.isFolder.value ? 'folder' : 'tag'} for file ${fid}:`, err)
      }
    }
    if (success > 0) {
      if (!options.isFolder.value) {
        await tagStore.refreshTags(libraryId)
      }
      toast.add({ severity: 'success', detail: options.isFolder.value ? t('business.folderTreeComponent.movedToFolder', { count: success, name: node.label }) : t('business.folderTreeComponent.taggedFiles', { count: success, name: node.label }), life: 2000 })
    }
  }

  return {
    dragOverNodeId,
    handleTreeDragOver,
    handleTreeDragLeave,
    handleTreeDrop,
    handleNodeDragOver,
    handleNodeDragLeave,
    handleNodeDrop,
  }
}
