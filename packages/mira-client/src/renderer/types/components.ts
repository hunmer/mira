export interface SearchComponentProps {
  modelValue?: string
  placeholder?: string
  showFilter?: boolean
  showHistory?: boolean
  disabled?: boolean
  loading?: boolean
}

export interface SearchFilter {
  key: string
  label: string
  value: any
  type: 'text' | 'select' | 'date' | 'range'
  options?: Array<{ label: string; value: any }>
}

export interface ToolbarButton {
  id: string
  label?: string
  icon: string
  tooltip?: string
  disabled?: boolean
  hidden?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  onClick?: () => void
}

export interface ToolbarGroup {
  id: string
  buttons: ToolbarButton[]
  separator?: boolean
}

export interface ToolbarComponentProps {
  groups: ToolbarGroup[]
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'minimal'
}

import type { FileInfo } from '../../shared/types'

// Extended FileInfo for components that need additional properties
export interface ExtendedFileInfo extends FileInfo {
  type?: string
  thumbnail?: string  // Alias for thumbnailUrl for backward compatibility
  created?: string   // Alias for createdAt for backward compatibility
}

export interface MediaCardComponentProps {
  item: ExtendedFileInfo
  selected?: boolean
  selectable?: boolean
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
}

export interface NavigationItem {
  id: string
  label: string
  icon: string
  iconColor?: string
  count?: number
  children?: NavigationItem[]
  active?: boolean
  expanded?: boolean
  level?: number
}

export interface FolderItem {
  id: string
  label: string
  icon: string
  iconColor?: string
  count?: number
  children?: FolderItem[]
  active?: boolean
  expanded?: boolean
  level?: number
  path?: string
  originalData?: any // 保留原始的后端数据结构
}

export interface SidebarNavComponentProps {
  items: NavigationItem[]
  showCounts?: boolean
  collapsible?: boolean
  searchable?: boolean
  draggable?: boolean
}

// 事件类型定义
export interface SearchEvents {
  'update:modelValue': [value: string]
  'search': [query: string, filters?: SearchFilter[]]
  'filter': [filters: SearchFilter[]]
  'clear': []
}

export interface ToolbarEvents {
  'button-click': [buttonId: string, button: ToolbarButton]
}

export interface MediaCardEvents {
  'click': [item: FileInfo]
  'double-click': [item: FileInfo]
  'select': [item: FileInfo, selected: boolean]
  'context-menu': [item: FileInfo, event: MouseEvent]
}

export interface SidebarNavEvents {
  'item-click': [item: NavigationItem]
  'item-select': [item: NavigationItem]
  'item-expand': [item: NavigationItem, expanded: boolean]
  'item-drag': [item: NavigationItem, target: NavigationItem]
}
