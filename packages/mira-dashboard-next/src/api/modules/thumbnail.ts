import client from '../client'

export const thumbnailApi = {
  scan: (libraryId: string) => client.get(`/thumb/scan`, { params: { libraryId } }),
  progress: (libraryId: string) => client.get(`/thumb/progress`, { params: { libraryId } }),
  cancel: () => client.get(`/thumb/cancel`),
  stats: (libraryId: string) => client.get(`/thumb/stats`, { params: { libraryId } }),
  generators: () => client.get(`/thumb/generators`),
}
