import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { miraEventBus } from '@renderer/services/EventBus'

/**
 * 首页路由参数处理模块
 *
 * 状态提升为模块级单例，确保所有调用方共享同一份去重状态，
 * 避免多个 composable 实例各自持有独立的 lastProcessedRouteKey
 * 导致路由去重失效。
 */

// 模块级单例状态
const currentRouteState = ref<{
  type: 'tag' | 'folder' | 'default' | null
  id: string | null
  libraryId: string | null
  title: string | null
  isProcessing: boolean
}>({
  type: null,
  id: null,
  libraryId: null,
  title: null,
  isProcessing: false
})

const routeError = ref('')
const lastProcessedRouteKey = ref<string>('')
const isProcessingRoute = ref(false)
let routeWatcher: (() => void) | null = null
const isWatchingRoute = ref(false)

export function useHomeRouteHandler() {
  const route = useRoute()
  const router = useRouter()

  /**
   * 解析当前路由查询参数
   */
  const parseCurrentRoute = () => {
    const query = route.query
    
    // 检查是否有tag参数
    if (query.tag) {
      return {
        type: 'tag' as const,
        id: query.tag as string,
        libraryId: query.libraryId as string || null,
        title: query.title as string || null
      }
    }
    
    // 检查是否有folder参数
    if (query.folder) {
      return {
        type: 'folder' as const,
        id: query.folder as string,
        libraryId: query.libraryId as string || null,
        title: query.title as string || null
      }
    }
    
    // 默认状态
    return {
      type: 'default' as const,
      id: null,
      libraryId: null,
      title: null
    }
  }

  /**
   * 处理标签路由
   */
  const handleTagRoute = async (tagId: string, libraryId?: string, title?: string) => {
    try {
      // 临时实现：通过事件通知HomeView更新标签状态
      miraEventBus.emit('home-route-tag', { tagId, libraryId, title })
      
      return true
    } catch (error) {
      console.error('❌ 标签路由处理失败:', error)
      routeError.value = `打开标签失败: ${error instanceof Error ? error.message : '未知错误'}`
      return false
    }
  }

  /**
   * 处理文件夹路由
   */
  const handleFolderRoute = async (folderId: string, libraryId?: string, title?: string) => {
    try {
      // 临时实现：通过事件通知HomeView更新文件夹状态
      miraEventBus.emit('home-route-folder', { folderId, libraryId, title })
      
      return true
    } catch (error) {
      console.error('❌ 文件夹路由处理失败:', error)
      routeError.value = `打开文件夹失败: ${error instanceof Error ? error.message : '未知错误'}`
      return false
    }
  }

  /**
   * 处理当前路由
   */
  const handleCurrentRoute = async () => {
    if (currentRouteState.value.isProcessing || isProcessingRoute.value) {
      return
    }

    try {
      const routeInfo = parseCurrentRoute()
      
      // 生成路由键用于防重复
      const routeKey = `${routeInfo.type}-${routeInfo.id}-${routeInfo.libraryId}`
      
      // 检查是否是重复的路由处理
      if (lastProcessedRouteKey.value === routeKey) {
        return
      }
      
      isProcessingRoute.value = true
      currentRouteState.value.isProcessing = true
      routeError.value = ''
      
      // 更新当前状态
      currentRouteState.value = {
        ...routeInfo,
        isProcessing: true
      }
      
      let success = false
      
      switch (routeInfo.type) {
        case 'tag':
          success = await handleTagRoute(
            routeInfo.id!,
            routeInfo.libraryId || undefined,
            routeInfo.title || undefined
          )
          break
          
        case 'folder':
          success = await handleFolderRoute(
            routeInfo.id!,
            routeInfo.libraryId || undefined,
            routeInfo.title || undefined
          )
          break
          
        case 'default':
          success = true
          break
          
        default:
          success = true
      }
      
      if (success) {
        // 更新最后处理的路由键
        lastProcessedRouteKey.value = routeKey
      }
      
    } catch (error) {
      console.error('❌ 路由处理异常:', error)
      routeError.value = `路由处理失败: ${error instanceof Error ? error.message : '未知错误'}`
    } finally {
      currentRouteState.value.isProcessing = false
      isProcessingRoute.value = false
    }
  }

  /**
   * 监听路由变化
   */
  const watchRouteChanges = () => {
    // 防止重复注册监听器
    if (isWatchingRoute.value) {
      return routeWatcher
    }
    
    isWatchingRoute.value = true
    
    // 监听路由查询参数变化
    routeWatcher = router.afterEach((to) => {
      if (to.path === '/' && (to.query.tag || to.query.folder)) {
        // 检查是否正在处理中
        if (isProcessingRoute.value) {
          return
        }
        
        // 延迟处理，确保组件已准备好
        setTimeout(() => {
          handleCurrentRoute()
        }, 100)
      }
    })
    
    // 返回清理函数
    return () => {
      if (routeWatcher) {
        routeWatcher()
        routeWatcher = null
        isWatchingRoute.value = false
      }
    }
  }

  /**
   * 导航到标签
   */
  const navigateToTag = async (tagId: string, options?: {
    libraryId?: string
    title?: string
    replace?: boolean
  }) => {
    const query: Record<string, string> = { tag: tagId }
    
    if (options?.libraryId) query.libraryId = options.libraryId
    if (options?.title) query.title = options.title
    
    if (options?.replace) {
      await router.replace({ path: '/', query })
    } else {
      await router.push({ path: '/', query })
    }
  }

  /**
   * 导航到文件夹
   */
  const navigateToFolder = async (folderId: string, options?: {
    libraryId?: string
    title?: string
    replace?: boolean
  }) => {
    const query: Record<string, string> = { folder: folderId }
    
    if (options?.libraryId) query.libraryId = options.libraryId
    if (options?.title) query.title = options.title
    
    if (options?.replace) {
      await router.replace({ path: '/', query })
    } else {
      await router.push({ path: '/', query })
    }
  }

  /**
   * 静态更新路由参数（用于 tab 切换）
   * 不触发路由处理逻辑，只更新 URL 和重置防重复机制
   */
  const updateRouteParams = async (params: {
    type: 'tag' | 'folder' | 'clear'
    id?: string
    libraryId?: string
    title?: string
  }) => {
    try {
      if (params.type === 'clear') {
        // 清除所有路由参数
        await router.replace({ path: '/' })
        lastProcessedRouteKey.value = 'default-null-null'
        return
      }
      
      // 构建查询参数
      const query: Record<string, string> = {}
      
      if (params.type === 'tag' && params.id) {
        query.tag = params.id
      } else if (params.type === 'folder' && params.id) {
        query.folder = params.id
      }
      
      if (params.libraryId) query.libraryId = params.libraryId
      if (params.title) query.title = params.title
      
      // 静态更新 URL（replace 不会触发页面重新加载）
      await router.replace({ path: '/', query })
      
      // 生成新的路由键并更新
      const newRouteKey = `${params.type}-${params.id || 'null'}-${params.libraryId || 'null'}`
      lastProcessedRouteKey.value = newRouteKey
      
    } catch (error) {
      console.error('❌ 更新路由参数失败:', error)
    }
  }

  /**
   * 清除路由参数，回到默认状态
   */
  const clearRouteParams = async (replace = true) => {
    if (replace) {
      await router.replace({ path: '/' })
    } else {
      await router.push({ path: '/' })
    }
  }

  /**
   * 初始化路由处理器
   */
  const initialize = async () => {
    // 处理当前路由
    await handleCurrentRoute()
    
    const unwatch = watchRouteChanges()

    return unwatch
  }

  // 计算属性
  const isHandlingRoute = computed(() => currentRouteState.value.isProcessing)
  const hasRouteError = computed(() => !!routeError.value)
  const currentRouteType = computed(() => currentRouteState.value.type)
  const currentRouteId = computed(() => currentRouteState.value.id)

  return {
    // 状态
    currentRouteState: computed(() => currentRouteState.value),
    routeError: computed(() => routeError.value),
    isHandlingRoute,
    hasRouteError,
    currentRouteType,
    currentRouteId,
    
    // 方法
    initialize,
    handleCurrentRoute,
    watchRouteChanges,
    parseCurrentRoute,
    navigateToTag,
    navigateToFolder,
    clearRouteParams,
    updateRouteParams,
    
    // 内部方法（可选暴露用于测试）
    handleTagRoute,
    handleFolderRoute
  }
}

/**
 * 全局路由处理器实例
 * 
 * 在HomeView.vue中使用：
 * ```typescript
 * import { useHomeRouteHandler } from '@renderer/modules/home/routeHandler'
 * 
 * const routeHandler = useHomeRouteHandler()
 * 
 * onMounted(async () => {
 *   await routeHandler.initialize()
 * })
 * ```
 */
export type HomeRouteHandler = ReturnType<typeof useHomeRouteHandler>
