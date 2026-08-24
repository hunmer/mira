import { getMiraClient } from '@/lib/miraClient'
import type {
  BaseResponse,
  CreateLibraryRequest,
  ImportLibraryRequest,
  ImportLibraryResponse,
  LibraryImportProgress,
  Library,
  UpdateLibraryRequest,
} from 'mira-app-core/shared/sdk'

export const libraryApi = {
  list: (): Promise<Library[]> => getMiraClient().libraries().getAll(),
  get: (id: string): Promise<Library> => getMiraClient().libraries().getById(id),
  create: (data: CreateLibraryRequest): Promise<BaseResponse> => getMiraClient().libraries().create(data),
  update: (id: string, data: UpdateLibraryRequest): Promise<BaseResponse> => getMiraClient().libraries().update(id, data),
  delete: (id: string): Promise<BaseResponse> => getMiraClient().libraries().delete(id),
  toggleStatus: (id: string, status: 'active' | 'inactive') =>
    getMiraClient().libraries().setStatus(id, status),
  importFrom: (data: ImportLibraryRequest): Promise<ImportLibraryResponse> =>
    getMiraClient().libraries().importFrom(data),
  getImportProgress: (importId: string): Promise<LibraryImportProgress> =>
    getMiraClient().libraries().getImportProgress(importId),
  cancelImport: (importId: string): Promise<{ message: string }> =>
    getMiraClient().libraries().cancelImport(importId),
}
