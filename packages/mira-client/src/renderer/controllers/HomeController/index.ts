import { computed } from 'vue'
import { HomeDataManager } from './dataManager'
import { HomeInteractionHandler } from './interactionHandler'
import { HomeFileOperations } from './fileOperations'
import { HomeStateManager } from './stateManager'
import type { SearchFilter } from '../../types/components'

/**
 * 主页控制器
 * 整合所有业务逻辑模块，提供统一的接口
 */
export class HomeController {
  // 模块实例
  private dataManager = new HomeDataManager()
  private interactionHandler = new HomeInteractionHandler()
  private fileOperations = new HomeFileOperations()
  private stateManager = new HomeStateManager()

  constructor() {
    // 初始化状态监听器
    this.interactionHandler.initializeStateWatchers()
  }

  // ============= 数据管理相关 =============
  // 直接暴露数据管理器的属性和方法
  public get mediaItems() { return this.dataManager.mediaItems }
  public get folderTree() { return this.dataManager.folderTree }
  public get quickFilters() { return this.dataManager.quickFilters }
  public get filteredMediaItems() { return this.dataManager.filteredMediaItems }
  public get searchFilters() { return this.dataManager.searchFilters }
  public get currentPath() { return this.dataManager.currentPath }
  public get totalFiles() { return this.dataManager.totalFiles }
  public get isLoading() { return this.dataManager.isLoading }
  public get errorMessage() { return this.dataManager.errorMessage }

  // 筛选相关状态
  public get filterConditions() { return this.dataManager.filterConditions }
  public get searchQuery() { return this.dataManager.searchQuery }
  public get activeFilters() { return this.dataManager.activeFilters }
  public get selectedFolder() { return this.dataManager.selectedFolder }

  // ============= 用户交互相关 =============
  // 直接暴露交互处理器的属性和方法
  public get showSearch() { return this.interactionHandler.showSearch }
  public get selectedItems() { return this.interactionHandler.selectedItems }
  public get currentPage() { return this.interactionHandler.currentPage }
  public get itemsPerPage() { return this.interactionHandler.itemsPerPage }
  public get serverTotalRecords() { return this.interactionHandler.serverTotalRecords }
  public get isServerPagination() { return this.interactionHandler.isServerPagination }
  public get isItemSelected() { return this.interactionHandler.isItemSelected }

  // 计算属性封装
  public paginatedMediaItems = computed(() =>
    this.interactionHandler.getPaginatedItems(this.dataManager.filteredMediaItems?.value || [])
  )

