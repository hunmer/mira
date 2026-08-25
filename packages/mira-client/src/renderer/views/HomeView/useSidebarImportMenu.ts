/**
 * useSidebarImportMenu —— 侧边栏文件夹/标签树右键「导入」菜单。
 *
 *   - importTarget / importHandler：上传与导入文件夹的导入目标（由文件夹/标签节点换算）
 *   - importMenuItems：作为 FolderTreeComponent 的 extraContextMenuItems 附加右键项
 *   - folderTreePath / libraryLocalPath：「在资源管理器中定位文件夹」的物理路径换算
 *     （Docker 环境经 SMB 配置换算，与 SidebarLibrarySelector.getLibraryLocalPath 同规则）
 * 由原 SidebarModuleList 拆出，逻辑零改动。
 */
import { ref } from 'vue'
import { useLibraryStore } from '@/renderer/stores/library'
import { useSettingsStore } from '@/renderer/stores/settings'
import { useServerListStore } from '@/renderer/stores/serverList'
import { useImportHandler, type ImportFolderPayload, type ImportTarget } from '@/renderer/composables/useImportHandler'
import type { MenuItem } from '@/renderer/types/menu'

export function useSidebarImportMenu(options: {
  t: (key: string) => string
  /** 取当前文件夹树（用于回溯目标文件夹嵌套路径） */
  getFolderTree: () => any[]
  onUpload: (target?: ImportTarget) => void
  onImportFolder: (payload: ImportFolderPayload) => void
}) {
  const libraryStore = useLibraryStore()
  const settingsStore = useSettingsStore()
  const serverListStore = useServerListStore()

  const importTarget = ref<ImportTarget>()
  const importHandler = useImportHandler({
    t: options.t,
    target: importTarget,
    onUpload: () => options.onUpload(importTarget.value),
    onImportFolder: (payload) => options.onImportFolder(payload),
  })

  function targetForNode(type: 'folder' | 'tag', item: any): ImportTarget {
    if (!item) return {}
    if (type === 'tag') {
      const id = String(item.id).replace(/^tag-/, '')
      return { tagIds: [id] }
    }
    return { folderId: String(item.id).replace(/^folder-/, '') }
  }

  function importMenuItems(type: 'folder' | 'tag', item: any | null): MenuItem[] {
    const target = targetForNode(type, item)
    return [
      {
        label: options.t('views.sidebarToolbar.import'), items: [
          { label: options.t('views.sidebarToolbar.import'), icon: 'upload_file', command: () => { importTarget.value = target; importHandler.handleUpload() } },
          { label: options.t('views.sidebarToolbar.importFolder'), icon: 'folder_open', command: () => { importTarget.value = target; void importHandler.handleImportFolder() } },
          { label: options.t('business.homeHeader.importFromUrl'), icon: 'cloud_download', command: () => { importTarget.value = target; importHandler.handleUrlImport() } },
        ],
      },
      // 定位到文件夹（仅文件夹树）：在系统资源管理器中显示该文件夹的物理目录
      ...(type === 'folder' && item && libraryLocalPath() ? [{
        label: options.t('views.sidebarModuleList.locateFolder'),
        command: () => {
          const root = libraryLocalPath()
          const rel = folderTreePath(String(item.id))
          if (!root || !rel) return
          const sep = root.includes('\\') ? '\\' : '/'
          ;(window as any).electronAPI?.fs?.showItemInFolder(root.replace(/[\\/]+$/, '') + sep + rel.replace(/\//g, sep))
        },
      }] : []),
    ]
  }

  /**
   * 从侧边栏文件夹树回溯目标文件夹的嵌套相对路径（与服务端 getFolderPath 同规则：
   * 沿 parent 链拼各级 title），找不到返回 null。
   */
  function folderTreePath(targetId: string): string | null {
    const walk = (nodes: any[], trail: string[]): string | null => {
      for (const node of nodes || []) {
        const title = node.originalData?.title ?? node.label
        if (String(node.id) === String(targetId)) return [...trail, title].join('/')
        const found = walk(node.children, [...trail, title])
        if (found) return found
      }
      return null
    }
    return walk(options.getFolderTree(), [])
  }

  /**
   * 当前素材库根目录映射为本机可访问路径（与 SidebarLibrarySelector.getLibraryLocalPath 同规则：
   * Docker 环境经 SMB 配置换算），无法映射（如 Docker 未配 SMB）时返回 null。
   */
  function libraryLocalPath(): string | null {
    const collection = libraryStore.currentLibrary
    if (!collection?.path) return null
    const isDocker = settingsStore.systemHealth?.isDocker ?? false
    const smb = serverListStore.activeServer?.smb
    if (!isDocker) return collection.path
    if (!smb?.enabled || !smb.smbPath) return null
    const smbPath = smb.smbPath
    const sep = smbPath.includes('/') ? '/' : '\\'
    const normalizedSmbPath = smbPath.endsWith(sep) ? smbPath : smbPath + sep
    if (smb.mountPath) {
      const mountPrefix = smb.mountPath.endsWith('/') ? smb.mountPath + '/' : smb.mountPath
      return collection.path.replace(mountPrefix, normalizedSmbPath).replace(/\//g, sep)
    }
    return normalizedSmbPath + collection.path.replace(/^\//, '').replace(/\//g, sep)
  }

  return { importTarget, importHandler, importMenuItems }
}
