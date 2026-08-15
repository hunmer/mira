import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'

// 文件夹接口
export interface Folder {
  id: number
  title: string
  parent_id?: number
  path?: string
  color?: number
  icon?: string
  description?: string
  createdAt?: string
  updatedAt?: string
  children?: Folder[]
  fileCount?: number
  /** 文件夹下非回收站的文件数（后端 getAllFolders 返回的真实字段） */
  file_count?: number
}

// 扩展的文件夹信息类型，支持临时状态
interface ExtendedFolder extends Folder {
  isTemporary?: boolean
  isExpanded?: boolean
}

/**
 * 文件夹状态管理
 * 处理文件夹的层级结构、CRUD 操作和状态持久化
 */
export const useFolderStore = defineStore('folder', () => {
  // 状态
  const folders = ref<ExtendedFolder[]>([])
  const currentFolder = ref<ExtendedFolder | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  const pendingOperations = ref<Set<string>>(new Set())
  // 新增：按 libraryId 的缓存
  const folderCache = ref<Record<string, ExtendedFolder[]>>({})

  // 计算属性
  const totalFolders = computed(() => folders.value.length)
  
  const rootFolders = computed(() => {
    return folders.value.filter(folder => !folder.parent_id || folder.parent_id === 0)
  })

  const folderTree = computed(() => {
    const buildTree = (parentId?: number): ExtendedFolder[] => {
      return folders.value
        .filter(folder => folder.parent_id === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id)
        }))
    }
    return buildTree()
  })

  const getFolderById = computed(() => {
    return (id: number) => folders.value.find(folder => folder.id === id)
  })

  const isOperationPending = computed(() => {
    return (operationId: string) => pendingOperations.value.has(operationId)
  })

  /**
   * 获取所有文件夹
   * @param libraryId - 素材库ID
   * @param forceRefresh - 是否强制刷新，忽略缓存
   * @returns Promise<{success: boolean, data?: Folder[], error?: string}>
   */
  const fetchFolders = async (libraryId: string, forceRefresh = false) => {
    // 检查缓存
    if (!forceRefresh && folderCache.value[libraryId]) {
      folders.value = folderCache.value[libraryId]
      return { success: true, data: folders.value }
    }

    isLoading.value = true
    error.value = null

    try {
      // 使用 SDK 获取文件夹列表
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.folders().getAll(libraryId)

      const foldersData = result.map((folder: any) => ({
        ...folder,
        isTemporary: false,
        isExpanded: false
      }))

      // 更新缓存和当前状态
      folderCache.value[libraryId] = foldersData
      folders.value = foldersData

      lastUpdated.value = new Date()

      return { success: true, data: folders.value }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch folders'
      error.value = errorMessage
      console.error('❌ Failed to load folders:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取根文件夹
   * @param libraryId - 素材库ID
   * @returns Promise<{success: boolean, data?: Folder[], error?: string}>
   */
  const fetchRootFolders = async (libraryId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.folders().getRootFolders(libraryId)
      
      const rootFolderData = result.map((folder: any) => ({
        ...folder,
        isTemporary: false,
        isExpanded: false
      }))
      
      // 更新 folders 数组中的根文件夹
      folders.value = folders.value.filter(f => f.parent_id && f.parent_id !== 0)
      folders.value.push(...rootFolderData)
      
      return { success: true, data: rootFolderData }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch root folders'
      error.value = errorMessage
      console.error('❌ Failed to load root folders:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建文件夹
   * @param libraryId - 素材库ID
   * @param title - 文件夹名称
   * @param parentId - 父文件夹ID（可选）
   * @param color - 文件夹颜色（可选）
   * @param description - 文件夹描述（可选）
   * @returns Promise<{success: boolean, data?: Folder, error?: string}>
   */
  const createFolder = async (
    libraryId: string,
    title: string,
    parentId?: number,
    color?: number,
    description?: string
  ) => {
    const operationId = `create-folder-${Date.now()}`
    pendingOperations.value.add(operationId)
    error.value = null
    
    try {
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.folders().createFolder(
        libraryId,
        title,
        parentId,
        color,
        description
      )
      
      const newFolder: ExtendedFolder = {
        ...result,
        isTemporary: false,
        isExpanded: false
      }

      // 更新缓存和当前状态
      if (folderCache.value[libraryId]) {
        folderCache.value[libraryId].push(newFolder)
      }
      folders.value.push(newFolder)
      lastUpdated.value = new Date()

      return { success: true, data: newFolder }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder'
      error.value = errorMessage
      console.error('❌ Failed to create folder:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
    }
  }

  /**
   * 设置当前文件夹
   * @param folder - 要设置的文件夹，可以为null
   */
  const setCurrentFolder = (folder: ExtendedFolder | null) => {
    currentFolder.value = folder
  }

  /**
   * 切换文件夹展开状态
   * @param folderId - 文件夹ID
   */
  const toggleFolderExpanded = (folderId: number) => {
    const folder = folders.value.find(f => f.id === folderId)
    if (folder) {
      folder.isExpanded = !folder.isExpanded
    }
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 强制刷新文件夹数据
   * @param libraryId - 素材库ID
   */
  const refreshFolders = async (libraryId: string) => {
    return await fetchFolders(libraryId, true)
  }

  /**
   * 根据 libraryId 获取缓存的文件夹
   * @param libraryId - 素材库ID
   * @returns ExtendedFolder[]
   */
  const getCachedFolders = (libraryId: string): ExtendedFolder[] => {
    return folderCache.value[libraryId] || []
  }

  /**
   * 清理文件夹状态
   */
  const cleanup = () => {
    folders.value = []
    currentFolder.value = null
    error.value = null
    lastUpdated.value = null
    pendingOperations.value.clear()
    folderCache.value = {}
  }

  return {
    // 状态
    folders,
    currentFolder,
    isLoading,
    error,
    lastUpdated,
    pendingOperations,
    folderCache,

    // 计算属性
    totalFolders,
    rootFolders,
    folderTree,
    getFolderById,
    isOperationPending,

    // 操作
    fetchFolders,
    fetchRootFolders,
    createFolder,
    setCurrentFolder,
    toggleFolderExpanded,
    clearError,
    refreshFolders,
    getCachedFolders,
    cleanup
  }
})
