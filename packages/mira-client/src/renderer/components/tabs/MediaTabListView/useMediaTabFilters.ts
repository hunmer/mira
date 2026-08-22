import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useMediaTabData } from '@renderer/composables/useMediaTabData'
import type { useFilters } from '@renderer/composables'
import type { useHomeController } from '@renderer/controllers/HomeController'
import type { FilterRule } from '@/renderer/types/filter'

/**
 * 筛选逻辑：FilterRule 与查询条件合并、清除、已保存过滤器应用、初始规则同步
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabFilters(deps: {
  props: {
    filters: Record<string, any>
  }
  mediaTabData: ReturnType<typeof useMediaTabData>
  homeController: ReturnType<typeof useHomeController>
  filterRules: ReturnType<typeof useFilters>['filterRules']
  baseHandleFilterChange: ReturnType<typeof useFilters>['handleFilterChange']
  baseHandleFilterClear: ReturnType<typeof useFilters>['handleFilterClear']
  fetchPageData: (page: number) => Promise<void>
}) {
  const { props, mediaTabData, homeController, filterRules, baseHandleFilterChange, baseHandleFilterClear, fetchPageData } = deps
  const { t } = useI18n()

  // 把单个 FilterRule 的当前值写入查询用的 mergedFilters（供 handleFilterChange / 应用已保存过滤器共用）
  const mergeFilterInto = (mergedFilters: Record<string, any>, filter: FilterRule) => {
    switch (filter.id) {
      case 'folders':
        if (filter.selectedValues && filter.selectedValues.length > 0) {
          mergedFilters.folders = {
            id: 'folders',
            selectedValues: filter.selectedValues,
            label: t('tabs.mediaTabListView.filterFolders')
          }
        } else {
          delete mergedFilters.folders
        }
        break
      case 'tags':
        if (filter.selectedValues && filter.selectedValues.length > 0) {
          mergedFilters.tags = {
            id: 'tags',
            selectedValues: filter.selectedValues,
            label: t('tabs.mediaTabListView.filterTagsLabel')
          }
        } else {
          delete mergedFilters.tags
        }
        break
      case 'urls':
        // urls 筛选器：检查是否有有效值（非空字符串）
        if (filter.value !== undefined && filter.value !== null && filter.value.trim() !== '') {
          mergedFilters.urls = {
            id: 'urls',
            value: filter.value.trim(),
            label: t('tabs.mediaTabListView.filterUrls')
          }
        } else {
          delete mergedFilters.urls
        }
        break
      case 'title':
        if (filter.value !== undefined && filter.value !== null && filter.value.trim() !== '') {
          mergedFilters.title = {
            id: 'title',
            value: filter.value.trim(),
            label: t('tabs.mediaTabListView.filterTitle')
          }
        } else {
          delete mergedFilters.title
        }
        break
      case 'size':
        mergedFilters.size = {
          id: 'size',
          selectedPreset: filter.selectedPreset,
          sizeMin: filter.sizeMin,
          sizeMax: filter.sizeMax,
          customMin: filter.customMin,
          customMax: filter.customMax,
          label: t('tabs.mediaTabListView.filterSize')
        }
        break
      case 'category':
        if (filter.selectedCategory && filter.selectedCategory !== '') {
          mergedFilters.category = {
            id: 'category',
            selectedCategory: filter.selectedCategory,
            label: t('tabs.mediaTabListView.filterCategory')
          }
        } else {
          delete mergedFilters.category
        }
        break
      case 'metadata': {
        const hasMetaRange = filter.metaDimMin !== undefined || filter.metaDimMax !== undefined
          || filter.metaDurMin !== undefined || filter.metaDurMax !== undefined
        if (hasMetaRange) {
          mergedFilters.metadata = {
            id: 'metadata',
            metaDimMin: filter.metaDimMin,
            metaDimMax: filter.metaDimMax,
            metaDurMin: filter.metaDurMin,
            metaDurMax: filter.metaDurMax,
            label: t('business.filterBar.metadataTitle')
          }
        } else {
          delete mergedFilters.metadata
        }
        break
      }
    }
  }

  const handleFilterChange = async (filter: FilterRule) => {
    // 获取当前的筛选器状态作为基础
    const mergedFilters: Record<string, any> = { ...mediaTabData.filters.value }

    // 保留 props.filters 中的简单键值对格式筛选器（如 folder, recycled 等）
    // 这些筛选器不是 FilterRule 格式，需要单独保留
    Object.entries(props.filters).forEach(([key, value]) => {
      // 跳过 FilterRule 格式的筛选器，只保留简单键值对
      if (value === null || typeof value !== 'object') {
        mergedFilters[key] = value
      }
    })

    // 更新变化的筛选器
    mergeFilterInto(mergedFilters, filter)

    // 用户手动改动筛选条件，取消与已保存过滤器的关联
    mediaTabData.setAppliedFilterId(null)

    // 更新MediaTabData中的筛选器
    mediaTabData.updateFilters(mergedFilters)

    // 筛选器变化时重新加载第一页数据
    await fetchPageData(1)

    // 同时调用原有逻辑以保持兼容性
    baseHandleFilterChange(filter, () => undefined, null, homeController)
  }

  const handleFilterClear = async (filter: FilterRule) => {
    // 获取当前的筛选器状态作为基础
    const mergedFilters: Record<string, any> = { ...mediaTabData.filters.value }

    // 检查是否是初始筛选器（来自 props.filters 的简单键值对格式）
    const isInitialFilter = (filterId: string) => {
      if (filterId === 'folders' && props.filters?.folder !== undefined) {
        return true
      }
      if (filterId === 'tags' && props.filters?.tags !== undefined) {
        return true
      }
      return false
    }

    // 如果是初始筛选器，恢复为初始值而不是完全清除
    if (isInitialFilter(filter.id)) {
      // 重新初始化 filterRules 显示
      initializeFilterRules()
    } else {
      // 清除非初始筛选器
      if (filter.id === 'folders') {
        delete mergedFilters.folders
      } else if (filter.id === 'tags') {
        delete mergedFilters.tags
      } else if (filter.id === 'category') {
        delete mergedFilters.category
      } else if (filter.id === 'urls') {
        delete mergedFilters.urls
      } else if (filter.id === 'size') {
        delete mergedFilters.size
      } else if (filter.id === 'metadata') {
        delete mergedFilters.metadata
      }
    }

    // 确保 props.filters 中的简单键值对格式筛选器被保留
    Object.entries(props.filters).forEach(([_key, value]) => {
      // 跳过 FilterRule 格式的筛选器，只保留简单键值对
      if (value === null || typeof value !== 'object') {
        // 保留简单格式的初始筛选器
      }
    })

    // 更新MediaTabData中的筛选器
    mediaTabData.updateFilters(mergedFilters)

    // 筛选器清除时重新加载第一页数据
    await fetchPageData(1)

    // 用户手动改动筛选条件，取消与已保存过滤器的关联
    mediaTabData.setAppliedFilterId(null)

    // 同时调用原有逻辑以保持兼容性
    baseHandleFilterClear(filter, () => undefined, null, homeController)
  }

  // 用快照（保存的过滤器规则）同步单条 FilterRule 的显示状态；snapshot 为 null 时即重置
  const applySnapshotToRule = (rule: FilterRule, snapshot: any) => {
    rule.selectedValues = snapshot?.selectedValues || []
    rule.value = snapshot?.value || ''
    rule.selectedPreset = snapshot?.selectedPreset || ''
    rule.customMin = snapshot?.customMin
    rule.customMax = snapshot?.customMax
    rule.sizeMin = snapshot?.sizeMin
    rule.sizeMax = snapshot?.sizeMax
    rule.selectedCategory = snapshot?.selectedCategory || ''
    rule.metaField = snapshot?.metaField || 'dimension'
    rule.selectedMetaPreset = snapshot?.selectedMetaPreset || ''
    rule.metaDimMin = snapshot?.metaDimMin
    rule.metaDimMax = snapshot?.metaDimMax
    rule.metaDurMin = snapshot?.metaDurMin
    rule.metaDurMax = snapshot?.metaDurMax
    rule.customDimMin = snapshot?.customDimMin
    rule.customDimMax = snapshot?.customDimMax
    rule.customDurMin = snapshot?.customDurMin
    rule.customDurMax = snapshot?.customDurMax
    rule.active = snapshot?.active || false
  }

  // 当前 tab 已应用的过滤器 id（精准匹配，供 FilterBar 展示名称；随 tab 状态持久化）
  const appliedFilterId = computed(() => mediaTabData.appliedFilterId.value)

  // 应用已保存的过滤器（整套替换当前筛选条件并重新查询）
  const handleApplySavedFilter = async (filterId: string | null, rules: FilterRule[]) => {
    const savedById = new Map(rules.map(rule => [rule.id, rule]))

    // 先重置 FilterBar 显示状态，再同步保存值，避免残留旧条件
    filterRules.value.forEach(rule => {
      const saved = savedById.get(rule.id)
      applySnapshotToRule(rule, saved ? JSON.parse(JSON.stringify(saved)) : null)
    })

    // 空基础重建查询条件，保留 props.filters 中 tab 固有的简单键值筛选（如 folder / recycled）
    const mergedFilters: Record<string, any> = {}
    Object.entries(props.filters).forEach(([key, value]) => {
      if (value === null || typeof value !== 'object') {
        mergedFilters[key] = value
      }
    })
    filterRules.value.forEach(rule => mergeFilterInto(mergedFilters, rule))

    mediaTabData.updateFilters(mergedFilters)
    await fetchPageData(1)

    mediaTabData.setAppliedFilterId(filterId || null)

    // 同步 homeController 的筛选状态
    filterRules.value.forEach(rule => {
      baseHandleFilterChange(rule, () => undefined, null, homeController)
    })
  }

  // 清除当前 tab 的全部筛选条件（保留 tab 固有的简单键值筛选，如 folder / recycled）
  const handleClearAllFilters = async () => {
    filterRules.value.forEach(rule => applySnapshotToRule(rule, null))

    const mergedFilters: Record<string, any> = {}
    Object.entries(props.filters).forEach(([key, value]) => {
      if (value === null || typeof value !== 'object') {
        mergedFilters[key] = value
      }
    })

    mediaTabData.updateFilters(mergedFilters)
    await fetchPageData(1)

    mediaTabData.setAppliedFilterId(null)

    // 同步 homeController 的筛选状态（清除语义）
    filterRules.value.forEach(rule => {
      baseHandleFilterClear(rule, () => undefined, null, homeController)
    })
  }

  // 初始化 filterRules，同步 props.filters 中的初始筛选器
  const initializeFilterRules = () => {
    // 组件实例可能被复用于不同 Tab，先清除上一个 Tab 的显示状态。
    filterRules.value.forEach(rule => applySnapshotToRule(rule, null))

    // 如果 props.filters 中有 folder，同步到 folders filterRule
    if (props.filters?.folder !== undefined) {
      const foldersFilter = filterRules.value.find(f => f.id === 'folders')
      if (foldersFilter) {
        // folder 可能是数字或 null
        const folderValue = props.filters.folder
        if (folderValue !== null) {
          foldersFilter.selectedValues = [folderValue]
          foldersFilter.active = true
        }
      }
    }

    // 如果 props.filters 中有 tags，同步到 tags filterRule
    if (props.filters?.tags !== undefined) {
      const tagsFilter = filterRules.value.find(f => f.id === 'tags')
      if (tagsFilter) {
        const tagsValue = props.filters.tags
        if (tagsValue && typeof tagsValue === 'object' && 'selectedValues' in tagsValue) {
          // 如果是 FilterRule 格式
          tagsFilter.selectedValues = tagsValue.selectedValues || []
          tagsFilter.active = (tagsFilter.selectedValues || []).length > 0
        } else if (Array.isArray(tagsValue)) {
          // 如果是数组格式
          tagsFilter.selectedValues = tagsValue
          tagsFilter.active = tagsValue.length > 0
        }
      }
    }
  }

  return {
    mergeFilterInto,
    applySnapshotToRule,
    initializeFilterRules,
    handleFilterChange,
    handleFilterClear,
    handleApplySavedFilter,
    handleClearAllFilters,
    appliedFilterId
  }
}
