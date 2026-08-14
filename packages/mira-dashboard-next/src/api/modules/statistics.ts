import { getMiraClient } from '@/lib/miraClient'

export const statisticsApi = {
  upload: (libraryId: string, days?: number) =>
    getMiraClient().statistics().upload(libraryId, days),
  daily: (libraryId: string, days?: number) =>
    getMiraClient().statistics().uploadDaily(libraryId, days),
  fileTypes: (libraryId: string, days?: number) =>
    getMiraClient().statistics().fileTypes(libraryId, days),
  recentUploads: (libraryId: string, days = 7) =>
    getMiraClient().statistics().recentUploads(libraryId, days),
}
