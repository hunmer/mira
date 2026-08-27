import { ref, computed } from 'vue'
import { useTagStore } from '@renderer/stores/tag'
import { useMediaStore } from '@renderer/stores/media'
import { miraEventBus } from '@renderer/services/EventBus'

/**
 * 首页标签处理模块
 * 
 * 🏷️ **功能说明**：
 * - 管理标签的选择和显示状态
 * - 处理标签相关的文件过滤
 * - 提供标签操作的统一接口
 * 
 * 🔄 **使用方式**：
 * ```typescript
 * const tagHandler = useHomeTagHandler()
 * 
 * // 打开特定标签
 * await tagHandler.openTag('tag-id', { libraryId: 'lib-id' })
 * 
 * // 监听路由事件
 * tagHandler.listenToRouteEvents()
 * ```
 */
export function useHomeTagHandler() {
  const tagStore = useTagStore()
  const mediaStore = useMediaStore()
  
  // 当前选中的标签状态
  const currentTag = ref<{
    id: string | null
    title: string | null
    libraryId: string | null
    color?: string
    fileCount?: number
  }>({
    id: null,
    title: null,
    libraryId: null
  })

  // 标签处理状态
  const isProcessing = ref(false)
  const error = ref('')

  /**
   * 打开指定标签
   */
  const openTag = async (tagId: string, options?: {
    libraryId?: string
    title?: string
    label?: string
    color?: string
  }) => {
    try {
      isProcessing.value = true
      error.value = ''
      
      // 更新当前标签状态
      // 优先级：title > label > null（树节点只提供 label 时不能回落到 id）
      currentTag.value = {
        id: tagId,
        title: options?.title || options?.label || null,
        libraryId: options?.libraryId || null,
        color: options?.color
      }

      // 如果有libraryId，确保标签数据已加载
      if (options?.libraryId) {
        await tagStore.fetchTags(options.libraryId)

        // 从store中获取完整的标签信息（tag.id 为 number，tagId 为 string，需宽松比较）
        const tagInfo = tagStore.tags.find((tag: any) => String(tag.id) === String(tagId))
        if (tagInfo) {
          currentTag.value = {
            ...currentTag.value,
            title: tagInfo.title || (tagInfo as any).name,
            color: tagInfo.color?.toString() || '#666666',
            fileCount: tagInfo.fileCount
          }
        }
      }
      
      // 通知其他组件标签已选中
      miraEventBus.emit('home-tag-selected', currentTag.value)
      
      return true
    } catch (err) {
      console.error('❌ 打开标签失败:', err)
      error.value = err instanceof Error ? err.message : '打开标签失败'
      return false
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * 清除当前标签选择
   */
  const clearTagSelection = () => {
    currentTag.value = {
      id: null,
      title: null,
      libraryId: null
    }
    
    // 通知其他组件标签已清除
    miraEventBus.emit('home-tag-cleared', undefined)
    
  }

  /**
   * 获取当前标签相关的文件（使用 fetchFilesForTab 方法）
   */
  const getTaggedFiles = async (options?: {
    libraryId?: string
    pagination?: { limit?: number; offset?: number }
  }) => {
    if (!currentTag.value.id) {
      return { files: [], total: 0 }
    }

    // 构建标签筛选的 Tab 对象
    const tagTab = {
      id: `tag-${currentTag.value.id}`,
      label: currentTag.value.title || '标签',
      type: 'tag' as const,
      filterId: currentTag.value.id,
      filterValue: currentTag.value.id,
      icon: 'label',
      color: 'text-green-500',
      filters: {
        tags: {
          id: 'tags',
          selectedValues: [currentTag.value.id],
          label: '标签筛选'
        }
      }
    }

    try {
      // 使用 fetchFilesForTab 方法获取文件数据
      const result = await mediaStore.fetchFilesForTab(
        {
          ...tagTab,
          libraryId: options?.libraryId || currentTag.value.libraryId || ''
        },
        options?.pagination || {}
      )

      if (result.success) {
        return {
          files: result.data || [],
          total: result.total || 0
        }
      } else {
        console.error('❌ 获取标签文件失败:', (result as any).error)
        return { files: [], total: 0 }
      }
    } catch (error) {
      console.error('❌ 获取标签文件异常:', error)
      return { files: [], total: 0 }
    }
  }

  /**
   * 获取当前标签相关的文件（同步版本，用于向后兼容）
   * @deprecated 建议使用异步版本的 getTaggedFiles
   */
  const getTaggedFilesSync = () => {
    if (!currentTag.value.id) {
      return []
    }

    // 过滤包含当前标签的文件（从现有的 mediaStore 中）
    return mediaStore.files.filter((file: any) => {
      return file.tags?.some((tag: any) =>
        tag.id === currentTag.value.id || tag === currentTag.value.id
      )
    })
  }

  /**
   * 监听来自路由的标签事件
   */
  const listenToRouteEvents = () => {
    const handleRouteTag = ({ tagId, libraryId, title }: { tagId?: string; libraryId?: string; title?: string }) => {
      if (!tagId) return
      openTag(tagId, { libraryId, title })
    }
    miraEventBus.on('home-route-tag', handleRouteTag)
    
    // 返回清理函数
    return () => {
      miraEventBus.off('home-route-tag', handleRouteTag)
    }
  }

  /**
   * 获取所有可用标签
   */
  const availableTags = computed(() => {
    return tagStore.tags.map((tag: any) => ({
      id: tag.id,
      title: tag.title || (tag as any).name,
      color: tag.color?.toString() || '#666666',
      fileCount: tag.fileCount || 0,
      active: tag.id === currentTag.value.id
    }))
  })

  /**
   * 检查是否有选中的标签
   */
  const hasSelectedTag = computed(() => !!currentTag.value.id)

  /**
   * 获取当前标签的文件数量（同步版本）
   */
  const currentTagFileCount = computed(() => {
    return getTaggedFilesSync().length
  })

  /**
   * 异步获取当前标签的文件数量
   */
  const getCurrentTagFileCount = async (libraryId?: string) => {
    const result = await getTaggedFiles({ libraryId })
    return result.total
  }

  return {
    // 状态
    currentTag: computed(() => currentTag.value),
    isProcessing: computed(() => isProcessing.value),
    error: computed(() => error.value),
    hasSelectedTag,
    currentTagFileCount,
    availableTags,
    
    // 方法
    openTag,
    clearTagSelection,
    getTaggedFiles,
    getTaggedFilesSync,
    getCurrentTagFileCount,
    listenToRouteEvents
  }
}

/**
 * 全局标签处理器类型
 */
export type HomeTagHandler = ReturnType<typeof useHomeTagHandler>
