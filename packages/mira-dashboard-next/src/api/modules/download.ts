import { getMiraClient } from '@/lib/miraClient'
import type { DownloadProgress } from 'mira-app-core/shared/sdk'

export type { DownloadProgress }

export const downloadApi = {
  start: (data: { libraryId: string; urls: string[]; folderId?: number | null; tagIds?: string[]; clientId?: string | null }) =>
    getMiraClient().files().batchImportFromUrls(data.libraryId, data.urls, {
      folderId: data.folderId ?? undefined,
      tagIds: data.tagIds,
      clientId: data.clientId ?? undefined,
    }),
  progress: (batchId: string): Promise<DownloadProgress> =>
    getMiraClient().downloads().getProgress(batchId),
}
