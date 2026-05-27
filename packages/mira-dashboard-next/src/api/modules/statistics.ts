import client from '../client'

export const statisticsApi = {
  upload: (libraryId: string, days?: number) => client.get(`/statistics/${libraryId}/upload`, { params: days ? { days } : {} }),
  daily: (libraryId: string, days?: number) => client.get(`/statistics/${libraryId}/upload/daily`, { params: days ? { days } : {} }),
  fileTypes: (libraryId: string, days?: number) => client.get(`/statistics/${libraryId}/file-types`, { params: days ? { days } : {} }),
  recentUploads: (libraryId: string, days = 7) => client.get(`/statistics/${libraryId}/recent-uploads`, { params: { days } }),
}
