export interface NotificationItem {
  id: number | string
  title: string
  subtitle: string
  time: string
  /** 折叠态卡片右侧以 RotateCcw 图标展示的次数，不传则隐藏 */
  count?: number
}
