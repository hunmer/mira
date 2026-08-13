import client from '../client'

export const fileManagerApi = {
  list(params: { libraryId: string; path?: string; offset?: number; limit?: number }) {
    return client.get('/fs/list', { params })
  },
  move(data: { libraryId: string; source: string; destination: string }) {
    return client.post('/fs/move', data)
  },
  remove(data: { libraryId: string; paths: string[] }) {
    return client.post('/fs/remove', data)
  },
  sync(libraryId: string) {
    return client.post('/fs/sync', { libraryId })
  },
  scanMissing(libraryId: string) {
    return client.get('/fs/database/missing', { params: { libraryId } })
  },
  clearMissing(libraryId: string) {
    return client.delete('/fs/database/missing', { data: { libraryId } })
  },
  findNewFiles(libraryId: string) {
    return client.post('/fs/database/new', { libraryId })
  },
  download(data: { libraryId: string; paths: string[] }) {
    return client.post('/fs/download', data, { responseType: 'blob' })
  },
}
