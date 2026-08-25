import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

/**
 * useSidebarCollapse —— 侧边栏折叠状态统一持久化。
 *
 * 单一 localStorage key（mira-sidebar-collapse）存 id → boolean 映射，
 * 供模块内需要跨会话记住折叠态的小节（如本地文件的两个 h3）使用。
 * 模块级（外层标题）折叠态走 LibraryPrefs 按素材库持久化，与此互不影响。
 */
const STORAGE_KEY = 'mira-sidebar-collapse'

const collapseStates = useLocalStorage<Record<string, boolean>>(STORAGE_KEY, {})

export function useSidebarCollapse(id: string, defaultValue = true) {
  return computed({
    get: () => collapseStates.value[id] ?? defaultValue,
    set: (open: boolean) => {
      collapseStates.value = { ...collapseStates.value, [id]: open }
    },
  })
}
