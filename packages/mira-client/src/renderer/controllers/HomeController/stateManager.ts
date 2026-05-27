import { ref, computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useMediaStore } from '../../stores/media'
import { useFolderStore } from '../../stores/folder'
import { useTagStore } from '../../stores/tag'
import { useLibraryStore } from '../../stores/library'
import { useGlobalSearch } from '../../composables/useGlobalSearch'
import type { SearchFilter } from '../../types/components'

/**
 * 状态管理和配置模块
 * 负责处理UI状态、筛选条件、配置管理、初始化等
 */
export class HomeStateManager {
  private settingsStore = useSettingsStore()
  private mediaStore = useMediaStore()
  private folderStore = useFolderStore()
  private tagStore = useTagStore()
  private libraryStore = useLibraryStore()

  // UI状态
  public cardSize = ref<'small' | 'medium' | 'large'>('medium')
  public columnsPerRow = ref(this.settingsStore.settings.columnsPerRow)
  public viewMode = ref<'grid' | 'list' | 'waterfall'>('grid')

  /**
   * 处理筛选器变化
   * @param filterType - 筛选器类型
   * @param filterRule - 筛选规则
   * @param filterConditions - 筛选条件引用
   * @param onPageReset - 页面重置回调
   */
  public handleFilterChange = (
    filterType: string,
    filterRule: any,
    filterConditions: any,
    onPageReset?: () => void
  ): void => {
    console.log('HomeController - 筛选器变化:', filterType, {
      id: filterRule.id,
      selectedValues: filterRule.selectedValues,
      value: filterRule.value,
      selectedPreset: filterRule.selectedPreset
    })

    switch (filterType) {
      case 'folders':
        filterConditions.value.folders = filterRule.selectedValues || []
        console.log('更新文件夹筛选:', filterConditions.value.folders)
        break
      case 'tags':
        filterConditions.value.tags = filterRule.selectedValues || []
        console.log('更新标签筛选:', filterConditions.value.tags)
        break
      case 'urls':
        filterConditions.value.urls = filterRule.value || ''
        console.log('更新网址筛选:', filterConditions.value.urls)
        break
      case 'title':
        filterConditions.value.title = filterRule.value || ''
        console.log('更新标题筛选:', filterConditions.value.title)
        break
      case 'size':
        if (filterRule.selectedPreset === 'custom') {
          filterConditions.value.sizeMin = filterRule.customMin
          filterConditions.value.sizeMax = filterRule.customMax
        } else {
          filterConditions.value.sizeMin = filterRule.sizeMin
          filterConditions.value.sizeMax = filterRule.sizeMax
        }
        filterConditions.value.sizePreset = filterRule.selectedPreset
        console.log('更新大小筛选:', {
          min: filterConditions.value.sizeMin,
          max: filterConditions.value.sizeMax,
          preset: filterConditions.value.sizePreset
        })
        break
    }

    if (onPageReset) {
      onPageReset()
    }
  }

  /**
   * 清除筛选器
   * @param filterType - 筛选器类型
   * @param filterConditions - 筛选条件引用
   * @param onPageReset - 页面重置回调
   */
  public handleFilterClear = (filterType: string, filterConditions: any, onPageReset?: () => void): void => {
    console.log('清除筛选器:', filterType)

    switch (filterType) {
      case 'folders':
        filterConditions.value.folders = []
        break
      case 'tags':
        filterConditions.value.tags = []
        break
      case 'urls':
        filterConditions.value.urls = ''
        break
      case 'title':
        filterConditions.value.title = ''
        break
      case 'size':
        filterConditions.value.sizeMin = undefined
        filterConditions.value.sizeMax = undefined
        filterConditions.value.sizePreset = ''
        break
    }

    if (onPageReset) {
      onPageReset()
    }
  }

  /**
   * 应用筛选器到Tab
   * @param tabId - Tab ID
   * @param filters - 筛选条件
   * @param filterConditions - 筛选条件引用
   * @param onPageReset - 页面重置回调
   */
  public applyFiltersToTab = (
    tabId: string,
    filters: Record<string, any>,
    filterConditions: any,
    onPageReset?: () => void
  ): void => {
    console.log('应用筛选器到标签:', tabId, filters)

    // 重置筛选条件
    filterConditions.value = {
      folders: [],
      tags: [],
      urls: '',
      title: '',
      sizeMin: undefined,
      sizeMax: undefined,
      sizePreset: ''
    }

    // 应用新的筛选条件
    for (const [filterType, filterRule] of Object.entries(filters)) {
      switch (filterType) {
        case 'folders':
          filterConditions.value.folders = filterRule.selectedValues || []
          break
        case 'tags':
          filterConditions.value.tags = filterRule.selectedValues || []
          break
        case 'urls':
          filterConditions.value.urls = filterRule.value || ''
          break
        case 'title':
          filterConditions.value.title = filterRule.value || ''
          break
        case 'size':
          if (filterRule.selectedPreset === 'custom') {
            filterConditions.value.sizeMin = filterRule.customMin
            filterConditions.value.sizeMax = filterRule.customMax
          } else {
            filterConditions.value.sizeMin = filterRule.sizeMin
            filterConditions.value.sizeMax = filterRule.sizeMax
          }
          filterConditions.value.sizePreset = filterRule.selectedPreset
          break
      }
    }

    if (onPageReset) {
      onPageReset()
    }
  }

