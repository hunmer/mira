/** 框选组件 Props(与组件内 defineProps 一致的公共类型) */
export interface SelectionBoxProps {
  /** 已选中的 item id 集合(v-model) */
  modelValue?: string[]
  /** 是否允许多选(旧布尔写法,兼容保留;与 selectMode 组合取"更严格"一方) */
  multiple?: boolean
  /** 选择模式,与 MediaBrowser 等宿主同形:'single'=单选(禁框选/修饰键加选),'multiple'=多选。缺省 multiple;设为 single 时无视 multiple 强制单选 */
  selectMode?: 'single' | 'multiple'
  /** 禁用全部选择交互 */
  disabled?: boolean
  /** 拖拽过程中实时更新选中项 */
  realtimeSelection?: boolean
  /** 双击空白清空选择 */
  doubleClickToClear?: boolean
  /** 长按延迟(ms),保留字段 */
  longPressDelay?: number
  /** 边缘自动滚动速度(px/帧) */
  scrollAutoSpeed?: number
  /** 触发自动滚动的边缘阈值(px) */
  scrollThreshold?: number
  /** 生效框选的最小尺寸(px),小于该值不视作框选 */
  minSelectionSize?: number
  enableSelectAllShortcut?: boolean
  enableClearSelectionShortcut?: boolean
  enableDeleteSelectionShortcut?: boolean
}

export interface SelectionBoxEmits {
  (e: 'update:modelValue', value: string[]): void
  (e: 'selection-start', event: MouseEvent): void
  (e: 'selection-update', selectedIds: string[]): void
  (e: 'selection-end', selectedIds: string[]): void
  (e: 'item-click', itemId: string, event: MouseEvent): void
  (e: 'clear-selection'): void
  (e: 'delete-selection', selectedIds: string[]): void
}

/** 可选元素的位置快照(容器坐标系) */
export interface SelectableRect {
  id: string
  left: number
  top: number
  right: number
  bottom: number
}
