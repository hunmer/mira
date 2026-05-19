import { ref, computed, nextTick } from 'vue'
import type { 
  SearchService, 
  GlobalSearchState, 
  PlatformType, 
  SearchMode,
  SearchConfig,
  KeyboardNavigationEvent
} from '../types/search'

/**
 * 默认搜索配置
 */
const DEFAULT_CONFIG: SearchConfig = {
  debounceDelay: 300,
  maxResults: 50,
  enableHistory: true,
  maxHistoryItems: 10
}

/**
 * 全局搜索状态
 */
const globalSearchState = ref<GlobalSearchState>({
  isVisible: false,
  activeTab: '',
  searchKeyword: '',
  searchResults: {},
  isSearching: false,
  totalCounts: {}
})

/**
 * 注册的搜索服务
 */
const searchServices = ref<Map<string, SearchService>>(new Map())

/**
 * 搜索配置
 */
const searchConfig = ref<SearchConfig>({ ...DEFAULT_CONFIG })

/**
 * 节流函数实现
 * @param func 要节流的函数
 * @param delay 延迟时间(毫秒)
 * @returns 节流后的函数
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * 全局搜索组合式API
 */
export function useGlobalSearch() {
  /**
   * 检测当前运行平台
   * @returns 平台类型
   */
  const detectPlatform = (): PlatformType => {
    return typeof window !== 'undefined' && (window as any).electronAPI 
      ? 'desktop' 
      : 'web'
  }

  /**
   * 获取当前搜索模式
   * @returns 搜索模式
   */
  const getSearchMode = (): SearchMode => {
    return detectPlatform() === 'desktop' ? 'window' : 'dialog'
  }

  /**
   * 注册搜索服务
   * @param service 搜索服务实例
   */
  const registerSearchService = (service: SearchService): void => {
    searchServices.value.set(service.id, service)
    
    // 初始化该服务的总数
    try {
      const total = service.getTotal()
      globalSearchState.value.totalCounts[service.id] = Array.isArray(total) ? total.length : 0
    } catch (error) {
      console.warn(`Failed to get total count for service ${service.id}:`, error)
      globalSearchState.value.totalCounts[service.id] = 0
    }

    // 如果是第一个服务，设为默认激活
    if (searchServices.value.size === 1) {
      globalSearchState.value.activeTab = service.id
    }
  }

  /**
   * 注销搜索服务
   * @param serviceId 服务ID
   */
  const unregisterSearchService = (serviceId: string): void => {
    searchServices.value.delete(serviceId)
    delete globalSearchState.value.searchResults[serviceId]
    delete globalSearchState.value.totalCounts[serviceId]
    
    // 如果删除的是当前激活的服务，切换到第一个可用服务
    if (globalSearchState.value.activeTab === serviceId) {
      const firstService = Array.from(searchServices.value.keys())[0]
      globalSearchState.value.activeTab = firstService || ''
    }
  }

  /**
   * 执行搜索
   * @param keyword 搜索关键词
   * @param serviceId 可选的特定服务ID，不传则搜索所有服务
   */
  const performSearch = async (keyword: string, serviceId?: string): Promise<void> => {
    if (!keyword.trim()) {
      // 清空搜索结果
      globalSearchState.value.searchResults = {}
      globalSearchState.value.searchKeyword = ''
      return
    }

    globalSearchState.value.isSearching = true
    globalSearchState.value.searchKeyword = keyword

    try {
      const servicesToSearch = serviceId 
        ? [searchServices.value.get(serviceId)].filter(Boolean) as SearchService[]
        : Array.from(searchServices.value.values())

      // 并行执行所有服务的搜索
      const searchPromises = servicesToSearch.map(async (service) => {
        try {
          const results = await service.search(keyword)
          return { serviceId: service.id, results: results.slice(0, searchConfig.value.maxResults) }
        } catch (error) {
          console.warn(`Search failed for service ${service.id}:`, error)
          return { serviceId: service.id, results: [] }
        }
      })

      const searchResults = await Promise.all(searchPromises)
      
      // 更新搜索结果
      searchResults.forEach(({ serviceId, results }) => {
        globalSearchState.value.searchResults[serviceId] = results
      })
    } catch (error) {
      console.error('Search operation failed:', error)
    } finally {
      globalSearchState.value.isSearching = false
    }
  }

  /**
   * 节流搜索函数
   */
  const debouncedSearch = debounce(performSearch, searchConfig.value.debounceDelay)

  /**
   * 设置搜索关键词并执行搜索
   * @param keyword 搜索关键词
   */
  const setSearchKeyword = (keyword: string): void => {
    globalSearchState.value.searchKeyword = keyword
    if (keyword.trim()) {
      debouncedSearch(keyword)
    } else {
      globalSearchState.value.searchResults = {}
    }
  }

  /**
   * 切换搜索对话框显示状态
   */
  const toggleSearchDialog = (): void => {
    globalSearchState.value.isVisible = !globalSearchState.value.isVisible
    
    // 如果显示对话框，等待DOM更新后聚焦搜索框
    if (globalSearchState.value.isVisible) {
      nextTick(() => {
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      })
    }
  }

  /**
   * 显示搜索对话框
   */
  const showSearchDialog = (): void => {
    globalSearchState.value.isVisible = true
    nextTick(() => {
      const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    })
  }

  /**
   * 隐藏搜索对话框
   */
  const hideSearchDialog = (): void => {
    globalSearchState.value.isVisible = false
    // 清空搜索状态
    globalSearchState.value.searchKeyword = ''
    globalSearchState.value.searchResults = {}
  }

  /**
   * 设置激活的搜索标签
   * @param serviceId 服务ID
   */
  const setActiveTab = (serviceId: string): void => {
    if (searchServices.value.has(serviceId)) {
      globalSearchState.value.activeTab = serviceId
    }
  }

  /**
   * 处理搜索结果项点击
   * @param serviceId 服务ID
   * @param item 搜索结果项
   */
  const handleItemClick = (serviceId: string, item: any): void => {
    const service = searchServices.value.get(serviceId)
    if (service) {
      service.itemClick(item)
      // 点击后隐藏搜索对话框
      hideSearchDialog()
    }
  }

  /**
   * 键盘导航处理
   * @param event 键盘事件
   */
  const handleKeyboardNavigation = (event: KeyboardNavigationEvent): void => {
    const { key } = event

    switch (key) {
      case 'Escape':
        event.preventDefault()
        hideSearchDialog()
        break
      case 'Tab':
        event.preventDefault()
        // 切换到下一个标签
        const serviceIds = Array.from(searchServices.value.keys())
        const currentIndex = serviceIds.indexOf(globalSearchState.value.activeTab)
        const nextIndex = (currentIndex + 1) % serviceIds.length
        setActiveTab(serviceIds[nextIndex])
        break
      case 'ArrowUp':
      case 'ArrowDown':
        // TODO: 实现结果列表内的上下导航
        event.preventDefault()
        break
      case 'Enter':
        // TODO: 实现当前选中项的确认操作
        event.preventDefault()
        break
    }
  }

  /**
   * 更新搜索配置
   * @param config 部分配置对象
   */
  const updateConfig = (config: Partial<SearchConfig>): void => {
    searchConfig.value = { ...searchConfig.value, ...config }
  }

  // 计算属性
  const platform = computed(() => detectPlatform())
  const searchMode = computed(() => getSearchMode())
  const isDesktop = computed(() => platform.value === 'desktop')
  const isWeb = computed(() => platform.value === 'web')
  
  const availableServices = computed(() => Array.from(searchServices.value.values()))
  
  const currentSearchResults = computed(() => {
    const activeTab = globalSearchState.value.activeTab
    return globalSearchState.value.searchResults[activeTab] || []
  })

  const hasSearchResults = computed(() => {
    return Object.values(globalSearchState.value.searchResults).some(results => results.length > 0)
  })

  const currentService = computed(() => {
    return searchServices.value.get(globalSearchState.value.activeTab)
  })

  return {
    // 状态
    state: globalSearchState,
    config: searchConfig,
    
    // 计算属性
    platform,
    searchMode,
    isDesktop,
    isWeb,
    availableServices,
    currentSearchResults,
    hasSearchResults,
    currentService,
    
    // 方法
    detectPlatform,
    getSearchMode,
    registerSearchService,
    unregisterSearchService,
    performSearch,
    setSearchKeyword,
    toggleSearchDialog,
    showSearchDialog,
    hideSearchDialog,
    setActiveTab,
    handleItemClick,
    handleKeyboardNavigation,
    updateConfig
  }
}
