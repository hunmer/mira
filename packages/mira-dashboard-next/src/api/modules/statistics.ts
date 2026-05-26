import client from '../client'

export const statisticsApi = {
  upload: (libraryId: string) => client.get(`/statistics/${libraryId}/upload`),
  daily: (libraryId: string) => client.get(`/statistics/${libraryId}/upload/daily`),
  fileTypes: (libraryId: string) => client.get(`/statistics/${libraryId}/file-types`),
  recentUploads: (libraryId: string, days = 7) => client.get(`/statistics/${libraryId}/recent-uploads`, { params: { days } }),
}
