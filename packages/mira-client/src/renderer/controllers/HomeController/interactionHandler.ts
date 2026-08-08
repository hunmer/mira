import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalSearch } from '../../composables/useGlobalSearch'
import type { NavigationItem, FolderItem, SearchFilter } from '../../types/components'
import type { FileInfo } from '../../../shared/types'
import type { BreadcrumbItem, QuickFilter, PaginationPage } from './types'
import { HomeControllerUtils } from './utils'

/**
 * 用户交互处理模块
 * 负责处理点击、选择、搜索、分页等用户交互
 */
export class HomeInteractionHandler {
  private router = useRouter()

  // UI状态
  public showSearch = ref(false)
  public selectedItems = ref<string[]>([])
  public currentPage = ref(1)
  public itemsPerPage = ref(50)

  // 服务端分页状态
  public serverTotalRecords = ref(0)
  public isServerPagination = ref(false)

  // 回调函数（私有变量，用于服务端分页）

  /**
   * 分页页码
   */
  public getPaginationPages(totalPages: number): PaginationPage[] {
    const currentPageNum = this.currentPage.value
    const pages: PaginationPage[] = []

    if (totalPages <= 0) return pages
    // 如果总页数小于等于10，显示所有页码
    if (totalPages <= 10) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push({
          number: i,
          active: i === currentPageNum
        })
      }
    } else {
      // 复杂的分页逻辑：始终显示首页、末页，当前页附近的页码
      const startPage = Math.max(1, currentPageNum - 2)
      const endPage = Math.min(totalPages, currentPageNum + 2)

      // 首页
      if (startPage > 1) {
        pages.push({ number: 1, active: currentPageNum === 1 })
        if (startPage > 2) {
          pages.push({ number: -1, active: false }) // 省略号标记
        }
      }

      // 当前页附近的页码
      for (let i = startPage; i <= endPage; i++) {
        pages.push({
          number: i,
          active: i === currentPageNum
        })
      }

      // 末页
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push({ number: -1, active: false }) // 省略号标记
        }
        pages.push({ number: totalPages, active: currentPageNum === totalPages })
      }
    }

    return pages
  }

  /**
   * 总页数
   */
  public getTotalPages(filteredItemsLength: number): number {
    const result = this.isServerPagination.value
      ? Math.ceil(this.serverTotalRecords.value / this.itemsPerPage.value)
      : Math.ceil(filteredItemsLength / this.itemsPerPage.value)

    return result
  }

  /**
   * 当前页显示的媒体项目（分页后的数据）
   */
  public getPaginatedItems<T>(filteredItems: T[]): T[] {
    // 在服务端分页模式下，filteredItems已经是当前页的数据，直接返回
    if (this.isServerPagination.value) {
      return filteredItems
    }

    // 客户端分页模式下，进行切片
    const startIndex = (this.currentPage.value - 1) * this.itemsPerPage.value
    const endIndex = startIndex + this.itemsPerPage.value
    return filteredItems.slice(startIndex, endIndex)
  }

  /**
   * 是否全选（当前页）
   */
  public getIsAllSelected(paginatedItems: FileInfo[]): boolean {
    return paginatedItems.length > 0 &&
           this.selectedItems.value.length === paginatedItems.length &&
           paginatedItems.every(item => this.selectedItems.value.includes(item.id))
  }

  /**
   * 当前选中的媒体项目
   */
  public getSelectedMediaItem(mediaItems: FileInfo[]): FileInfo | undefined {
    if (this.selectedItems.value.length === 1) {
      const id = this.selectedItems.value[0]
      return mediaItems.find(item => item.id === id)
    }
    return undefined
  }

  /**
   * 检查项目是否被选中
   */
  public isItemSelected = computed(() => {
    return (itemId: string) => this.selectedItems.value.includes(itemId)
  })

  /**
   * 处理搜索
   * @param query - 搜索查询
   * @param filters - 搜索过滤器
   */
  public handleSearch = (_query: string, _filters?: SearchFilter[]): void => {
    // 搜索时重置到第一页
    this.currentPage.value = 1
    this.selectedItems.value = []
  }

  /**
   * 清除搜索
   */
  public handleClearSearch = (): void => {
    // 清空搜索状态
  }

  /**
   * 处理导航点击
   * @param item - 导航项目
   */
  public handleNavigation = (_item: NavigationItem): void => {
  }

  /**
   * 处理导航选择
   * @param item - 导航项目
   */
  public handleNavigationSelect = (_item: NavigationItem): void => {
  }

  /**
   * 处理媒体点击
   * @param item - 媒体项目
   */
  public handleMediaClick = (_item: FileInfo): void => {
  }

  /**
   * 处理媒体双击
   * @param item - 媒体项目
   */
  public handleMediaDoubleClick = (item: FileInfo): void => {
    const fileType = HomeControllerUtils.getFileTypeFromInfo(item)
    if (fileType === 'image') {
      this.router.push(`/image-preview/${item.id}`)
    } else if (fileType === 'video') {
      this.router.push(`/video-preview/${item.id}`)
    } else {
      this.router.push({
        path: '/file-preview',
        query: {
          id: item.id,
          libraryId: item.libraryId || '',
          title: item.name || '',
          path: item.path || '',
          mimeType: item.mimeType || ''
        }
      })
    }
  }

  /**
   * 处理媒体选择
   * @param item - 媒体项目
   * @param selected - 是否选中
   */
  public handleMediaSelect = (item: FileInfo, selected: boolean): void => {
    if (selected) {
      if (!this.selectedItems.value.includes(item.id)) {
        this.selectedItems.value.push(item.id)
      }
    } else {
      this.selectedItems.value = this.selectedItems.value.filter(id => id !== item.id)
    }
    this.selectedItems.value = [...this.selectedItems.value]
  }

  /**
   * 处理媒体右键菜单
   * @param item - 媒体项目
   * @param event - 鼠标事件
   */
  public handleMediaContextMenu = (_item: FileInfo, _event: MouseEvent): void => {
  }

  /**
   * 处理文件夹选择
   * @param folder - 文件夹项目
   */
  public handleFolderSelect = (_folder: FolderItem): void => {
  }

  /**
   * 处理文件夹展开/收起
   * @param folder - 文件夹项目
   * @param expanded - 是否展开
   */
  public handleFolderExpand = (_folder: FolderItem, _expanded: boolean): void => {
  }

  /**
   * 处理面包屑点击
   * @param crumb - 面包屑项目
   */
  public handleBreadcrumbClick = (_crumb: BreadcrumbItem): void => {
  }

  /**
   * 切换搜索显示
   */
  public toggleSearch = async (): Promise<void> => {
    const isDesktop = !!(window as any).electronAPI

    if (isDesktop) {
      try {
        await (window as any).electronAPI.searchWindow.toggle()
      } catch (error) {
        this.showSearchDialog()
      }
    } else {
      this.showSearchDialog()
    }
  }

  /**
   * 显示搜索对话框（降级方案）
   */
  private showSearchDialog = (): void => {
    try {
      const { toggleSearchDialog } = useGlobalSearch()
      toggleSearchDialog()
    } catch (error) {
      this.showSearch.value = !this.showSearch.value
    }
  }

  /**
   * 处理全选
   */
  public handleSelectAll = (paginatedItems: FileInfo[], isAllSelected: boolean): void => {
    if (isAllSelected) {
      this.selectedItems.value = []
    } else {
      this.selectedItems.value = paginatedItems.map(item => item.id)
    }
  }

  /**
   * 处理快速过滤器
   * @param filter - 过滤器
   */
  public handleQuickFilter = (filter: QuickFilter): void => {
    filter.active = !filter.active

    this.currentPage.value = 1
    this.selectedItems.value = []
  }

  /**
   * 处理分页变化
   * @param page - 页码
   * @param totalPages - 总页数
   * @param loadCurrentPageData - 加载当前页数据的函数
   */
  public handlePageChange = async (page: number, totalPages: number, loadCurrentPageData?: () => Promise<void>): Promise<void> => {
    if (page >= 1 && page <= totalPages) {
      this.currentPage.value = page
      this.selectedItems.value = []

      if (this.isServerPagination.value && loadCurrentPageData) {
        await loadCurrentPageData()
      }
    }
  }

  /**
   * 跳转到上一页
   */
  public handlePreviousPage = async (totalPages: number, loadCurrentPageData?: () => Promise<void>): Promise<void> => {
    if (this.currentPage.value > 1) {
      await this.handlePageChange(this.currentPage.value - 1, totalPages, loadCurrentPageData)
    }
  }

  /**
   * 跳转到下一页
   */
  public handleNextPage = async (totalPages: number, loadCurrentPageData?: () => Promise<void>): Promise<void> => {
    if (this.currentPage.value < totalPages) {
      await this.handlePageChange(this.currentPage.value + 1, totalPages, loadCurrentPageData)
    }
  }

  /**
   * 跳转到第一页
   */
  public handleFirstPage = async (totalPages: number, loadCurrentPageData?: () => Promise<void>): Promise<void> => {
    await this.handlePageChange(1, totalPages, loadCurrentPageData)
  }

  /**
   * 跳转到最后一页
   */
  public handleLastPage = async (totalPages: number, loadCurrentPageData?: () => Promise<void>): Promise<void> => {
    await this.handlePageChange(totalPages, totalPages, loadCurrentPageData)
  }

  /**
   * 设置获取当前Tab的回调函数
   */
  public setGetCurrentTabCallback = (_callback: () => any): void => {
  }

  /**
   * 设置获取当前库的回调函数
   */
  public setGetCurrentLibraryCallback = (_callback: () => any): void => {
  }

  /**
   * 启用服务端分页模式
   */
  public enableServerPagination = (totalRecords: number = 0): void => {
    this.isServerPagination.value = true
    this.serverTotalRecords.value = totalRecords
  }

  /**
   * 禁用服务端分页模式
   */
  public disableServerPagination = (): void => {
    this.isServerPagination.value = false
    this.serverTotalRecords.value = 0
  }

  /**
   * 初始化状态监听器
   */
  public initializeStateWatchers(): void {
    // 监听serverTotalRecords的变化
    watch(this.serverTotalRecords, () => {
    })

    // 监听isServerPagination的变化
    watch(this.isServerPagination, () => {
    })
  }
}
