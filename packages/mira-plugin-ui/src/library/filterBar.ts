/**
 * FilterBar / MediaBrowser 共享的过滤规则逻辑。
 *
 * 与桌面端 useFilters / useMediaTabFilters 的字段语义保持一致,
 * 已保存过滤器的规则快照可在桌面端与插件宿主间互拷。
 */
import type { Component } from 'vue'
import { Database, Filter, Folder, Frame, Link, Tag, Type } from '@lucide/vue'
import type { FilterRule, LibraryTreeT, MediaBrowserFilters } from './types'

/** 按 type 映射 lucide 图标(桌面端 material icons 的 filter.icon 字段不再消费) */
export function filterIconOf(type: FilterRule['type']): Component {
  switch (type) {
    case 'folders':
      return Folder
    case 'tags':
      return Tag
    case 'category':
      return Filter
    case 'urls':
      return Link
    case 'title':
      return Type
    case 'size':
      return Database
    case 'metadata':
      return Frame
  }
}

/** 默认 7 项过滤规则(顺序即 FilterBar 按钮顺序,label 由 t 注入) */
export function createDefaultFilterRules(t: LibraryTreeT): FilterRule[] {
  return [
    { id: 'folders', type: 'folders', label: t('filterBar.folders'), icon: 'folder', selectedValues: [] },
    { id: 'tags', type: 'tags', label: t('filterBar.tags'), icon: 'label', selectedValues: [] },
    { id: 'category', type: 'category', label: t('filterBar.category'), icon: 'filter_list', selectedCategory: '' },
    { id: 'urls', type: 'urls', label: t('filterBar.urls'), icon: 'link', value: '' },
    { id: 'title', type: 'title', label: t('filterBar.title'), icon: 'title', value: '' },
    { id: 'size', type: 'size', label: t('filterBar.size'), icon: 'aspect_ratio', selectedPreset: '' },
    { id: 'metadata', type: 'metadata', label: t('filterBar.metadata'), icon: 'photo_size_select_large', metaField: 'dimension', selectedMetaPreset: '' },
  ]
}

/** 清空一条规则的全部筛选字段(FilterBar「清除」按钮 / MediaBrowser 重置共用) */
export function resetFilterRule(rule: FilterRule): void {
  rule.selectedValues = []
  rule.value = ''
  rule.selectedPreset = ''
  rule.customMin = undefined
  rule.customMax = undefined
  rule.sizeMin = undefined
  rule.sizeMax = undefined
  rule.selectedCategory = ''
  rule.metaField = 'dimension'
  rule.selectedMetaPreset = ''
  rule.metaDimMin = undefined
  rule.metaDimMax = undefined
  rule.metaDurMin = undefined
  rule.metaDurMax = undefined
  rule.customDimMin = undefined
  rule.customDimMax = undefined
  rule.customDurMin = undefined
  rule.customDurMax = undefined
  rule.active = false
}

/** 用快照(已保存过滤器的规则)回填一条规则;snapshot 为 null 时即重置 */
export function applySnapshotToRule(rule: FilterRule, snapshot: FilterRule | null | undefined): void {
  if (!snapshot) {
    resetFilterRule(rule)
    return
  }
  rule.selectedValues = snapshot.selectedValues || []
  rule.value = snapshot.value || ''
  rule.selectedPreset = snapshot.selectedPreset || ''
  rule.customMin = snapshot.customMin
  rule.customMax = snapshot.customMax
  rule.sizeMin = snapshot.sizeMin
  rule.sizeMax = snapshot.sizeMax
  rule.selectedCategory = snapshot.selectedCategory || ''
  rule.metaField = snapshot.metaField || 'dimension'
  rule.selectedMetaPreset = snapshot.selectedMetaPreset || ''
  rule.metaDimMin = snapshot.metaDimMin
  rule.metaDimMax = snapshot.metaDimMax
  rule.metaDurMin = snapshot.metaDurMin
  rule.metaDurMax = snapshot.metaDurMax
  rule.customDimMin = snapshot.customDimMin
  rule.customDimMax = snapshot.customDimMax
  rule.customDurMin = snapshot.customDurMin
  rule.customDurMax = snapshot.customDurMax
  rule.active = snapshot.active || false
}

