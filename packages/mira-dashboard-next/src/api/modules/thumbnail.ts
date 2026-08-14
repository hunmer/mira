import { getMiraClient } from '@/lib/miraClient'

export const thumbnailApi = {
  scan: (libraryId: string) => getMiraClient().thumbnails().scan(libraryId),
  progress: (libraryId: string) => getMiraClient().thumbnails().progress(libraryId),
  cancel: () => getMiraClient().thumbnails().cancel(),
  stats: (libraryId: string) => getMiraClient().thumbnails().stats(libraryId),
  generators: () => getMiraClient().thumbnails().generators(),
  sync: (libraryId: string) => getMiraClient().thumbnails().sync(libraryId),
  metadataStats: (libraryId: string) => getMiraClient().thumbnails().metadataStats(libraryId),
  metadataScan: (libraryId: string) => getMiraClient().thumbnails().metadataScan(libraryId),
  metadataProgress: (libraryId: string) => getMiraClient().thumbnails().metadataProgress(libraryId),
}
