import client from '../client'

export const systemApi = {
  health: () => client.get('/health'),
  stats: () => client.get('/stats'),
}
