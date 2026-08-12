import client from '../client'
import type { Plugin } from '@/types/mira'

export interface LibraryPlugins {
  id: string
  name: string
  description: string
  plugins: Plugin[]
}

export const pluginApi = {
  list: () => client.get<Plugin[]>('/plugins'),
  listByLibrary: () => client.get<LibraryPlugins[]>('/plugins/by-library'),
  get: (name: string, libraryId?: string) =>
    client.get<Plugin>(`/plugins/${name}`, { params: { libraryId } }),
  updateStatus: (libraryId: string, pluginName: string, status: 'active' | 'inactive') =>
    client.post('/plugins/toggle-status', { libraryId, pluginName, status }),
  configure: (name: string, config: Record<string, any>, libraryId?: string) =>
    client.put(`/plugins/${name}/config`, config, { params: { libraryId } }),
  install: (data: { name: string; version?: string; libraryId: string; registry?: string }) =>
    client.post('/plugins/install', data),
  syncMeta: (libraryId: string) =>
    client.post('/plugins/sync-meta', { libraryId }),
  uninstall: (name: string, libraryId?: string) =>
    client.delete(`/plugins/${name}`, { params: { libraryId } }),
}
