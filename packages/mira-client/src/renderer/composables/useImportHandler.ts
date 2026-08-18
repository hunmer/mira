import type { Ref } from 'vue'
import type { LocalFsNode } from '../../shared/types'
import { useUrlImportStore } from '@renderer/stores/urlImport'
import { useToast } from '@renderer/composables/useToast'

export interface ImportTarget {
  folderId?: string | number | null
  tagIds?: Array<string | number>
}

export interface ImportFolderPayload extends ImportTarget {
  rootPath: string
  tree: LocalFsNode[]
}

/** 统一处理文件、目录和 URL 导入入口，调用方只负责打开自己的上传对话框。 */
export function useImportHandler(options: {
  t: (key: string) => string
  target?: Ref<ImportTarget | undefined> | (() => ImportTarget | undefined)
  onUpload?: () => void
  onImportFolder?: (payload: ImportFolderPayload) => void
}) {
  const toast = useToast()
  const urlImportStore = useUrlImportStore()
  const getTarget = () => typeof options.target === 'function' ? options.target() : options.target?.value

  function handleUpload() {
    options.onUpload?.()
  }

  async function handleImportFolder() {
    try {
      const dirRes = await window.electronAPI.fs.selectDirectory(options.t('views.sidebarToolbar.selectImportFolder'))
      if (!dirRes.success || !dirRes.path) return
      const treeRes = await window.electronAPI.fs.readDirTree(dirRes.path)
      if (!treeRes.success || !treeRes.data) {
        toast.add({ severity: 'error', summary: options.t('views.sidebarToolbar.importFailed'), detail: treeRes.message || options.t('views.sidebarToolbar.readTreeFailed'), life: 3000 })
        return
      }
      const target = getTarget() || {}
      options.onImportFolder?.({ rootPath: dirRes.path, tree: treeRes.data, ...target })
    } catch (error) {
      toast.add({ severity: 'error', summary: options.t('views.sidebarToolbar.importFailed'), detail: error instanceof Error ? error.message : options.t('views.common.unknownError'), life: 3000 })
    }
  }

  function handleUrlImport(urls?: string[]) {
    const target = getTarget() || {}
    const folderId = target.folderId == null || !Number.isFinite(Number(target.folderId)) ? null : Number(target.folderId)
    urlImportStore.open({ urls, folderId, tagIds: target.tagIds })
  }

  return { handleUpload, handleImportFolder, handleUrlImport }
}
