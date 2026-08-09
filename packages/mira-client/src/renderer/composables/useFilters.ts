import { ref } from 'vue'
import type { FilterRule } from '@/renderer/types/filter'
import type { TabItem } from './useTabs'
import i18n from '../i18n'

/**
 * 筛选器功能 Composable
 */
export function useFilters() {
  // ============================================
  // 状态
  // ============================================
  const filterRules = ref<FilterRule[]>([
    {
      id: 'folders',
      type: 'folders',
      label: i18n.global.t('composables.useFilters.filterFolders'),
      icon: 'folder',
      selectedValues: []
    },
    {
      id: 'tags',
      type: 'tags',
      label: i18n.global.t('composables.useFilters.filterTags'),
      icon: 'label',
      selectedValues: []
    },
    {
      id: 'category',
      type: 'category',
      label: i18n.global.t('composables.useFilters.filterCategory'),
      icon: 'filter_list',
      selectedCategory: ''
    },
    {
      id: 'urls',
      type: 'urls',
      label: i18n.global.t('composables.useFilters.filterUrls'),
      icon: 'link',
      value: ''
    },
    {
      id: 'title',
      type: 'title',
      label: i18n.global.t('composables.useFilters.filterTitle'),
      icon: 'title',
      value: ''
    },
    {
      id: 'size',
      type: 'size',
      label: i18n.global.t('composables.useFilters.filterSize'),
      icon: 'aspect_ratio',
      selectedPreset: ''
    }
  ])

  // ============================================
  // 计算属性 - 转换数据为树形结构
  // ============================================
  
  /**
   * 文件夹树形数据
   */
  const createFolderTreeItems = (folders: any[]) => {
    return folders.map((folder: any) => ({
      id: folder.id,
      label: folder.title || folder.label || folder.name,
      icon: 'folder',
      iconColor: '#3B82F6',
      count: folder.fileCount || folder.count || 0,
      children: folder.children?.map((child: any) => ({
        id: child.id,
        label: child.title || child.label || child.name,
        icon: 'folder',
        iconColor: '#6B7280',
        count: child.fileCount || child.count || 0
      })) || []
    }))
  }

  /**
   * 标签树形数据
   */
  const createTagTreeItems = (tags: any[]) => {
    return tags.map((tag: any) => ({
      id: tag.id,
      label: tag.title || tag.label || tag.name,
      icon: 'label',
      iconColor: '#10B981',
      count: tag.fileCount || tag.count || 0
    }))
  }

  // ============================================
  // 筛选器操作方法
  // ============================================
  
  /**
   * 处理筛选器变化
   */
  const handleFilterChange = (
    filter: FilterRule,
    getCurrentTab: () => TabItem | undefined,
    updateTabFilters: ((tabId: string, filters: Record<string, FilterRule>) => void) | null,
    homeController: any
  ) => {
    console.log('筛选器变化:', filter)

    // 如果提供了updateTabFilters方法，则更新当前Tab的筛选器状态
    if (updateTabFilters) {
      const currentTab = getCurrentTab()
      if (currentTab) {
        const filters = (currentTab as any).filters || {}
        filters[filter.id] = filter
        updateTabFilters(currentTab.id, filters)
      }
    }

    // 然后调用HomeController的筛选处理方法
    homeController.handleFilterChange(filter.type, filter)
  }

  /**
   * 处理筛选器清除
   */
  const handleFilterClear = (
    filter: FilterRule,
    getCurrentTab: () => TabItem | undefined,
    clearTabFilters: ((tabId: string, filterId?: string) => void) | null,
    homeController: any
  ) => {
    console.log('清除筛选器:', filter)

    // 如果提供了clearTabFilters方法，则清除当前Tab的筛选器状态
    if (clearTabFilters) {
      const currentTab = getCurrentTab()
      if (currentTab) {
        clearTabFilters(currentTab.id, filter.id)
      }
    }

    // 然后调用HomeController的筛选清除方法
    homeController.handleFilterClear(filter.type)
  }

  /**
   * 应用筛选器到 tab
   */
  const applyFiltersToTab = (tab: TabItem, homeController: any) => {
    // 调用HomeController的方法应用筛选器
    if (tab.filters) {
      homeController.applyFiltersToTab(tab.id, tab.filters)
      
      // 同步FilterBar的显示状态
      syncFilterBarWithTab(tab)
    } else {
      // 如果Tab没有筛选器，清空所有筛选条件
      homeController.filterConditions.value = {
        folders: [],
        tags: [],
        urls: '',
        sizeMin: undefined,
        sizeMax: undefined,
        sizePreset: ''
      }
      
      // 重置FilterBar状态
      resetFilterBar()
    }
  }

  /**
   * 同步FilterBar与Tab状态
   */
  const syncFilterBarWithTab = (tab: TabItem) => {
    if (!tab.filters) return

    // 更新filterRules以反映Tab的筛选状态
    filterRules.value.forEach(rule => {
      const savedFilter = tab.filters![rule.id]
      if (savedFilter) {
        rule.selectedValues = savedFilter.selectedValues || []
        rule.value = savedFilter.value || ''
        rule.selectedPreset = savedFilter.selectedPreset || ''
        rule.customMin = savedFilter.customMin
        rule.customMax = savedFilter.customMax
        rule.selectedCategory = savedFilter.selectedCategory || ''
        rule.active = savedFilter.active || false
      }
    })
  }

  /**
   * 重置FilterBar状态
   */
  const resetFilterBar = () => {
    filterRules.value.forEach(rule => {
      rule.selectedValues = []
      rule.value = ''
      rule.selectedPreset = ''
      rule.customMin = undefined
      rule.customMax = undefined
      rule.selectedCategory = ''
      rule.active = false
    })
  }

  // ============================================
  // 内容过滤方法
  // ============================================
  
  // ============================================
  // 返回接口
  // ============================================
  return {
    // 状态
    filterRules,
    
    // 方法
    createFolderTreeItems,
    createTagTreeItems,
    handleFilterChange,
    handleFilterClear,
    applyFiltersToTab,
    syncFilterBarWithTab,
    resetFilterBar,
  }
}
