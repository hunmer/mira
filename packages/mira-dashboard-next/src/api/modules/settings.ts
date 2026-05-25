import client from '../client'
import type { ServerSettings } from '@/types/mira'

export const settingsApi = {
  get: () => client.get<{ code: number; data: ServerSettings }>('/settings'),
  update: (data: Partial<ServerSettings>) => client.put<{ code: number; data: ServerSettings }>('/settings', data),
}
