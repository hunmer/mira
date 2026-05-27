import { defineStore } from 'pinia'
import { ref } from 'vue'
import { libraryApi } from '@/api'
import type { Library } from '@/types/mira'
import { useAuthStore } from './auth'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const currentLibraryId = ref('')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setCurrentLibrary(id: string) {
    currentLibraryId.value = id
  }

  return { sidebarCollapsed, currentLibraryId, toggleSidebar, setCurrentLibrary }
})

/** 插件可用的 dashboard 上下文接口 */
export interface MiraDashboardContext {
  /** 获取所有素材库信息 */
  getLibraries(): Promise<Library[]>
  /** 当前登录用户信息 */
  getUser(): { id: string; username: string; role: string; [k: string]: any } | null
  /** API 基础路径 (如 /api) */
  getApiBase(): string
}

/** 挂载到 window 上供插件组件调用 */
export function getDashboardContext(): MiraDashboardContext {
  return {
    getLibraries: async () => {
      const res = await libraryApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
    getUser: () => useAuthStore().user as any,
    getApiBase: () => '/api',
  }
}
