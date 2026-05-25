import client from '../client'

export const fileApi = {
  upload: (libraryId: string, formData: FormData) =>
    client.post(`/libraries/${libraryId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadProgress: (libraryId: string, formData: FormData, onProgress: (percent: number) => void) =>
    client.post(`/libraries/${libraryId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    }),
}
