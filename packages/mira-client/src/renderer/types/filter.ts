/**
 * 媒体过滤规则数据模型。
 *
 * 从原 `@/components/ui/volt/FilterBar.vue` 迁出，供 FilterBar 业务组件及其消费方
 * （composables / views）共用。
 */
export interface FilterRule {
  id: string
  type: 'folders' | 'tags' | 'urls' | 'title' | 'size' | 'category'
  label: string
  icon: string
  active?: boolean
  selectedValues?: (string | number)[]
  value?: string
  selectedPreset?: string
  customMin?: number
  customMax?: number
  selectedCategory?: string
  [key: string]: any
}
