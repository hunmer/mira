import client from '../client'
import type { Plugin } from '@/types/mira'

export const pluginApi = {
  list: () => client.get<Plugin[]>('/plugins'),
  get: (name: string) => client.get<Plugin>(`/plugins/${name}`),
  updateStatus: (name: string, status: 'active' | 'inactive') =>
    client.put(`/plugins/${name}/status`, { status }),
  configure: (name: string, config: Record<string, any>) =>
    client.put(`/plugins/${name}/config`, config),
  install: (data: { name: string; version?: string }) =>
    client.post('/plugins/install', data),
  uninstall: (name: string) => client.delete(`/plugins/${name}`),
}
