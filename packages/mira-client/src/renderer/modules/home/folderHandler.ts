import { ref, computed } from 'vue'
import { useFolderStore } from '@renderer/stores/folder'
import { useMediaStore } from '@renderer/stores/media'

/**
 * 首页文件夹处理模块
 * 
 * 📁 **功能说明**：
 * - 管理文件夹的选择和显示状态
 * - 处理文件夹相关的文件过滤
 * - 提供文件夹操作的统一接口
 * 
 * 🔄 **使用方式**：
 * ```typescript
 * const folderHandler = useHomeFolderHandler()
 * 
 * // 打开特定文件夹
 * await folderHandler.openFolder('folder-id', { libraryId: 'lib-id' })
 * 
 * // 监听路由事件
 * folderHandler.listenToRouteEvents()
 * ```
 */
export function useHomeFolderHandler() {
  const folderStore = useFolderStore()
  const mediaStore = useMediaStore()
  
  // 当前选中的文件夹状态
  const currentFolder = ref<{
    id: string | null
    title: string | null
    libraryId: string | null
    path?: string
    fileCount?: number
    description?: string
  }>({
    id: null,
    title: null,
    libraryId: null
  })

  // 文件夹处理状态
  const isProcessing = ref(false)
  const error = ref('')

  /**
   * 打开指定文件夹
   */
  const openFolder = async (folderId: string, options?: {
    libraryId?: string
    title?: string
    label?: string
    path?: string
  }) => {
    try {
      isProcessing.value = true
      error.value = ''
      
      // 更新当前文件夹状态
      // 优先级：title > label > null
      // （快捷分类 全部/未分类/回收站 等只提供 label，缺失时不能回落到 id）
      currentFolder.value = {
        id: folderId,
        title: options?.title || options?.label || null,
        libraryId: options?.libraryId || null,
        path: options?.path
      }
      
      // 如果有libraryId，确保文件夹数据已加载
      if (options?.libraryId) {
        await folderStore.fetchFolders(options.libraryId)
        
        // 从store中获取完整的文件夹信息（folder.id 为 number，folderId 为 string，需宽松比较）
        const folderInfo = folderStore.folders.find((folder: any) => String(folder.id) === String(folderId))
        if (folderInfo) {
          currentFolder.value = {
            ...currentFolder.value,
            title: folderInfo.title || (folderInfo as any).name,
            path: folderInfo.path,
            fileCount: folderInfo.fileCount,
            description: folderInfo.description
          }
        }
      }
      
      // 通知其他组件文件夹已选中
      window.dispatchEvent(new CustomEvent('home-folder-selected', {
        detail: currentFolder.value
      }))
      
      return true
    } catch (err) {
      console.error('❌ 打开文件夹失败:', err)
      error.value = err instanceof Error ? err.message : '打开文件夹失败'
      return false
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * 清除当前文件夹选择
   */
  const clearFolderSelection = () => {
    currentFolder.value = {
      id: null,
      title: null,
      libraryId: null
    }
    
    // 通知其他组件文件夹已清除
    window.dispatchEvent(new CustomEvent('home-folder-cleared'))
    
  }

  /**
   * 获取当前文件夹相关的文件（使用 fetchFilesForTab 方法）
   */
  const getFolderFiles = async (options?: {
    libraryId?: string
    pagination?: { limit?: number; offset?: number }
  }) => {
    if (!currentFolder.value.id) {
      return { files: [], total: 0 }
    }

    // 构建文件夹筛选的 Tab 对象
    const folderTab = {
      id: `folder-${currentFolder.value.id}`,
      label: currentFolder.value.title || '文件夹',
      type: 'folder' as const,
      filterId: currentFolder.value.id,
      filterValue: currentFolder.value.id,
      icon: 'folder',
      color: 'text-blue-500',
      filters: {
        folders: {
          id: 'folders',
          selectedValues: [currentFolder.value.id],
          label: '文件夹筛选'
        }
      }
    }

    try {
      // 使用 fetchFilesForTab 方法获取文件数据
      const result = await mediaStore.fetchFilesForTab(
        {
          ...folderTab,
          libraryId: options?.libraryId || currentFolder.value.libraryId || ''
        },
        options?.pagination || {}
      )

      if (result.success) {
        return {
          files: result.data || [],
          total: result.total || 0
        }
      } else {
        console.error('❌ 获取文件夹文件失败:', (result as any).error)
        return { files: [], total: 0 }
      }
    } catch (error) {
      console.error('❌ 获取文件夹文件异常:', error)
      return { files: [], total: 0 }
    }
  }

  /**
   * 获取当前文件夹相关的文件（同步版本，用于向后兼容）
   * @deprecated 建议使用异步版本的 getFolderFiles
   */
  const getFolderFilesSync = () => {
    if (!currentFolder.value.id) {
      return []
    }

    // 过滤属于当前文件夹的文件（从现有的 mediaStore 中）
    return mediaStore.files.filter((file: any) => {
      return file.folderId === currentFolder.value.id ||
             file.libraryId === currentFolder.value.id ||
             file.folder?.id === currentFolder.value.id
    })
  }

  /**
   * 监听来自路由的文件夹事件
   */
  const listenToRouteEvents = () => {
    const handleRouteFolder = (event: CustomEvent) => {
      const { folderId, libraryId, title } = event.detail
      openFolder(folderId, { libraryId, title })
    }
    
    window.addEventListener('home-route-folder', handleRouteFolder as EventListener)
    
    // 返回清理函数
    return () => {
      window.removeEventListener('home-route-folder', handleRouteFolder as EventListener)
    }
  }

  /**
   * 获取所有可用文件夹
   */
  const availableFolders = computed(() => {
    return folderStore.folders.map((folder: any) => ({
      id: folder.id,
      title: folder.title || (folder as any).name,
      path: folder.path,
      fileCount: folder.fileCount || 0,
      description: folder.description,
      active: folder.id === currentFolder.value.id,
      children: folder.children?.map((child: any) => ({
        id: child.id,
        title: child.title || (child as any).name,
        path: child.path,
        fileCount: child.fileCount || 0,
        active: child.id === currentFolder.value.id
      })) || []
    }))
  })

  /**
   * 检查是否有选中的文件夹
   */
  const hasSelectedFolder = computed(() => !!currentFolder.value.id)

  /**
   * 获取当前文件夹的文件数量（同步版本）
   */
  const currentFolderFileCount = computed(() => {
    return getFolderFilesSync().length
  })

  /**
   * 异步获取当前文件夹的文件数量
   */
  const getCurrentFolderFileCount = async (libraryId?: string) => {
    const result = await getFolderFiles({ libraryId })
    return result.total
  }

  /**
   * 获取文件夹面包屑导航
   */
  const folderBreadcrumbs = computed(() => {
    if (!currentFolder.value.path) {
      return []
    }
    
    const pathParts = currentFolder.value.path.split('/').filter(Boolean)
    return pathParts.map((part, index) => ({
      label: part,
      path: '/' + pathParts.slice(0, index + 1).join('/'),
      active: index === pathParts.length - 1
    }))
  })

  return {
    // 状态
    currentFolder: computed(() => currentFolder.value),
    isProcessing: computed(() => isProcessing.value),
    error: computed(() => error.value),
    hasSelectedFolder,
    currentFolderFileCount,
    availableFolders,
    folderBreadcrumbs,
    
    // 方法
    openFolder,
    clearFolderSelection,
    getFolderFiles,
    getFolderFilesSync,
    getCurrentFolderFileCount,
    listenToRouteEvents
  }
}

/**
 * 全局文件夹处理器类型
 */
export type HomeFolderHandler = ReturnType<typeof useHomeFolderHandler>
