import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import { useLibraryStore } from '@renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import type { LocalFsNode } from '../../shared/types'
import type { ImportTarget } from './useImportHandler'

/** 深度收集本地树中的所有文件节点 */
function collectFileNodes(nodes: LocalFsNode[], out: LocalFsNode[] = []): LocalFsNode[] {
  for (const node of nodes) {
    if (node.isDir) collectFileNodes(node.children || [], out)
    else out.push(node)
  }
  return out
}

/**
 * 「导入后二次确定」关闭时的直传链路：跳过上传对话框，
 * 读取本地文件字节后直接上传到当前素材库（不保留目录结构，与拖拽直接导入一致）。
 */
export function useDirectImport() {
  const { t } = useI18n()
  const libraryStore = useLibraryStore()
  const mediaStore = useMediaStore()

  async function importLocalTreeDirectly(
    tree: LocalFsNode[],
    target?: ImportTarget
  ): Promise<void> {
    const libraryId = libraryStore.currentLibrary?.id
    if (!libraryId) {
      toast.error(t('tabs.mediaTabListView.noLibraryDetail'))
      return
    }
    const fileNodes = collectFileNodes(tree || [])
    if (fileNodes.length === 0) return

    const metadata: Record<string, any> = {}
    if (target?.folderId != null) metadata.folderId = String(target.folderId)
    if (target?.tagIds?.length) metadata.tags = target.tagIds.map(String)

    const id = toast.loading(t('views.localFolder.importing', { count: fileNodes.length }))
    let imported = 0
    for (const node of fileNodes) {
      try {
        const result = await window.electronAPI?.fs.readFileBytes(node.path)
        if (!result?.success || !result.data) throw new Error(result?.message || node.name)
        const file = new File([new Uint8Array(result.data)], node.name)
        const uploaded = await mediaStore.uploadFile(file, libraryId, Object.keys(metadata).length > 0 ? metadata : undefined)
        if (uploaded.success) imported++
      } catch (error) {
        console.error('[directImport] 上传失败:', node.path, error)
      }
    }
    if (imported > 0) toast.success(t('views.localFolder.importComplete', { count: imported }), { id })
    else toast.error(t('views.localFolder.importFailed'), { id })
  }

  return { importLocalTreeDirectly }
}
