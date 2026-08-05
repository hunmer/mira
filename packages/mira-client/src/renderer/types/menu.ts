/**
 * 上下文菜单 / 下拉菜单项数据模型。
 *
 * 从原 `@/components/ui/volt/types` 迁出，供业务层（右键菜单、下拉菜单等）共用。
 * 与 shadcn-vue 的 DropdownMenu 组件配合使用时，可映射为 DropdownMenuItem / DropdownMenuSeparator / DropdownMenuSub。
 */
export interface MenuItem {
  label?: string
  icon?: string
  shortcut?: string
  badge?: string | number
  command?: () => void
  url?: string
  target?: string
  separator?: boolean
  disabled?: boolean
  visible?: boolean
  items?: MenuItem[]
  style?: any
  class?: any
}
