import { getMiraClient } from '@/lib/miraClient'

export const fileManagerApi = {
  list(params: { libraryId: string; path?: string; offset?: number; limit?: number }) {
    return getMiraClient().fs().list(params)
  },
  move(data: { libraryId: string; source: string; destination: string }) {
    return getMiraClient().fs().move(data)
  },
  remove(data: { libraryId: string; paths: string[] }) {
    return getMiraClient().fs().remove(data)
  },
  sync(libraryId: string) {
    return getMiraClient().fs().sync(libraryId)
  },
  scanMissing(libraryId: string) {
    return getMiraClient().fs().scanMissing(libraryId)
  },
  clearMissing(libraryId: string) {
    return getMiraClient().fs().clearMissing(libraryId)
  },
  findNewFiles(libraryId: string) {
    return getMiraClient().fs().findNewFiles(libraryId)
  },
  importNewFiles(libraryId: string, paths: string[]) {
    return getMiraClient().fs().importNewFiles(libraryId, paths)
  },
  deleteNewFiles(libraryId: string, paths: string[]) {
    return getMiraClient().fs().deleteNewFiles(libraryId, paths)
  },
  scanDuplicates(libraryId: string) {
    return getMiraClient().fs().scanDuplicates(libraryId)
  },
  removeDuplicateRecords(libraryId: string, fileIds: number[]) {
    return getMiraClient().fs().removeDuplicateRecords(libraryId, fileIds)
  },
  download(data: { libraryId: string; paths: string[] }) {
    return getMiraClient().fs().download(data)
  },
}
