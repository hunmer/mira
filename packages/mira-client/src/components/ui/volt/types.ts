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
