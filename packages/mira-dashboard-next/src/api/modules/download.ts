import client from '../client'

export interface DownloadProgress {
  batchId: string
  total: number
  completed: number
  failed: number
  skipped: number
  done: boolean
}

export const downloadApi = {
  start: (data: { libraryId: string; urls: string[]; folderId?: number | null; tagIds?: string[]; clientId?: string | null }) =>
    client.post<{ code: number; data: { batchId: string; total: number } }>('/download/start', data),
  progress: (batchId: string) =>
    client.get<{ code: number; data: DownloadProgress }>(`/download/progress/${batchId}`),
}
