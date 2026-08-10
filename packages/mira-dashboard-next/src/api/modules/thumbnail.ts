import client from '../client'

export const thumbnailApi = {
  scan: (libraryId: string) => client.get(`/thumb/scan`, { params: { libraryId } }),
  progress: (libraryId: string) => client.get(`/thumb/progress`, { params: { libraryId } }),
  cancel: () => client.get(`/thumb/cancel`),
  stats: (libraryId: string) => client.get(`/thumb/stats`, { params: { libraryId } }),
  generators: () => client.get(`/thumb/generators`),
  sync: (libraryId: string) => client.get(`/thumb/sync`, { params: { libraryId } }),
  metadataStats: (libraryId: string) => client.get(`/thumb/metadata/stats`, { params: { libraryId } }),
  metadataScan: (libraryId: string) => client.get(`/thumb/metadata/scan`, { params: { libraryId } }),
  metadataProgress: (libraryId: string) => client.get(`/thumb/metadata/progress`, { params: { libraryId } }),
}
