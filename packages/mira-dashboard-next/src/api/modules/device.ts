import client from '../client'

export const deviceApi = {
  list: () => client.get('/devices'),
  disconnect: (id: string) => client.post(`/devices/${id}/disconnect`),
}