  public totalPages = computed(() => {
    const filteredItemsLength = (this.dataManager.filteredMediaItems?.value || []).length
    const totalPages = this.interactionHandler.getTotalPages(filteredItemsLength)
      filteredItemsLength,
      serverTotalRecords: this.interactionHandler.serverTotalRecords?.value,
      itemsPerPage: this.interactionHandler.itemsPerPage?.value,
      isServerPagination: this.interactionHandler.isServerPagination?.value,
      计算结果: totalPages
    })
    return totalPages
  })

  public isAllSelected = computed(() =>
    this.interactionHandler.getIsAllSelected(this.paginatedMediaItems?.value || [])
  )

  public selectedMediaItem = computed(() =>
    this.interactionHandler.getSelectedMediaItem(this.dataManager.mediaItems?.value || [])
  )

  // ============= 状态管理相关 =============
  // 直接暴露状态管理器的属性和方法
  public get cardSize() { return this.stateManager.cardSize }
  public get columnsPerRow() { return this.stateManager.columnsPerRow }
  public get viewMode() { return this.stateManager.viewMode }
  public get cardSizeValue() { return this.stateManager.cardSizeValue }
  public get dynamicColumnWidth() { return this.stateManager.dynamicColumnWidth }

  // ============= 公共方法 =============

  /**
   * 页面重置回调
   */
  private handlePageReset = (): void => {
    this.interactionHandler.currentPage.value = 1
    this.interactionHandler.selectedItems.value = []
  }

  /**
   * 加载当前页数据（服务端分页）
   */
  private loadCurrentPageData = async (): Promise<void> => {
    const getCurrentTab = (this.interactionHandler as any)._getCurrentTabCallback
    const getCurrentLibrary = (this.interactionHandler as any)._getCurrentLibraryCallback

    if (!getCurrentTab || !getCurrentLibrary) {
      console.warn('⚠️ 无法加载当前页数据：缺少回调函数')
      return
    }

    const currentTab = getCurrentTab()
    const currentLibrary = getCurrentLibrary()

    if (!currentTab || !currentLibrary?.id) {
      console.warn('⚠️ 无法加载当前页数据：缺少当前tab或素材库信息')
      return
    }

    const currentPageValue = this.interactionHandler.currentPage.value
    const itemsPerPageValue = this.interactionHandler.itemsPerPage.value
    const offset = (currentPageValue - 1) * itemsPerPageValue

      currentPage: currentPageValue,
      itemsPerPage: itemsPerPageValue,
      calculatedOffset: offset
    })

    const pagination = {
      limit: itemsPerPageValue,
      offset: offset
    }

    // 重新加载当前页数据
    try {
      const { useMediaStore } = await import('../../stores/media')
      const mediaStore = useMediaStore()

      // 确保currentTab包含libraryId信息
      const tabWithLibrary = {
        ...currentTab,
        libraryId: currentLibrary.id
      }

      const result = await mediaStore.fetchFilesForTab(
        tabWithLibrary,
        pagination
      )

      if (result.success) {
      } else {
        console.error('❌ 加载当前页数据失败:', (result as any).error)
      }
    } catch (error) {
      console.error('❌ 加载当前页数据异常:', error)
    }
  }

  // ============= 搜索和过滤相关方法 =============
  public handleSearch = (query: string, filters?: SearchFilter[]): void => {
    this.dataManager.searchQuery.value = query
    if (filters) {
      this.dataManager.activeFilters.value = filters
    }
    this.interactionHandler.handleSearch(query, filters)
    this.handlePageReset()
  }

  public handleFilter = (filters: SearchFilter[]): void => {
    this.stateManager.handleFilter(filters, this.dataManager.activeFilters, this.handlePageReset)
  }

  public handleClearSearch = (): void => {
    this.dataManager.searchQuery.value = ''
    this.dataManager.activeFilters.value = []
    this.interactionHandler.handleClearSearch()
  }

  public handleFilterChange = (filterType: string, filterRule: any): void => {
    this.stateManager.handleFilterChange(filterType, filterRule, this.dataManager.filterConditions, this.handlePageReset)
  }

  public handleFilterClear = (filterType: string): void => {
    this.stateManager.handleFilterClear(filterType, this.dataManager.filterConditions, this.handlePageReset)
  }

  public applyFiltersToTab = (tabId: string, filters: Record<string, any>): void => {
    this.stateManager.applyFiltersToTab(tabId, filters, this.dataManager.filterConditions, this.handlePageReset)
  }

  // ============= 用户交互方法 =============
  public handleNavigation = this.interactionHandler.handleNavigation
  public handleNavigationSelect = this.interactionHandler.handleNavigationSelect
  public handleMediaClick = this.interactionHandler.handleMediaClick
  public handleMediaDoubleClick = this.interactionHandler.handleMediaDoubleClick
  public handleMediaSelect = this.interactionHandler.handleMediaSelect
  public handleMediaContextMenu = this.interactionHandler.handleMediaContextMenu
  public handleFolderSelect = this.interactionHandler.handleFolderSelect
  public handleFolderExpand = this.interactionHandler.handleFolderExpand
  public handleBreadcrumbClick = this.interactionHandler.handleBreadcrumbClick
  public toggleSearch = this.interactionHandler.toggleSearch

  public handleSelectAll = (): void => {
    this.interactionHandler.handleSelectAll(this.paginatedMediaItems.value, this.isAllSelected.value)
  }

  public handleQuickFilter = this.interactionHandler.handleQuickFilter

  // 分页方法
  public handlePageChange = async (page: number): Promise<void> => {
    await this.interactionHandler.handlePageChange(page, this.totalPages.value, this.loadCurrentPageData)
  }

  public handlePreviousPage = async (): Promise<void> => {
    await this.interactionHandler.handlePreviousPage(this.totalPages.value, this.loadCurrentPageData)
  }

  public handleNextPage = async (): Promise<void> => {
    await this.interactionHandler.handleNextPage(this.totalPages.value, this.loadCurrentPageData)
  }

  public handleFirstPage = async (): Promise<void> => {
    await this.interactionHandler.handleFirstPage(this.totalPages.value, this.loadCurrentPageData)
  }

  public handleLastPage = async (): Promise<void> => {
    await this.interactionHandler.handleLastPage(this.totalPages.value, this.loadCurrentPageData)
  }

  // 服务端分页方法
  public setGetCurrentTabCallback = this.interactionHandler.setGetCurrentTabCallback
  public setGetCurrentLibraryCallback = this.interactionHandler.setGetCurrentLibraryCallback
  public enableServerPagination = this.interactionHandler.enableServerPagination
  public disableServerPagination = this.interactionHandler.disableServerPagination

  // ============= 文件操作方法 =============
  public handleTagAdd = (tags: string[] | string): Promise<void> => {
    return this.fileOperations.handleTagAdd(tags, this.selectedMediaItem.value)
  }

  public handleCreateTag = this.fileOperations.handleCreateTag
  public handleDeleteTag = this.fileOperations.handleDeleteTag
  public handleCreateFolder = this.fileOperations.handleCreateFolder
  public handleDeleteFolder = this.fileOperations.handleDeleteFolder

  public handleMoveFilesToFolder = (fileIds: string[], folderId: number): Promise<void> => {
    return this.fileOperations.handleMoveFilesToFolder(fileIds, folderId, this.dataManager.mediaItems.value)
  }

  public handleDeleteFiles = (fileIds: string[]): Promise<void> => {
    return this.fileOperations.handleDeleteFiles(fileIds, (deletedIds: string[]) => {
      this.interactionHandler.selectedItems.value = this.interactionHandler.selectedItems.value.filter(id => !deletedIds.includes(id))
    })
  }

  public handleTagRemove = (tag: string): Promise<void> => {
    return this.fileOperations.handleTagRemove(tag, this.selectedMediaItem.value)
  }

  public handleFolderChange = (folderId: string): Promise<void> => {
    return this.fileOperations.handleFolderChange(folderId, this.selectedMediaItem.value)
  }

  // ============= 状态管理方法 =============
  public handleToolbarAction = async (buttonId: string): Promise<void> => {
    await this.stateManager.handleToolbarAction(buttonId, this.stateManager.handleRefresh.bind(this.stateManager))
  }

  public handleContentAction = (buttonId: string): void => {
    this.stateManager.handleContentAction(buttonId, this.dataManager.mediaItems.value, this.interactionHandler.selectedItems)
  }

  public setViewMode = this.stateManager.setViewMode
  public handleCardSizeChange = this.stateManager.handleCardSizeChange
  public handleColumnsChange = this.stateManager.handleColumnsChange
  public handleRefresh = this.stateManager.handleRefresh.bind(this.stateManager)

  // ============= 初始化方法 =============
  public initialize = this.stateManager.initialize.bind(this.stateManager)
}

/**
 * 创建HomeController实例
 * @returns HomeController实例
 */
export function useHomeController(): HomeController {
  const controller = new HomeController()

  // 自动初始化数据
  controller.initialize().catch(error => {
    console.error('Failed to initialize HomeController:', error)
  })

  return controller
}

// 导出类型
export type { FilterConditions, BreadcrumbItem, QuickFilter, PaginationPage } from './types'