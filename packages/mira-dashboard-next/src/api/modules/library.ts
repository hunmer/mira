import { getMiraClient } from '@/lib/miraClient'
import client from '@/api/client'
import type {
  BaseResponse,
  CreateLibraryRequest,
  ImportLibraryRequest,
  ImportLibraryResponse,
  LibraryImportProgress,
  LibraryRelocationProgress,
  RelocateLibraryResponse,
  Library,
  UpdateLibraryRequest,
} from 'mira-app-core/shared/sdk'

export interface LibraryPathCheckResult {
  /** 目录下存在 library_data.db，是已有 Mira 素材库 */
  isLibrary: boolean
  /** 该路径已注册在服务端素材库列表（含禁用库） */
  registered: boolean
  registeredId: string | null
  /** 建议的素材库名（目录名） */
  name: string
}

export const libraryApi = {
  list: (): Promise<Library[]> => getMiraClient().libraries().getAll(),
  get: (id: string): Promise<Library> => getMiraClient().libraries().getById(id),
  create: (data: CreateLibraryRequest): Promise<BaseResponse> => getMiraClient().libraries().create(data),
  update: (id: string, data: UpdateLibraryRequest): Promise<BaseResponse> => getMiraClient().libraries().update(id, data),
  relocate: (id: string, destinationPath: string): Promise<RelocateLibraryResponse> =>
    getMiraClient().libraries().relocate(id, destinationPath),
  getRelocationProgress: (id: string, relocationId: string): Promise<LibraryRelocationProgress> =>
    getMiraClient().libraries().getRelocationProgress(id, relocationId),
  delete: (id: string): Promise<BaseResponse> => getMiraClient().libraries().delete(id),
  toggleStatus: (id: string, status: 'active' | 'inactive') =>
    getMiraClient().libraries().setStatus(id, status),
  importFrom: (data: ImportLibraryRequest): Promise<ImportLibraryResponse> =>
    getMiraClient().libraries().importFrom(data),
  getImportProgress: (importId: string): Promise<LibraryImportProgress> =>
    getMiraClient().libraries().getImportProgress(importId),
  cancelImport: (importId: string): Promise<{ message: string }> =>
    getMiraClient().libraries().cancelImport(importId),
  // SDK 未覆盖 /libraries/check 端点，走 axios（同 PathTreeSelect 直连 /fs/dirs 先例）
  checkPath: (path: string): Promise<LibraryPathCheckResult> =>
    client.get('/libraries/check', { params: { path } }).then(res => res.data),
}
