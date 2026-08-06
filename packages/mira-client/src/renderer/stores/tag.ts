import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'

// 标签接口
export interface Tag {
  id: number
  title: string
  color?: number
  description?: string
  createdAt?: string
  updatedAt?: string
  fileCount?: number
}

// 扩展的标签信息类型，支持临时状态
interface ExtendedTag extends Tag {
  isTemporary?: boolean
  isSelected?: boolean
}

/**
 * 标签状态管理
 * 处理标签的 CRUD 操作、文件标签关联和状态持久化
 */
export const useTagStore = defineStore('tag', () => {
  // 状态
  const tags = ref<ExtendedTag[]>([])
  const currentTag = ref<ExtendedTag | null>(null)
  const selectedTags = ref<Set<number>>(new Set())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  const pendingOperations = ref<Set<string>>(new Set())
  // 新增：按 libraryId 的缓存
  const tagCache = ref<Record<string, ExtendedTag[]>>({})

  // 计算属性
  const totalTags = computed(() => tags.value.length)
  
  const tagsByColor = computed(() => {
    const grouped: Record<string, ExtendedTag[]> = {}
    tags.value.forEach((tag: ExtendedTag) => {
      const color = tag.color?.toString() || 'default'
      if (!grouped[color]) {
        grouped[color] = []
      }
      grouped[color].push(tag)
    })
    return grouped
  })

  const popularTags = computed(() => {
    return tags.value
      .filter((tag: ExtendedTag) => (tag.fileCount || 0) > 0)
      .sort((a: ExtendedTag, b: ExtendedTag) => (b.fileCount || 0) - (a.fileCount || 0))
      .slice(0, 10)
  })

  const getTagById = computed(() => {
    return (id: number) => tags.value.find((tag: ExtendedTag) => tag.id === id)
  })

  const isOperationPending = computed(() => {
    return (operationId: string) => pendingOperations.value.has(operationId)
  })

  /**
   * 获取所有标签
   * @param libraryId - 素材库ID
   * @param forceRefresh - 是否强制刷新，忽略缓存
   * @returns Promise<{success: boolean, data?: Tag[], error?: string}>
   */
  const fetchTags = async (libraryId: string, forceRefresh = false) => {
    // 检查缓存
    if (!forceRefresh && tagCache.value[libraryId]) {
      tags.value = tagCache.value[libraryId]
      console.log(`✅ Loaded ${tags.value.length} tags from cache for library ${libraryId}`)
      return { success: true, data: tags.value }
    }

    isLoading.value = true
    error.value = null

    try {
      // 使用 SDK 获取标签列表
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.tags().getAll(libraryId)

      const tagsData = result.map((tag: any) => ({
        ...tag,
        isTemporary: false,
        isSelected: false,
        // 后端返回 file_count（snake_case），归一化到前端使用的 fileCount
        fileCount: tag.file_count ?? tag.fileCount ?? 0
      }))

      // 更新缓存和当前状态
      tagCache.value[libraryId] = tagsData
      tags.value = tagsData

      lastUpdated.value = new Date()

      console.log(`✅ Loaded ${tags.value.length} tags for library ${libraryId}`)
      return { success: true, data: tags.value }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags'
      error.value = errorMessage
      console.error('❌ Failed to load tags:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建标签
   * @param libraryId - 素材库ID
   * @param title - 标签名称
   * @param color - 标签颜色（可选）
   * @param description - 标签描述（可选）
   * @returns Promise<{success: boolean, data?: Tag, error?: string}>
   */
  const createTag = async (
    libraryId: string,
    title: string,
    color?: number,
    description?: string
  ) => {
    const operationId = `create-tag-${Date.now()}`
    pendingOperations.value.add(operationId)
    error.value = null
    
    try {
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.tags().createTag(
        libraryId,
        title,
        color,
        description
      )
      
      const newTag: ExtendedTag = {
        ...result,
        isTemporary: false,
        isSelected: false,
        fileCount: 0
      }

      // 更新缓存和当前状态
      if (tagCache.value[libraryId]) {
        tagCache.value[libraryId].push(newTag)
      }
      tags.value.push(newTag)
      lastUpdated.value = new Date()

      console.log(`✅ Created tag: ${title}`)
      return { success: true, data: newTag }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag'
      error.value = errorMessage
      console.error('❌ Failed to create tag:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
    }
  }

  /**
   * 按标题搜索标签
   * @param libraryId - 素材库ID
   * @param title - 搜索关键词
   * @returns Promise<{success: boolean, data?: Tag[], error?: string}>
   */
  const searchTags = async (libraryId: string, title: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.tags().findByTitle(libraryId, title)
      
      console.log(`✅ Found ${result.length} tags matching "${title}"`)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search tags'
      error.value = errorMessage
      console.error('❌ Failed to search tags:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取文件的标签
   * @param libraryId - 素材库ID
   * @param fileId - 文件ID
   * @returns Promise<{success: boolean, data?: string[], error?: string}>
   */
  const getFileTags = async (libraryId: string, fileId: number) => {
    try {
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.tags().getFileTagList(libraryId, fileId)
      
      return { success: true, data: result.data?.tags || [] }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get file tags'
      error.value = errorMessage
      console.error('❌ Failed to get file tags:', errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 为文件添加标签
   * @param libraryId - 素材库ID
   * @param fileId - 文件ID
   * @param tagTitles - 标签名称数组
   * @returns Promise<{success: boolean, error?: string}>
   */
  const addTagsToFile = async (libraryId: string, fileId: number, tagTitles: string[]) => {
    const operationId = `add-tags-${fileId}-${Date.now()}`
    pendingOperations.value.add(operationId)
    error.value = null
    
    try {
      const client = (miraSDKService as any).client
      if (!client) {
        throw new Error('SDK client not available')
      }

      const result = await client.tags().addTagsToFile(libraryId, fileId, tagTitles)
      
      console.log(`✅ Added tags to file ${fileId}:`, tagTitles)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tags to file'
      error.value = errorMessage
      console.error('❌ Failed to add tags to file:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
    }
  }

  /**
   * 设置当前标签
   * @param tag - 要设置的标签，可以为null
   */
  const setCurrentTag = (tag: ExtendedTag | null) => {
    currentTag.value = tag
  }

  /**
   * 选择标签
   * @param tagId - 标签ID
   */
  const selectTag = (tagId: number) => {
    selectedTags.value.add(tagId)
    const tag = tags.value.find((t: ExtendedTag) => t.id === tagId)
    if (tag) {
      tag.isSelected = true
    }
  }

  /**
   * 取消选择标签
   * @param tagId - 标签ID
   */
  const deselectTag = (tagId: number) => {
    selectedTags.value.delete(tagId)
    const tag = tags.value.find((t: ExtendedTag) => t.id === tagId)
    if (tag) {
      tag.isSelected = false
    }
  }

  /**
   * 切换标签选择状态
   * @param tagId - 标签ID
   */
  const toggleTagSelection = (tagId: number) => {
    if (selectedTags.value.has(tagId)) {
      deselectTag(tagId)
    } else {
      selectTag(tagId)
    }
  }

  /**
   * 清除所有选择
   */
  const clearSelection = () => {
    selectedTags.value.clear()
    tags.value.forEach((tag: ExtendedTag) => {
      tag.isSelected = false
    })
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 强制刷新标签数据
   * @param libraryId - 素材库ID
   */
  const refreshTags = async (libraryId: string) => {
    return await fetchTags(libraryId, true)
  }

  /**
   * 根据 libraryId 获取缓存的标签
   * @param libraryId - 素材库ID
   * @returns ExtendedTag[]
   */
  const getCachedTags = (libraryId: string): ExtendedTag[] => {
    return tagCache.value[libraryId] || []
  }

  /**
   * 清理标签状态
   */
  const cleanup = () => {
    tags.value = []
    currentTag.value = null
    selectedTags.value.clear()
    error.value = null
    lastUpdated.value = null
    pendingOperations.value.clear()
    tagCache.value = {}
  }

  return {
    // 状态
    tags,
    currentTag,
    selectedTags,
    isLoading,
    error,
    lastUpdated,
    pendingOperations,
    tagCache,

    // 计算属性
    totalTags,
    tagsByColor,
    popularTags,
    getTagById,
    isOperationPending,

    // 操作
    fetchTags,
    createTag,
    searchTags,
    getFileTags,
    addTagsToFile,
    setCurrentTag,
    selectTag,
    deselectTag,
    toggleTagSelection,
    clearSelection,
    clearError,
    refreshTags,
    getCachedTags,
    cleanup
  }
})