/** 规则集 -> listFiles 查询条件(对齐桌面端 useMediaTabFilters.mergeFilterInto 的取值语义) */
export function rulesToFilters(rules: FilterRule[], extra: MediaBrowserFilters = {}): MediaBrowserFilters {
  const filters: MediaBrowserFilters = { ...extra }
  for (const rule of rules) {
    switch (rule.id) {
      case 'folders':
        if (rule.selectedValues?.length) filters.folders = [...rule.selectedValues]
        break
      case 'tags':
        if (rule.selectedValues?.length) filters.tags = [...rule.selectedValues]
        break
      case 'urls':
        if (rule.value?.trim()) filters.url = rule.value.trim()
        break
      case 'title':
        if (rule.value?.trim()) filters.title = rule.value.trim()
        break
      case 'size':
        if (rule.sizeMin !== undefined) filters.sizeMin = rule.sizeMin
        if (rule.sizeMax !== undefined) filters.sizeMax = rule.sizeMax
        break
      case 'category':
        if (rule.selectedCategory) filters.category = rule.selectedCategory as MediaBrowserFilters['category']
        break
      case 'metadata':
        if (rule.metaDimMin !== undefined) filters.metaDimMin = rule.metaDimMin
        if (rule.metaDimMax !== undefined) filters.metaDimMax = rule.metaDimMax
        if (rule.metaDurMin !== undefined) filters.metaDurMin = rule.metaDurMin
        if (rule.metaDurMax !== undefined) filters.metaDurMax = rule.metaDurMax
        break
    }
  }
  return filters
}

/** 是否存在生效的筛选条件(排除 sort/order;空态提示与「清除过滤器」按钮启用共用) */
export function hasActiveFilterConditions(rules: FilterRule[]): boolean {
  const { sort: _s, order: _o, ...rest } = rulesToFilters(rules)
  return Object.values(rest).some(v => v !== undefined && v !== '')
}

/**
 * MediaBrowserFilters -> 后端 getFiles 的 filters 格式(snake_case)。
 * 字段映射对齐桌面端 stores/media.ts:
 * - folders[0] -> folder(后端只支持单文件夹;null 语义"未分类"由宿主按需传)
 * - tags 原样(id 数组), url -> website 模糊匹配
 * - sizeMin/Max -> size_min/max(后端按 KB 语义 *1024,与桌面端一致原样透传)
 * - metaDim 与 metaDur 范围 -> metadata_dim 与 metadata_duration 的 min/max
 * - sort/order 后端直接 ORDER BY 字段名
 */
export function toApiFilters(filters: MediaBrowserFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (filters.title) out.title = filters.title
  if (filters.url) out.url = filters.url
  if (filters.category) out.category = filters.category
  if (filters.folders?.length) out.folder = Number(filters.folders[0])
  if (filters.tags?.length) {
    out.tags = filters.tags.map(v => {
      const n = Number(v)
      return Number.isFinite(n) ? n : v
    })
  }
  if (filters.sizeMin !== undefined) out.size_min = filters.sizeMin
  if (filters.sizeMax !== undefined) out.size_max = filters.sizeMax
  if (filters.metaDimMin !== undefined) out.metadata_dim_min = filters.metaDimMin
  if (filters.metaDimMax !== undefined) out.metadata_dim_max = filters.metaDimMax
  if (filters.metaDurMin !== undefined) out.metadata_duration_min = filters.metaDurMin
  if (filters.metaDurMax !== undefined) out.metadata_duration_max = filters.metaDurMax
  if (filters.sort) out.sort = filters.sort
  if (filters.order) out.order = filters.order
  return out
}
