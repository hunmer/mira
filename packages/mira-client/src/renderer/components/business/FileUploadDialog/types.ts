export interface Folder {
  id: number
  title: string
  parent_id?: number
  color?: number
  fileCount?: number
  children?: Folder[]
}

export interface Tag {
  id: number
  title: string
  color?: number
  fileCount?: number
}

export interface PendingFile {
  id: string
  file: File
  folderId?: string
  tags?: string[]
  preview?: string
}

export interface Props {
  visible?: boolean
  initialFiles?: File[]
  initialFolderId?: string
  initialTagIds?: string[]
}

export interface Emits {
  (e: 'update:visible', visible: boolean): void
}

export const FILE_LIMITS = {
  MAX_FILES_PER_BATCH: 500,
  MAX_CONCURRENT_UPLOADS: 3,
  MAX_TOTAL_SIZE: 1024 * 1024 * 1024,
}
