/**
 * 媒体过滤规则数据模型。
 *
 * 从原 `@/components/ui/volt/FilterBar.vue` 迁出，供 FilterBar 业务组件及其消费方
 * （composables / views）共用。
 */
export interface FilterRule {
  id: string
  type: 'folders' | 'tags' | 'urls' | 'title' | 'size' | 'category' | 'metadata'
  label: string
  icon: string
  active?: boolean
  selectedValues?: (string | number)[]
  value?: string
  selectedPreset?: string
  customMin?: number
  customMax?: number
  selectedCategory?: string
  // metadata 过滤（type === 'metadata'）
  /** 当前子模式：dimension=尺寸(分辨率)，duration=时长 */
  metaField?: 'dimension' | 'duration'
  /** 预设 id 或 'custom' */
  selectedMetaPreset?: string
  /** 最长边范围（px），提交后端 */
  metaDimMin?: number
  metaDimMax?: number
  /** 时长范围（秒），提交后端 */
  metaDurMin?: number
  metaDurMax?: number
  /** 自定义输入框值（px） */
  customDimMin?: number
  customDimMax?: number
  /** 自定义输入框值（秒） */
  customDurMin?: number
  customDurMax?: number
  [key: string]: any
}
