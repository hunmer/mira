import { useI18n } from 'vue-i18n'

/**
 * 相对时间格式化（轻量实现，避免引入额外依赖）。
 * 由 SidebarHistoryModule 与 Dashboard 的 RecentFilesCard 共用。
 */
export function useRelativeTime() {
  const { t } = useI18n()

  const formatRelative = (iso?: string): string => {
    if (!iso) return ''
    const ts = new Date(iso).getTime()
    if (Number.isNaN(ts)) return ''
    const diff = Date.now() - ts
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return t('views.sidebarHistoryModule.justNow')
    const min = Math.floor(sec / 60)
    if (min < 60) return t('views.sidebarHistoryModule.minutesAgo', { n: min })
    const hr = Math.floor(min / 60)
    if (hr < 24) return t('views.sidebarHistoryModule.hoursAgo', { n: hr })
    const day = Math.floor(hr / 24)
    if (day < 7) return t('views.sidebarHistoryModule.daysAgo', { n: day })
    // 超过一周回退到日期
    return new Date(ts).toLocaleDateString('zh-CN')
  }

  return { formatRelative }
}
