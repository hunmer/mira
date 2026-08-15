import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'
import { LibraryStorage } from '../utils/LibraryStorage'
import type { LibraryInfo } from '../../shared/types'

// 扩展的集合信息类型，支持临时状态
interface ExtendedLibraryInfo extends LibraryInfo {
  isTemporary?: boolean
}

/**
 * 素材库状态管理
 * 处理素材库的 CRUD 操作、状态持久化和乐观更新
 */
export const useLibraryStore = defineStore('libraries', () => {
  // 状态
  const libraries = ref<ExtendedLibraryInfo[]>([])
  const currentLibrary = ref<ExtendedLibraryInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  const pendingOperations = ref<Set<string>>(new Set())

  // 计算属性
  const totalLibraries = computed(() => libraries.value.length)
  
  const totalFiles = computed(() => {
    return libraries.value.reduce((total, library) => total + library.fileCount, 0)
  })

  const librariesByType = computed(() => {
    const grouped: Record<string, ExtendedLibraryInfo[]> = {}
    libraries.value.forEach(library => {
      if (!grouped[library.type]) {
        grouped[library.type] = []
      }
      grouped[library.type].push(library)
    })
    return grouped
  })

  const getLibraryById = computed(() => {
    return (id: string) => libraries.value.find(library => library.id === id)
  })

  const isOperationPending = computed(() => {
    return (operationId: string) => pendingOperations.value.has(operationId)
  })

  /**
   * 获取所有素材库集合
   * 支持缓存和增量更新
   * @returns Promise<{success: boolean, data?: LibraryInfo[], error?: string}>
   */
  const fetchLibraries = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const result = await miraSDKService.getLibraries()
      libraries.value = result
      lastUpdated.value = new Date()
      
      // 持久化到本地存储
      await persistLibraryState()
      
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch libraries'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建新的素材库集合
   * 使用乐观更新策略
   * @param name - 集合名称
   * @param description - 集合描述
   * @returns Promise<{success: boolean, data?: LibraryInfo, error?: string}>
   */
  const createLibrary = async (_name: string, _description?: string) => {
    // TODO 调用API创建
  }

  /**
   * 更新素材库集合信息
   * 使用乐观更新策略
   * @param id - 集合ID
   * @param updates - 更新数据
   * @returns Promise<{success: boolean, data?: LibraryInfo, error?: string}>
   */
  const updateLibrary = async (_id: string, _updates: Partial<LibraryInfo>) => {
   // TODO 调用API更新
  }

  /**
   * 删除素材库集合
   * 使用乐观更新策略
   * @param id - 集合ID
   * @returns Promise<{success: boolean, error?: string}>
   */
  const deleteLibrary = async (_id: string) => {
    // TODO 调用API删除
  }

  /**
   * 设置当前选中的素材库集合
   * @param library - 要设置的集合，可以为null
   */
  const setCurrentLibrary = async (library: ExtendedLibraryInfo | null) => {
    currentLibrary.value = library
    await persistLibraryState()
  }

  /**
   * 从本地存储持久化库状态
   * @returns Promise<void>
   */
  const persistLibraryState = async () => {
    try {
      const colletionData = {
        libraries: libraries.value,
        currentLibrary: currentLibrary.value,
        lastUpdated: lastUpdated.value?.toISOString()
      }

      await LibraryStorage.setItem('libraries', JSON.stringify(colletionData))
    } catch (err) {
      console.error('Failed to persist colletion state:', err)
    }
  }

  /**
   * 从本地存储恢复库状态
   * @returns Promise<void>
   */
  const restoreLibraryState = async () => {
    try {
      const stored = await LibraryStorage.getItem('libraries')
      if (!stored) return

      const colletionData = JSON.parse(stored)
      
      libraries.value = colletionData.libraries || []
      currentLibrary.value = colletionData.currentLibrary
      lastUpdated.value = colletionData.lastUpdated ? new Date(colletionData.lastUpdated) : null
      
      // 过滤掉临时集合
      libraries.value = libraries.value.filter(c => !c.isTemporary)
    } catch (err) {
      console.error('Failed to restore colletion state:', err)
    }
  }

  /**
   * 带重试机制的获取集合
   * @param maxRetries - 最大重试次数，默认为3
   * @returns Promise<{success: boolean, data?: LibraryInfo[], error?: string}>
   */
  const fetchLibrariesWithRetry = async (maxRetries = 3) => {
    let lastError = ''
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await fetchLibraries()
      
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
   * 刷新文件夹数据
   */
  const refreshFolders = async (colletionId?: string) => {
    try {
      const targetLibraryId = colletionId || currentLibrary.value?.id
      if (!targetLibraryId) {
        console.warn('No colletion ID provided for folder refresh')
        return
      }

      // 触发文件夹刷新事件
      window.dispatchEvent(new CustomEvent('refresh-folders', {
        detail: { colletionId: targetLibraryId }
      }))

    } catch (error) {
      console.error('Failed to refresh folders:', error)
    }
  }

  /**
   * 刷新标签数据
   */
  const refreshTags = async (colletionId?: string) => {
    try {
      const targetLibraryId = colletionId || currentLibrary.value?.id
      if (!targetLibraryId) {
        console.warn('No colletion ID provided for tag refresh')
        return
      }

      // 触发标签刷新事件
      window.dispatchEvent(new CustomEvent('refresh-tags', {
        detail: { colletionId: targetLibraryId }
      }))

    } catch (error) {
      console.error('Failed to refresh tags:', error)
    }
  }

  /**
   * 刷新集合列表
   * @returns Promise<{success: boolean, data?: LibraryInfo[], error?: string}>
   */
  const refreshLibraries = async () => {
    return await fetchLibraries()
  }

  return {
    // 状态
    libraries,
    currentLibrary,
    isLoading,
    error,
    lastUpdated,
    pendingOperations,
    
    // 计算属性
    totalLibraries,
    totalFiles,
    librariesByType,
    getLibraryById,
    isOperationPending,
    
    // 操作
    fetchLibraries,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    setCurrentLibrary,
    persistLibraryState,
    restoreLibraryState,
    fetchLibrariesWithRetry,
    clearError,
    refreshLibraries,
    refreshFolders,
    refreshTags
  }
})
