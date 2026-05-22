import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'
import { LibraryStorage } from '../utils/LibraryStorage'
import type { FileInfo } from '../../shared/types'

// 扩展的文件信息类型，支持临时状态和本地操作状态
interface ExtendedFileInfo extends FileInfo {
  type?: string  // Added for component compatibility
  isTemporary?: boolean
  isUploading?: boolean
  uploadProgress?: number
  localPath?: string
}

/**
 * 媒体文件状态管理
 * 处理文件的 CRUD 操作、上传下载、搜索过滤和状态持久化
 */
export const useMediaStore = defineStore('media', () => {
  // 状态 - 改为按 tabId 分组的对象结构
  const filesMap = ref<Record<string, ExtendedFileInfo[]>>({})
  const currentTabId = ref<string>('')
  const currentFile = ref<ExtendedFileInfo | null>(null)
  const selectedFiles = ref<Set<string>>(new Set())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref<Map<string, number>>(new Map())
  const lastUpdated = ref<Date | null>(null)
  const pendingOperations = ref<Set<string>>(new Set())

  // 详情面板全局状态
  const detailSidebarFiles = ref<FileInfo[]>([])
  const showDetailSidebar = ref(false)

  // 本地文件路径映射: {libraryId: {fileId: localPath}}
  const localFiles = ref<Record<string, Record<string, string>>>({})
  
  // 搜索和过滤状态
  const searchQuery = ref('')
  const filterType = ref<string>('')
  const sortBy = ref<'name' | 'size' | 'createdAt' | 'updatedAt'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')
  const currentLibraryId = ref<string>('')

  // 计算属性
  // 当前激活的文件列表
  const files = computed(() => {
    const tabId = currentTabId.value
    return tabId ? (filesMap.value[tabId] || []) : []
  })

  const totalFiles = computed(() => files.value.length)
  
  const selectedFileCount = computed(() => selectedFiles.value.size)
  
  const totalSize = computed(() => {
    return files.value.reduce((total, file) => total + file.size, 0)
  })

  const filesByType = computed(() => {
    const grouped: Record<string, ExtendedFileInfo[]> = {}
    files.value.forEach(file => {
      const type = file.type || 'unknown'
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(file)
    })
    return grouped
  })

  const filteredFiles = computed(() => {
    let result = [...files.value]
    
    // 搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(file => 
        file.name.toLowerCase().includes(query) ||
        (file.type && file.type.toLowerCase().includes(query)) ||
        file.mimeType?.toLowerCase().includes(query)
      )
    }
    
    // 类型过滤
    if (filterType.value) {
      result = result.filter(file => file.type === filterType.value)
    }
    
    // 排序
    result.sort((a, b) => {
      const aValue = a[sortBy.value]
      const bValue = b[sortBy.value]
      
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return sortOrder.value === 'asc' ? comparison : -comparison
    })
    
    return result
  })

  const getFileById = computed(() => {
    return (id: string) => files.value.find(file => file.id === id)
  })

  const isFileSelected = computed(() => {
    return (id: string) => selectedFiles.value.has(id)
  })

  const uploadingFiles = computed(() => {
    return files.value.filter(file => file.isUploading)
  })

  const isOperationPending = computed(() => {
    return (operationId: string) => pendingOperations.value.has(operationId)
  })

  /**
   * 设置当前活跃的 Tab
   * @param tabId - Tab ID
   */
  const setCurrentTab = (tabId: string) => {
    currentTabId.value = tabId
  }

  /**
   * 为指定 Tab 设置文件数据
   * @param tabId - Tab ID
   * @param files - 文件列表
   */
  const setFilesForTab = (tabId: string, files: ExtendedFileInfo[]) => {
    filesMap.value[tabId] = [...files]
  }

  /**
   * 获取指定 Tab 的文件数据
   * @param tabId - Tab ID
   * @returns 文件列表
   */
  const getFilesForTab = (tabId: string): ExtendedFileInfo[] => {
    return filesMap.value[tabId] || []
  }

  /**
   * 清除指定 Tab 的文件数据
   * @param tabId - Tab ID
   */
  const clearFilesForTab = (tabId: string) => {
    delete filesMap.value[tabId]
  }

  /**
   * 获取文件列表
   * 支持过滤器、分页和缓存
   * @param options - 选项对象
   * @returns Promise<{success: boolean, data?: FileInfo[], error?: string, total?: number}>
   */
  const fetchFiles = async (options: {
    libraryId: string
    tabId?: string // 新增：指定要更新的 tab ID
    filters?: {
      title?: string
      extension?: string
      tags?: string[] | null
      folder?: number
      size_min?: number
      size_max?: number
      created_after?: string
      created_before?: string
      recycled?: number
      sort?: string
      order?: 'asc' | 'desc'
      limit?: number
      offset?: number
      category?: string // 媒体类别：video, audio, image
    }
    append?: boolean // 是否追加到现有文件列表
  }) => {
    const { libraryId, tabId, filters, append = false } = options

    isLoading.value = true
    error.value = null

    try {
      if (!libraryId) {
        throw new Error('Library ID is required')
      }

      const result = await miraSDKService.listFiles(libraryId, filters)
      const rawFiles = result.files.map((file: FileInfo) => ({ ...file, isTemporary: false, libraryId }))
      const newFiles = enhanceFilesWithLocalPath(rawFiles)

      // 如果指定了 tabId，则更新指定 tab 的数据
      if (tabId) {
        if (append) {
          // 追加模式：合并到现有列表，去重
          const existingFiles = getFilesForTab(tabId)
          const existingIds = new Set(existingFiles.map(f => f.id))
          const uniqueNewFiles = newFiles.filter(f => !existingIds.has(f.id))
          setFilesForTab(tabId, [...existingFiles, ...uniqueNewFiles])
        } else {
          // 替换模式：完全替换指定 tab 的文件列表
          setFilesForTab(tabId, newFiles)
        }

        // 如果更新的是当前激活的 tab，则同时更新 currentTabId
        if (currentTabId.value === '' || currentTabId.value === tabId) {
          currentTabId.value = tabId
        }
      } else {
        // 兼容旧逻辑：如果没有指定 tabId，更新当前激活的文件列表
        if (append) {
          const existingIds = new Set(files.value.map(f => f.id))
          const uniqueNewFiles = newFiles.filter(f => !existingIds.has(f.id))
          const currentFiles = files.value
          if (currentTabId.value) {
            setFilesForTab(currentTabId.value, [...currentFiles, ...uniqueNewFiles])
          }
        } else {
          if (currentTabId.value) {
            setFilesForTab(currentTabId.value, newFiles)
          }
        }
      }

      currentLibraryId.value = libraryId
      lastUpdated.value = new Date()

      // 持久化到本地存储
      await persistMediaState()

      return {
        success: true,
        data: newFiles,
        total: result.total, // 使用API返回的真实总数
        limit: result.limit,
        offset: result.offset
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 为Tab获取文件列表（懒加载）
   * 根据Tab类型和过滤器动态加载
   * @param tabInfo - Tab信息
   * @param pagination - 分页信息
   * @returns Promise<{success: boolean, data?: FileInfo[], error?: string, total?: number}>
   */
  const fetchFilesForTab = async (
    tabInfo: {
      id: string
      type: string // 改为支持动态类型
      data?: any
      filters?: Record<string, any>
      sort?: 'imported_at' | 'id' | 'size' | 'stars' | 'folder_id' | 'tags' | 'name' | 'custom_fields'
      order?: 'asc' | 'desc'
      libraryId?: string
    },
    pagination: {
      limit?: number
      offset?: number
    } = {}
  ) => {
    const { limit = 50, offset = 0 } = pagination
    // 确保有 libraryId - 如果 tabInfo 中没有，从当前素材库获取
    let libraryId = tabInfo.libraryId
    if (!libraryId) {
      // 动态导入 libraryStore 以获取当前素材库
      const { useLibraryStore } = await import('./library')
      const libraryStore = useLibraryStore()

      if (libraryStore.currentLibrary?.id) {
        libraryId = libraryStore.currentLibrary.id
      } else {
        return { success: false, error: '无法获取素材库ID：请确保已选择素材库' }
      }
    }

    // 构建基于Tab类型的过滤器
    const filters: any = {
      limit,
      offset
    }

    // 转换筛选器格式：从MediaTabData格式转换为API格式
    if (tabInfo.filters) {
      // 首先处理简单键值对格式的筛选器（直接来自初始化）
      Object.entries(tabInfo.filters).forEach(([key, value]: [string, any]) => {
        if (key === 'folder') {
          filters.folder = value
          return
        }
        if (key === 'tags') {
          if (value !== null) {
            filters.tags = value
          }
          return
        }
        if (key === 'recycled') {
          filters.recycled = value
          return
        }
      })

      // 然后处理 FilterRule 对象格式的筛选器（来自 FilterBar）
      Object.entries(tabInfo.filters).forEach(([key, filterRule]: [string, any]) => {
        if (!filterRule || typeof filterRule !== 'object' || !filterRule.id) {
          return
        }

        switch (filterRule.id) {
          case 'folders':
            if (filterRule.selectedValues && filterRule.selectedValues.length > 0) {
              const folderId = filterRule.selectedValues[0]
              if (folderId !== null && folderId !== undefined && folderId !== '') {
                filters.folder = Number(folderId)
              }
            }
            break
          case 'tags':
            if (filterRule.selectedValues && filterRule.selectedValues.length > 0) {
              filters.tags = filterRule.selectedValues.map((id: any) => String(id))
            }
            break
          case 'urls':
            if (filterRule.value && typeof filterRule.value === 'string' && filterRule.value.trim()) {
              filters.title = filterRule.value.trim()
            }
            break
          case 'size':
            if (filterRule.selectedPreset === 'custom') {
              if (filterRule.customMin !== undefined) filters.size_min = filterRule.customMin
              if (filterRule.customMax !== undefined) filters.size_max = filterRule.customMax
            } else {
              if (filterRule.sizeMin !== undefined) filters.size_min = filterRule.sizeMin
              if (filterRule.sizeMax !== undefined) filters.size_max = filterRule.sizeMax
            }
            break
          case 'category':
            if (filterRule.selectedCategory && filterRule.selectedCategory !== '') {
              filters.category = filterRule.selectedCategory
            }
            break
          case 'extension':
            if (filterRule.selectedValues && filterRule.selectedValues.length > 0) {
              filters.extension = filterRule.selectedValues.join(',')
            }
            break
          case 'title':
            if (filterRule.value) {
              filters.title = filterRule.value
            }
            break
        }
      })
    }

    // 应用排序设置
    if (tabInfo.sort) {
      filters.sort = tabInfo.sort
    }
    if (tabInfo.order) {
      filters.order = tabInfo.order
    }

    // 根据Tab类型添加特定过滤器
    switch (tabInfo.type) {
      case 'folder':
        if (tabInfo.data?.id && tabInfo.data.id !== 'folder-all') {
          const parsed = parseInt(tabInfo.data.id)
          if (!isNaN(parsed)) {
            filters.folder = parsed
          }
        }
        break
      case 'tag':
        if (tabInfo.data?.id || tabInfo.data?.name) {
          filters.tags = [tabInfo.data.id || tabInfo.data.name]
        }
        break
      case 'all':
        break
      case 'files':
        break
      case 'uncategorized':
        filters.folder = null
        break
      case 'untagged':
        filters.tags = null
        break
      case 'trash':
        filters.recycled = 1
        break
      case 'home':
        return { success: true, data: [], total: 0 }
      default:
        if (tabInfo.data?.id) {
          const parsedId = parseInt(tabInfo.data.id)
          if (!isNaN(parsedId)) {
            filters.folder = parsedId
          }
        }
        if (tabInfo.data?.name) {
          filters.tags = [tabInfo.data.name]
        }
        console.warn(`Unknown tab type: ${tabInfo.type}`)
        break
    }

    // 非 trash 类型默认排除回收站文件
    if (tabInfo.type !== 'trash' && filters.recycled === undefined) {
      filters.recycled = 0
    }

    // 清理 undefined 和非有限数字，保留 null（null 有语义：如 folder=null 表示未分类）
    Object.keys(filters).forEach(key => {
      if (
        filters[key] === undefined ||
        (typeof filters[key] === 'number' && !Number.isFinite(filters[key]))
      ) {
        delete filters[key]
      }
    })

    return await fetchFiles({
      libraryId: libraryId,
      tabId: tabInfo.id, // 指定要更新的 tab ID
      filters,
      append: false // 在服务端分页模式下，每次都应该替换数据，不追加
    })
  }

  /**
   * 上传文件
   * 使用乐观更新和进度追踪
   * @param file - 要上传的文件
   * @param libraryId - 库ID
   * @param metadata - 文件元数据
   * @returns Promise<{success: boolean, data?: any, error?: string}>
   */
  const uploadFile = async (file: File, libraryId: string, metadata?: any) => {
    const fileId = `upload-${Date.now()}-${Math.random()}`
    const operationId = `upload-${fileId}`
    pendingOperations.value.add(operationId)
    
    // 创建临时文件条目用于乐观更新
    const tempFileInfo: ExtendedFileInfo = {
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
      isTemporary: true,
      isUploading: true,
      uploadProgress: 0
    }
    
    files.value.unshift(tempFileInfo)
    uploadProgress.value.set(fileId, 0)
    error.value = null
    
    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        const current = uploadProgress.value.get(fileId) || 0
        if (current < 90) {
          const newProgress = current + 10
          uploadProgress.value.set(fileId, newProgress)
          
          // 更新临时文件的进度
          const tempFile = files.value.find(f => f.id === fileId)
          if (tempFile) {
            tempFile.uploadProgress = newProgress
          }
        }
      }, 200)
      
      const result = await miraSDKService.uploadFile(file, libraryId, metadata)
      
      clearInterval(progressInterval)
      uploadProgress.value.set(fileId, 100)
      
      // 更新临时文件为最终文件信息
      const tempIndex = files.value.findIndex(f => f.id === fileId)
      if (tempIndex !== -1) {
        if (result.data) {
          const enhancedFile = enhanceFileWithLocalPath({
            ...result.data,
            isTemporary: false,
            isUploading: false,
            libraryId
          })
          files.value[tempIndex] = enhancedFile
        }
      }
      
      // 持久化状态
      await persistMediaState()
      
      // 清除上传进度
      setTimeout(() => {
        uploadProgress.value.delete(fileId)
      }, 1000)
      
      return { success: true, data: result }
    } catch (err) {
      // 回滚：移除临时文件
      const tempIndex = files.value.findIndex(f => f.id === fileId)
      if (tempIndex !== -1) {
        files.value.splice(tempIndex, 1)
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file'
      error.value = errorMessage
      uploadProgress.value.delete(fileId)
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
    }
  }

  /**
   * 批量上传文件
   * @param files - 要上传的文件列表
   * @param libraryId - 库ID
   * @param metadata - 文件元数据
   * @returns Promise<{success: boolean, results: any[], errors: string[]}>
   */
  const uploadMultipleFiles = async (fileList: File[], libraryId: string, metadata?: any) => {
    const results: any[] = []
    const errors: string[] = []
    
    for (const file of fileList) {
      try {
        const result = await uploadFile(file, libraryId, metadata)
        results.push(result)
        
        if (!result.success) {
          errors.push(`${file.name}: ${result.error}`)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed'
        errors.push(`${file.name}: ${errorMessage}`)
      }
    }
    
    return {
      success: errors.length === 0,
      results,
      errors
    }
  }

  /**
   * 删除文件
   * 使用乐观更新策略
   * @param libraryId - 库ID
   * @param fileId - 文件ID
   * @returns Promise<{success: boolean, error?: string}>
   */
  const deleteFile = async (libraryId: string, fileId: string) => {
    const operationId = `delete-${fileId}`
    pendingOperations.value.add(operationId)
    error.value = null
    
    const index = files.value.findIndex(file => file.id === fileId)
    if (index === -1) {
      pendingOperations.value.delete(operationId)
      return { success: false, error: 'File not found' }
    }
    
    // 保存原始文件用于回滚
    const deletedFile = files.value[index]
    
    // 乐观更新：从本地状态中移除文件
    files.value.splice(index, 1)
    
    // 从选中列表中移除
    selectedFiles.value.delete(fileId)
    
    // 如果是当前文件，清除当前文件
    if (currentFile.value?.id === fileId) {
      currentFile.value = null
    }
    
    try {
      await miraSDKService.deleteFile(libraryId, fileId)
      
      await persistMediaState()
      
      return { success: true }
    } catch (err) {
      // 回滚：恢复删除的文件
      files.value.splice(index, 0, deletedFile)
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
    }
  }

  /**
   * 批量删除文件
   * @param libraryId - 库ID
   * @param fileIds - 文件ID列表
   * @returns Promise<{success: boolean, results: any[], errors: string[]}>
   */
  const deleteMultipleFiles = async (libraryId: string, fileIds: string[]) => {
    const results: any[] = []
    const errors: string[] = []
    
    for (const fileId of fileIds) {
      try {
        const result = await deleteFile(libraryId, fileId)
        results.push(result)
        
        if (!result.success) {
          errors.push(`${fileId}: ${result.error}`)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Delete failed'
        errors.push(`${fileId}: ${errorMessage}`)
      }
    }
    
    return {
      success: errors.length === 0,
      results,
      errors
    }
  }

  /**
   * 下载文件
   * @param libraryId - 库ID
   * @param fileId - 文件ID
   * @param filename - 下载文件名（可选）
   * @returns Promise<{success: boolean, error?: string}>
   */
  const downloadFile = async (libraryId: string, fileId: string, filename?: string) => {
    error.value = null
    
    try {
      const blob = await miraSDKService.downloadFile(libraryId, fileId)
      
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `file-${fileId}`
      document.body.appendChild(a)
      a.click()
      
      // 清理
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 设置当前文件
   * @param file - 要设置的文件，可以为null
   */
  const setCurrentFile = (file: ExtendedFileInfo | null) => {
    currentFile.value = file
    persistMediaState()
  }

  /**
   * 选择文件
   * @param fileId - 文件ID
   */
  const selectFile = (fileId: string) => {
    selectedFiles.value.add(fileId)
  }

  /**
   * 取消选择文件
   * @param fileId - 文件ID
   */
  const deselectFile = (fileId: string) => {
    selectedFiles.value.delete(fileId)
  }

  /**
   * 切换文件选择状态
   * @param fileId - 文件ID
   */
  const toggleFileSelection = (fileId: string) => {
    if (selectedFiles.value.has(fileId)) {
      selectedFiles.value.delete(fileId)
    } else {
      selectedFiles.value.add(fileId)
    }
  }

  /**
   * 选择所有文件
   */
  const selectAllFiles = () => {
    filteredFiles.value.forEach(file => {
      selectedFiles.value.add(file.id)
    })
  }

  /**
   * 取消选择所有文件
   */
  const deselectAllFiles = () => {
    selectedFiles.value.clear()
  }

  /**
   * 设置搜索查询
   * @param query - 搜索查询字符串
   */
  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  /**
   * 设置文件类型过滤器
   * @param type - 文件类型
   */
  const setFilterType = (type: string) => {
    filterType.value = type
  }

  /**
   * 设置排序方式
   * @param by - 排序字段
   * @param order - 排序顺序
   */
  const setSorting = (by: typeof sortBy.value, order: typeof sortOrder.value) => {
    sortBy.value = by
    sortOrder.value = order
  }

  /**
   * 持久化媒体状态到本地存储
   * @returns Promise<void>
   */
  const persistMediaState = async () => {
    try {
      // 过滤掉临时文件后保存 filesMap
      const filteredFilesMap: Record<string, ExtendedFileInfo[]> = {}
      Object.keys(filesMap.value).forEach(tabId => {
        const tabFiles = filesMap.value[tabId] || []
        filteredFilesMap[tabId] = tabFiles.filter(f => !f.isTemporary)
      })

      const mediaData = {
        filesMap: filteredFilesMap, // 保存按 tabId 分组的文件数据
        currentTabId: currentTabId.value,
        currentFile: currentFile.value,
        selectedFiles: Array.from(selectedFiles.value),
        searchQuery: searchQuery.value,
        filterType: filterType.value,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        currentLibraryId: currentLibraryId.value,
        lastUpdated: lastUpdated.value?.toISOString()
      }

      await LibraryStorage.setItem('media', JSON.stringify(mediaData))
    } catch (err) {
      console.error('Failed to persist media state:', err)
    }
  }

  /**
   * 从本地存储恢复媒体状态
   * @returns Promise<void>
   */
  const restoreMediaState = async () => {
    try {
      const stored = await LibraryStorage.getItem('media')
      if (!stored) return

      const mediaData = JSON.parse(stored)

      // 优先恢复新格式（按 tabId 分组）
      if (mediaData.filesMap) {
        // 恢复新格式的数据
        Object.keys(mediaData.filesMap).forEach(tabId => {
          const tabFiles = mediaData.filesMap[tabId] || []
          filesMap.value[tabId] = tabFiles.map((file: any) => ({ ...file, isTemporary: false }))
        })
        currentTabId.value = mediaData.currentTabId || ''
      } else if (mediaData.files) {
        // 兼容旧格式：将旧的 files 数组迁移到新格式
        const legacyFiles = mediaData.files.map((file: any) => ({ ...file, isTemporary: false }))
        if (legacyFiles.length > 0) {
          // 为旧数据创建一个默认的 tab
          const defaultTabId = 'legacy_default'
          filesMap.value[defaultTabId] = legacyFiles
          currentTabId.value = defaultTabId
          console.warn('Legacy media data format migrated:', { count: legacyFiles.length, defaultTabId })
        }
      }

      currentFile.value = mediaData.currentFile
      selectedFiles.value = new Set(mediaData.selectedFiles || [])
      searchQuery.value = mediaData.searchQuery || ''
      filterType.value = mediaData.filterType || ''
      sortBy.value = mediaData.sortBy || 'name'
      sortOrder.value = mediaData.sortOrder || 'asc'
      currentLibraryId.value = mediaData.currentLibraryId || ''
      lastUpdated.value = mediaData.lastUpdated ? new Date(mediaData.lastUpdated) : null
    } catch (err) {
      console.error('Failed to restore media state:', err)
    }
  }

  /**
   * 带重试机制的获取文件
   * @param libraryId - 库ID
   * @param maxRetries - 最大重试次数，默认为3
   * @returns Promise<{success: boolean, data?: FileInfo[], error?: string}>
   */
  const fetchFilesWithRetry = async (libraryId: string, maxRetries = 3) => {
    let lastError = ''

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await fetchFiles({ libraryId})
      
      if (result.success) {
        return result
      }
      
      lastError = result.error || 'Unknown error'
      
      if (attempt < maxRetries) {
        // 等待一定时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    return { success: false, error: `Fetch failed after ${maxRetries} attempts: ${lastError}` }
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 刷新文件列表
   * @param libraryId - 库ID
   * @returns Promise<{success: boolean, data?: FileInfo[], error?: string}>
   */
  const refreshFiles = async (libraryId: string, tabId?: string) => {
    return await fetchFiles({
      libraryId,
      tabId: tabId || currentTabId.value, // 使用指定的 tabId 或当前激活的 tabId
    })
  }

  /**
   * 设置文件的本地路径
   * @param libraryId - 库ID
   * @param fileId - 文件ID
   * @param localPath - 本地路径
   */
  const setLocalFile = (libraryId: string, fileId: string, localPath: string) => {
    if (!localFiles.value[libraryId]) {
      localFiles.value[libraryId] = {}
    }
    localFiles.value[libraryId][fileId] = localPath
  }

  /**
   * 获取文件的本地路径
   * @param libraryId - 库ID
   * @param fileId - 文件ID
   * @returns 本地路径或undefined
   */
  const getLocalFile = (libraryId: string, fileId: string): string | undefined => {
    return localFiles.value[libraryId]?.[fileId]
  }

  /**
   * 批量设置本地文件路径
   * @param libraryId - 库ID
   * @param filePathMap - 文件ID到本地路径的映射
   */
  const setLocalFiles = (libraryId: string, filePathMap: Record<string, string>) => {
    if (!localFiles.value[libraryId]) {
      localFiles.value[libraryId] = {}
    }
    Object.assign(localFiles.value[libraryId], filePathMap)
  }

  /**
   * 清除指定库的本地文件路径映射
   * @param libraryId - 库ID
   */
  const clearLocalFiles = (libraryId: string) => {
    if (localFiles.value[libraryId]) {
      delete localFiles.value[libraryId]
    }
  }

  /**
   * 增强文件对象，自动添加localFile字段
   * @param file - 原始文件信息
   * @returns 增强后的文件信息
   */
  const enhanceFileWithLocalPath = (file: FileInfo): FileInfo => {
    // 如果已经有localFile字段，直接返回
    if (file.localFile) {
      return file
    }

    // 尝试从映射中获取本地路径
    if (file.libraryId && file.id) {
      const localPath = getLocalFile(file.libraryId, file.id)
      if (localPath) {
        return {
          ...file,
          localFile: localPath
        }
      }
    }

    return file
  }

  /**
   * 批量增强文件数组，自动添加localFile字段
   * @param files - 原始文件信息数组
   * @returns 增强后的文件信息数组
   */
  const enhanceFilesWithLocalPath = (files: FileInfo[]): FileInfo[] => {
    return files.map(file => enhanceFileWithLocalPath(file))
  }

  /**
   * 获取扩展的文件信息（包含localFile字段）
   * @param file - 原始文件信息
   * @param libraryId - 库ID
   * @returns 扩展的文件信息
   */
  const getExtendedFileInfo = (file: FileInfo, libraryId: string): ExtendedFileInfo => {
    const localPath = getLocalFile(libraryId, file.id)
    return {
      ...file,
      localFile: localPath
    } as ExtendedFileInfo
  }

  // 详情面板操作
  const setDetailSidebarFiles = (files: FileInfo[]) => {
    detailSidebarFiles.value = files
  }

  const clearDetailSidebar = () => {
    detailSidebarFiles.value = []
  }

  const toggleDetailSidebar = () => {
    showDetailSidebar.value = !showDetailSidebar.value
  }

  return {
    // 状态
    files,
    filesMap, // 新增：暴露 filesMap 用于调试或高级操作
    currentTabId, // 新增：当前激活的 tab ID
    currentFile,
    selectedFiles,
    isLoading,
    error,
    uploadProgress,
    lastUpdated,
    pendingOperations,
    searchQuery,
    filterType,
    sortBy,
    sortOrder,
    currentLibraryId,

    // 计算属性
    totalFiles,
    selectedFileCount,
    totalSize,
    filesByType,
    filteredFiles,
    getFileById,
    isFileSelected,
    uploadingFiles,
    isOperationPending,

    // 操作
    fetchFiles,
    fetchFilesForTab,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    deleteMultipleFiles,
    downloadFile,
    setCurrentFile,
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    deselectAllFiles,
    setSearchQuery,
    setFilterType,
    setSorting,
    persistMediaState,
    restoreMediaState,
    fetchFilesWithRetry,
    clearError,
    refreshFiles,

    // 新增：Tab 相关操作
    setCurrentTab,
    setFilesForTab,
    getFilesForTab,
    clearFilesForTab,

    // 本地文件路径管理
    setLocalFile,
    getLocalFile,
    setLocalFiles,
    clearLocalFiles,
    enhanceFileWithLocalPath,
    enhanceFilesWithLocalPath,
    getExtendedFileInfo,

    // 详情面板
    detailSidebarFiles,
    showDetailSidebar,
    setDetailSidebarFiles,
    clearDetailSidebar,
    toggleDetailSidebar
  }
})
