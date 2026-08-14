import { getMiraClient } from '@/lib/miraClient'

export const deviceApi = {
  list: () => getMiraClient().devices().getAll(),
  disconnect: (id: string) => getMiraClient().devices().disconnectById(id),
  broadcast: (data: { message: string; title?: string; clientIds?: string[] }) =>
    getMiraClient().devices().broadcast(data.message, data.title, data.clientIds),
}
