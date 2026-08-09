import { ref, computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/renderer/composables/useToast'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import type { Folder, Tag, PendingFile } from './types'
import type { FolderItem } from '@renderer/types/components'

export function useFolderTagPanel() {
  const toast = useToast()
  const { t } = useI18n()

  const folders = ref<Folder[]>([])
  const tags = ref<Tag[]>([])
  const selectedTargetFolderId = ref<string>()
  const selectedTargetTagIds = ref<string[]>([])

  const folderTreeData = computed<FolderItem[]>(() => {
    const buildTree = (parentId: number | null | undefined): FolderItem[] => {
      return folders.value
        .filter((folder) => {
          if (parentId === null || parentId === undefined) {
            return !folder.parent_id || folder.parent_id === 0
          }
          return folder.parent_id === parentId
        })
        .map((folder) => ({
          id: String(folder.id),
          label: folder.title,
          icon: 'folder',
          iconColor: folder.color ? '#' + folder.color.toString(16).padStart(6, '0') : undefined,
          count: folder.fileCount,
          children: buildTree(folder.id),
          originalData: folder
        }))
    }
    return buildTree(null)
  })

  const tagTreeData = computed(() => {
    return tags.value.map((tag) => ({
      id: String(tag.id),
      label: tag.title,
      icon: 'label',
      color: tag.color,
      count: tag.fileCount
    }))
  })

  async function loadFoldersAndTags(libraryId: string) {
    if (!libraryId) return

    try {
      const foldersData = await miraSDKService.getAllFolders(libraryId)
      folders.value = foldersData || []

      const client = (miraSDKService as any).client
      if (client) {
        const tagsData = await client.tags().getAll(libraryId)
        tags.value = (tagsData || []).map((tag: any) => ({
          id: tag.id,
          title: tag.title || tag.name,
          color: tag.color,
          fileCount: tag.fileCount || tag.file_count || 0
        }))
      }
    } catch (error) {
      console.error('加载文件夹和标签失败:', error)
      toast.add({
        severity: 'error',
        summary: t('business.folderTagPanel.loadFailedTitle'),
        detail: t('business.folderTagPanel.loadFailedDetail'),
        life: 3000
      })
    }
  }

  function getFolderName(id: string | number | undefined): string {
    if (id === undefined || id === null) return t('business.folderTagPanel.unknownFolder')
    const sid = String(id)
    return folders.value.find((f) => String(f.id) === sid)?.title || t('business.folderTagPanel.unknownFolder')
  }

  function getTagName(id: string | number | undefined): string {
    if (id === undefined || id === null) return t('business.folderTagPanel.unknownTag')
    const sid = String(id)
    return tags.value.find((tg) => String(tg.id) === sid)?.title || t('business.folderTagPanel.unknownTag')
  }

  function handleFolderSelect(folder: FolderItem) {
    if (selectedTargetFolderId.value === folder.id) {
      selectedTargetFolderId.value = undefined
      return true
    }
    selectedTargetFolderId.value = folder.id as string
    return false
  }

  function handleTagSelect(tag: any) {
    const tagId = String(tag.id)
    const index = selectedTargetTagIds.value.indexOf(tagId)
    if (index === -1) {
      selectedTargetTagIds.value = [...selectedTargetTagIds.value, tagId]
      return null
    }
    selectedTargetTagIds.value = selectedTargetTagIds.value.filter((id) => id !== tagId)
    return tagId
  }

  function clearTargetSelection() {
    selectedTargetFolderId.value = undefined
    selectedTargetTagIds.value = []
  }

  function applyMetadataToFiles(pendingFiles: Ref<PendingFile[]>, selectedIds: string[]) {
    const targetIds =
      selectedIds.length > 0 ? selectedIds : pendingFiles.value.map((f) => f.id)
    if (targetIds.length === 0) return

    targetIds.forEach((id) => {
      const file = pendingFiles.value.find((f) => f.id === id)
      if (file) {
        if (selectedTargetFolderId.value) file.folderId = selectedTargetFolderId.value
        if (selectedTargetTagIds.value.length > 0) {
          const existingTags = file.tags || []
          file.tags = [...new Set([...existingTags, ...selectedTargetTagIds.value])]
        }
      }
    })

    toast.add({
      severity: 'success',
      summary: t('business.folderTagPanel.appliedTitle'),
      detail: selectedIds.length > 0
        ? t('business.folderTagPanel.appliedDetailSelected', { count: targetIds.length })
        : t('business.folderTagPanel.appliedDetailAll'),
      life: 2000
    })
  }

  return {
    folders,
    tags,
    selectedTargetFolderId,
    selectedTargetTagIds,
    folderTreeData,
    tagTreeData,
    loadFoldersAndTags,
    getFolderName,
    getTagName,
    handleFolderSelect,
    handleTagSelect,
    clearTargetSelection,
    applyMetadataToFiles
  }
}
