import { fileKindLabel } from '@/components/ui/file-system/fileSystemUtils'
import type { FileEntry, FileSystemEntry, FileSystemIndex } from '@/components/ui/file-system/fileSystemUtils'
import type { LocalFileEntry } from '@/shared/types'

export type { FileEntry, FileSystemEntry, FileSystemIndex }

export type ViewMode = 'list' | 'grid' | 'columns' | 'gallery'
export type TypeFilter = 'all' | 'folder' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'
export type DateFilter = 'all' | 'today' | 'week' | 'month'
export type SortKey = 'name' | 'modifiedAt' | 'size' | 'type'
export type SortDirection = 'asc' | 'desc'

export interface LocalFolderCrumb {
  label: string
  path: string
}

export interface LocalFolderEntryActions {
  onItemClick: (entry: LocalFileEntry, event: MouseEvent) => void
  onColumnItemClick: (entry: LocalFileEntry, levelIndex: number, event: MouseEvent) => void
  onGalleryItemClick: (entry: LocalFileEntry, event: MouseEvent) => void
  onContextMenu: (entry: LocalFileEntry) => void
  onGridWheel: (event: WheelEvent) => void
  onDragStart: (entry: LocalFileEntry, event: DragEvent) => void
  onDragEnd: () => void
  onFolderDrop: (entry: LocalFileEntry, event: DragEvent) => void
  onColumnScroll: (event: Event, path: string, total: number) => void
  onGalleryScroll: (event: Event) => void
  openEntry: (entry: LocalFileEntry) => void
  importFiles: (files: LocalFileEntry[]) => Promise<void>
  openImportTo: (entries: LocalFileEntry[]) => void
  locate: (entry: LocalFileEntry) => void
  showPicker: (operation: 'copy' | 'move', paths: string[]) => void
  removeEntries: (paths: string[]) => Promise<void>
  dragPathsFor: (entry: LocalFileEntry) => string[]
}

export function entryType(entry: LocalFileEntry) {
  if (entry.isDirectory) return 'folder' as const
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(entry.extension)) return 'image' as const
  if (/\.(mp4|mov|mkv|avi|webm)$/.test(entry.extension)) return 'video' as const
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(entry.extension)) return 'audio' as const
  if (/\.(zip|rar|7z|tar|gz)$/.test(entry.extension)) return 'archive' as const
  if (/\.(txt|md|pdf|docx?|xlsx?|pptx?|json|ya?ml|csv)$/.test(entry.extension)) return 'document' as const
  return 'other' as const
}

export function supportsNativeThumbnail(entry: LocalFileEntry) {
  return !entry.isDirectory && (entryType(entry) === 'image' || entryType(entry) === 'video')
}

export function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export function mimeTypeForEntry(entry: LocalFileEntry) {
  const extension = entry.extension.replace(/^\./, '')
  const types: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
  }
  return types[extension] || 'application/octet-stream'
}

export function normalizePath(value: string) {
  return value.replace(/[\\/]+$/, '').toLowerCase()
}

export function getFolderName(targetPath: string) {
  const trimmed = targetPath.replace(/[\\/]+$/, '')
  return trimmed.split(/[\\/]/).filter(Boolean).pop() || targetPath
}

export function getParentPath(value: string) {
  const normalized = value.replace(/[\\/]+$/, '')
  const parent = normalized.replace(/[\\/][^\\/]+$/, '')
  if (/^[A-Za-z]:$/.test(parent)) return `${parent}\\`
  return parent || '/'
}

export function pathFromInput(value: string) {
  let targetPath = value.trim()
  if ((targetPath.startsWith('"') && targetPath.endsWith('"')) || (targetPath.startsWith("'") && targetPath.endsWith("'"))) {
    targetPath = targetPath.slice(1, -1).trim()
  }
  if (/^[A-Za-z]:$/.test(targetPath)) return `${targetPath}\\`
  return targetPath.replace(/[\\/]+$/, '') || '/'
}

export function toFileSystemEntry(entry: LocalFileEntry): FileSystemEntry {
  const parentPath = getParentPath(entry.path)
  const updatedAt = new Date(entry.modifiedAt).toISOString()
  if (entry.isDirectory) {
    return {
      kind: 'folder',
      name: entry.name,
      path: entry.path,
      parentPath,
      updatedAt,
    }
  }
  return {
    kind: 'file',
    key: entry.path,
    name: entry.name,
    path: entry.path,
    parentPath,
    contentType: mimeTypeForEntry(entry),
    size: entry.size,
    updatedAt,
  }
}

export function informationKindLabel(entry: FileSystemEntry, t: (key: string) => string) {
  return entry.kind === 'folder' ? t('views.localFolder.filterFolders') : fileKindLabel(entry)
}
