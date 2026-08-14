import client from '../client'
import { getMiraClient } from '@/lib/miraClient'

export const systemApi = {
  health: () => getMiraClient().system().getHealth(),
  stats: () => client.get('/stats'),
}
