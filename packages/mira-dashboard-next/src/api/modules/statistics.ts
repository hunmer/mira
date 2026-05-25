import client from '../client'

export const statisticsApi = {
  upload: (libraryId: string) => client.get(`/statistics/${libraryId}/upload`),
  daily: (libraryId: string) => client.get(`/statistics/${libraryId}/upload/daily`),
}
