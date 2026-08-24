import client from '../client'
import { getMiraClient } from '@/lib/miraClient'
import type { Plugin } from '@/types/mira'

export interface LibraryPlugins {
  id: string
  name: string
  description: string
  plugins: Plugin[]
}

export const pluginApi = {
  list: (): Promise<Plugin[]> => getMiraClient().plugins().getAll(),
  listByLibrary: () => getMiraClient().plugins().getByLibrary(),
  get: (name: string, libraryId?: string): Promise<Plugin> =>
    getMiraClient().plugins().getById(name, libraryId),
  updateStatus: (libraryId: string, pluginName: string, status: 'active' | 'inactive') =>
    getMiraClient().plugins().toggleStatus(libraryId, pluginName, status),
  disableAll: (pluginName: string) =>
    getMiraClient().plugins().disableAll(pluginName),
  configure: (name: string, config: Record<string, any>, libraryId?: string) =>
    getMiraClient().plugins().updateConfig(name, config, libraryId),
  install: (
    data: { name: string; version?: string; libraryId: string; registry?: string; npmSource?: string; proxy?: string },
    signal?: AbortSignal,
  ) => client.post('/plugins/install', data, signal ? { signal } : undefined),
  // 插件商店源代理：由后端抓取远程 JSON，规避浏览器 CORS 限制
  fetchStore: (url: string) =>
    client.get<{ code: number; data: any }>('/plugins/store', { params: { url } }),
  syncMeta: (libraryId: string) =>
    getMiraClient().plugins().syncMeta(libraryId),
  uninstall: (name: string, libraryId?: string) =>
    getMiraClient().plugins().uninstall(name, libraryId),
}