  /**
   * 处理过滤器变化
   * @param filters - 过滤器数组
   * @param activeFilters - 活动过滤器引用
   * @param onPageReset - 页面重置回调
   */
  public handleFilter = (filters: SearchFilter[], activeFilters: any, onPageReset?: () => void): void => {
    activeFilters.value = filters

    if (onPageReset) {
      onPageReset()
    }
  }

  /**
   * 处理工具栏按钮点击
   * @param buttonId - 按钮ID
   * @param onRefresh - 刷新回调
   */
  public handleToolbarAction = async (buttonId: string, onRefresh?: () => Promise<void>): Promise<void> => {
    console.log('Toolbar action:', buttonId)

    switch (buttonId) {
      case 'upload':
        // 打开文件上传对话框
        break
      case 'refresh':
        if (onRefresh) {
          await onRefresh()
        }
        break
      case 'grid':
        this.cardSize.value = 'medium'
        break
      case 'list':
        this.cardSize.value = 'small'
        break
    }
  }

  /**
   * 处理内容工具栏按钮点击
   * @param buttonId - 按钮ID
   * @param mediaItems - 媒体项目数组
   * @param selectedItems - 选中项目引用
   */
  public handleContentAction = (buttonId: string, mediaItems: any[], selectedItems: any): void => {
    console.log('Content action:', buttonId)

    switch (buttonId) {
      case 'select-all':
        selectedItems.value = mediaItems.map(item => item.id)
        break
      case 'select-none':
        selectedItems.value = []
        break
    }
  }

  /**
   * 切换视图模式
   * @param mode - 视图模式
   */
  public setViewMode = async (mode: 'grid' | 'list' | 'waterfall'): Promise<void> => {
    this.viewMode.value = mode
  }

  /**
   * 处理卡片大小变化
   * @param event - 输入事件
   */
  public handleCardSizeChange = (event: Event): void => {
    const target = event.target as HTMLInputElement
    const value = parseInt(target.value)
    switch (value) {
      case 1:
        this.cardSize.value = 'small'
        break
      case 2:
        this.cardSize.value = 'medium'
        break
      case 3:
        this.cardSize.value = 'large'
        break
    }
  }

  /**
   * 处理列数变化
   * @param event - 输入事件
   */
  public handleColumnsChange = async (event: Event): Promise<void> => {
    const target = event.target as HTMLInputElement
    const value = parseInt(target.value)
    if (value >= 2 && value <= 8) {
      this.columnsPerRow.value = value
      await this.settingsStore.updateSetting('columnsPerRow', value)
    }
  }

  /**
   * 卡片大小值
   */
  public cardSizeValue = computed(() => {
    switch (this.cardSize.value) {
      case 'small': return 1
      case 'medium': return 2
      case 'large': return 3
      default: return 2
    }
  })

  /**
   * 动态计算的列宽度
   */
  public dynamicColumnWidth = computed(() => {
    const containerWidth = 1200
    const gap = 16
    const columns = this.columnsPerRow.value
    return Math.floor((containerWidth - (gap * (columns - 1))) / columns)
  })

  /**
   * 刷新数据
   */
  public async handleRefresh(): Promise<void> {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      await Promise.all([
        this.mediaStore.refreshFiles(libraryId),
        this.folderStore.refreshFolders(libraryId),
        this.tagStore.refreshTags(libraryId)
      ])

      console.log('✅ Data refreshed successfully')
    }
  }

  /**
   * 初始化控制器
   */
  public async initialize(): Promise<void> {
    await this.settingsStore.loadSettings()

    this.viewMode.value = 'grid'
    this.columnsPerRow.value = this.settingsStore.settings.columnsPerRow

    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      // 移除全量文件获取，改为按需加载
      // 文件将在tab切换时通过fetchFilesForTab按需获取
      // if (this.mediaStore.files.length === 0) {
      //   await this.mediaStore.fetchFiles({ libraryId })
      // }

      if (this.folderStore.folders.length === 0) {
        await this.folderStore.fetchFolders(libraryId)
      }

      if (this.tagStore.tags.length === 0) {
        await this.tagStore.fetchTags(libraryId)
      }
    }

    await this.initializeSearchServices()
  }

  /**
   * 初始化搜索服务
   */
  private async initializeSearchServices(): Promise<void> {
    try {
      const { registerAllSearchServices } = await import('../../services/search')
      const { registerSearchService } = useGlobalSearch()

      registerAllSearchServices(registerSearchService)
    } catch (error) {
      console.error('❌ Failed to initialize search services:', error)
    }
  }
}