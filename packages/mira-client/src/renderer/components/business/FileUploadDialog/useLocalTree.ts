import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { FolderItem } from '@renderer/types/components'
import type { LocalFsNode, PendingFile } from './types'

/** 本地树特殊分类 id */
export const LOCAL_CATEGORY_ALL = 'all'
export const LOCAL_CATEGORY_UNGROUPED = 'ungrouped'

/**
 * 本地文件夹树 composable
 * 把导入的本地目录树（LocalFsNode[]）转成 FolderTreeComponent 可用的 FolderItem[]，
 * 并提供按选中目录筛选待上传文件的能力。
 *
 * 注意：本地树仅用于浏览/筛选，不参与上传 metadata（metadata 由右侧素材库文件夹/标签面板决定）。
 */
export function useLocalTree(pendingFiles: Ref<PendingFile[]>) {
  // 导入的根路径与原始树
  const rootPath = ref<string>('')
  const localTree = ref<LocalFsNode[]>([])

  // 当前选中的本地节点 id（目录 path），或 'all' / 'ungrouped'
  const selectedLocalDir = ref<string>(LOCAL_CATEGORY_ALL)

  /**
   * 递归统计某目录下的文件数量（含子目录）
   */
  function countFiles(node: LocalFsNode): number {
    if (!node.isDir) return 1
    return (node.children || []).reduce((sum, child) => sum + countFiles(child), 0)
  }

  /**
   * 递归收集某目录下所有文件的 path（含子目录）
   */
  function collectFilePaths(node: LocalFsNode, into: string[]): void {
    if (!node.isDir) {
      into.push(node.path)
      return
    }
    for (const child of node.children || []) collectFilePaths(child, into)
  }

  /**
   * LocalFsNode[] -> FolderItem[]，id 用本地 path 保证唯一
   * 只转换目录节点（文件不作为树节点展示），count 为该目录下（含子目录）文件数
   */
  function convertNodes(nodes: LocalFsNode[]): FolderItem[] {
    return nodes
      .filter((node) => node.isDir)
      .map((node) => ({
        id: node.path,
        label: node.name,
        icon: 'folder',
        count: countFiles(node),
        children: node.children ? convertNodes(node.children) : undefined,
        originalData: node
      }))
  }

  /**
   * FolderTreeComponent 顶部分类配置：【全部】+【未分组】
   * count 反映当前待上传文件数
   */
  const baseCategoriesConfig = computed(() => [
    {
      id: LOCAL_CATEGORY_ALL,
      label: '全部',
      icon: 'folder_open',
      count: pendingFiles.value.length
    },
    {
      id: LOCAL_CATEGORY_UNGROUPED,
      label: '未分组',
      icon: 'folder_special',
      count: pendingFiles.value.filter((f) => !f.localDirPath).length
    }
  ])

  /**
   * 供左栏 FolderTreeComponent 绑定的树数据
   */
  const localTreeData = computed<FolderItem[]>(() => convertNodes(localTree.value))

  /**
   * 设置新的导入树，并重置选中为【全部】
   */
  function setLocalTree(root: string, tree: LocalFsNode[]) {
    rootPath.value = root
    localTree.value = tree
    selectedLocalDir.value = LOCAL_CATEGORY_ALL
  }

  /**
   * 清空本地树
   */
  function clearLocalTree() {
    rootPath.value = ''
    localTree.value = []
    selectedLocalDir.value = LOCAL_CATEGORY_ALL
  }

  /**
   * 判断某个目录 path 是否直接包含某文件（仅一层，不含子目录）。
   * 用于按【目录】筛选：选某个目录时只展示直接归属该层级的文件。
   * 为简化体验：选中目录展示其直接子文件 + 该目录本身；更深层级不展开。
   */
  function isDirectChild(filePath: string, dirPath: string): boolean {
    const f = localTreeFlat.value.get(filePath)
    return f?.parentDir === dirPath
  }

  // 扁平化：path -> { parentDir }，便于按目录筛选
  const localTreeFlat = computed<Map<string, { parentDir: string | undefined }>>(() => {
    const map = new Map<string, { parentDir: string | undefined }>()
    const walk = (nodes: LocalFsNode[], parentDir: string | undefined) => {
      for (const node of nodes) {
        if (!node.isDir) {
          map.set(node.path, { parentDir: parentDir })
        } else {
          walk(node.children || [], node.path)
        }
      }
    }
    walk(localTree.value, undefined)
    return map
  })

  /**
   * 根据当前选中的本地节点筛选待上传文件：
   * - 'all' -> 全部
   * - 'ungrouped' -> localDirPath 为空（手动添加）
   * - 目录 path -> 直接归属该目录的文件
   */
  const filteredPendingFiles = computed<PendingFile[]>(() => {
    const sel = selectedLocalDir.value
    if (sel === LOCAL_CATEGORY_ALL) return pendingFiles.value
    if (sel === LOCAL_CATEGORY_UNGROUPED) {
      return pendingFiles.value.filter((f) => !f.localDirPath)
    }
    return pendingFiles.value.filter((f) => f.localPath && isDirectChild(f.localPath, sel))
  })

  /**
   * 处理左栏 FolderTreeComponent 的 select 事件
   */
  function handleLocalTreeSelect(node: any) {
    if (!node) return
    selectedLocalDir.value = String(node.id)
  }

  return {
    rootPath,
    localTree,
    selectedLocalDir,
    baseCategoriesConfig,
    localTreeData,
    filteredPendingFiles,
    setLocalTree,
    clearLocalTree,
    handleLocalTreeSelect,
    // 暴露给 useFileManagement 入列时使用
    collectFilePaths
  }
}
