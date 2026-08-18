import type { LocalFsNode } from '../../../../shared/types'

// 复用本地文件系统节点结构
export type { LocalFsNode }

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
  /** 本地节点携带的原始字节，延迟到预览/上传时再构造 File，避免入列阶段复制大文件。 */
  sourceBytes?: number[]
  folderId?: string
  tags?: string[]
  preview?: string
  /** 本地文件绝对路径（导入文件夹场景，惰性读取字节上传） */
  localPath?: string
  /** 所属本地目录的绝对路径，用于左侧本地树筛选；未导入的文件为 undefined（归入【未分组】） */
  localDirPath?: string
  /** 本地文件真实大小（占位 File 的 size 为 0，此处保存原始大小用于展示与校验） */
  localSize?: number
}

export interface Props {
  visible?: boolean
  initialFiles?: File[]
  initialFolderId?: string
  initialTagIds?: string[]
  /** 导入的本地文件夹结构（rootPath + 递归树），用于左侧本地树展示与文件入列 */
  initialLocalTree?: { rootPath: string; tree: LocalFsNode[] }
}

export interface Emits {
  (e: 'update:visible', visible: boolean): void
}

export const FILE_LIMITS = {
  MAX_FILES_PER_BATCH: 500,
  MAX_CONCURRENT_UPLOADS: 3,
  MAX_TOTAL_SIZE: 1024 * 1024 * 1024,
}
