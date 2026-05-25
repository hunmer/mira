import client from '../client'
import type { DeviceInfo } from '@/types/mira'

export const deviceApi = {
  list: () => client.get<DeviceInfo[]>('/devices'),
  disconnect: (id: string) => client.post(`/devices/${id}/disconnect`),
}
