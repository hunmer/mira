import { ref } from 'vue'
import { useToast } from '@/renderer/composables/useToast'
import type { PendingFile, LocalFsNode } from './types'
import { FILE_LIMITS } from './types'

/** 简易 MIME 推断（导入本地文件时按扩展名给出 type，供预览判断） */
function guessMimeFromExt(ext?: string): string {
  if (!ext) return 'application/octet-stream'
  const e = ext.toLowerCase()
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.aac': 'audio/aac',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain', '.md': 'text/markdown',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  }
  return map[e] || 'application/octet-stream'
}

export function useFileManagement() {
  const toast = useToast()

  const pendingFiles = ref<PendingFile[]>([])
  const selectedPendingIds = ref<string[]>([])
  const isDragOver = ref(false)
  const columnsPerRow = ref(8)

  function addFiles(files: File[], defaultFolderId?: string, defaultTagIds?: string[]) {
    if (files.length + pendingFiles.value.length > FILE_LIMITS.MAX_FILES_PER_BATCH) {
      toast.add({
        severity: 'warn',
        summary: '文件数量过多',
        detail: `单次最多只能上传 ${FILE_LIMITS.MAX_FILES_PER_BATCH} 个文件`,
        life: 5000
      })
      return
    }

    const totalSize =
      files.reduce((sum, f) => sum + f.size, 0) +
      pendingFiles.value.reduce((sum, pf) => sum + pf.file.size, 0)
    if (totalSize > FILE_LIMITS.MAX_TOTAL_SIZE) {
      toast.add({
        severity: 'warn',
        summary: '文件总大小过大',
        detail: `文件总大小不能超过 ${formatFileSize(FILE_LIMITS.MAX_TOTAL_SIZE)}`,
        life: 5000
      })
      return
    }

    const newFiles: PendingFile[] = files.map((file) => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      folderId: defaultFolderId,
      tags: defaultTagIds ? [...defaultTagIds] : undefined,
      preview: undefined
    }))

    pendingFiles.value.push(...newFiles)
    generatePreviews(files, newFiles)
  }

  /**
   * 从本地目录树惰性入列待上传文件（不读取字节）。
   * 构造一个仅含 name/type/size 的占位 File，真实字节在上传时通过 fs:readFileBytes 读取。
   * - localPath: 文件绝对路径（上传时按需读字节）
   * - localDirPath: 直接归属的目录 path（左栏本地树筛选用）
   */
  function addLocalFiles(nodes: LocalFsNode[], rootDir?: string) {
    // 扁平化收集所有文件节点 + 其直接父目录
    const collected: { node: LocalFsNode; dir: string | undefined }[] = []
    const walk = (list: LocalFsNode[], dir: string | undefined) => {
      for (const n of list) {
        if (!n.isDir) {
          collected.push({ node: n, dir })
        } else {
          walk(n.children || [], n.path)
        }
      }
    }
    walk(nodes, rootDir)

    if (collected.length + pendingFiles.value.length > FILE_LIMITS.MAX_FILES_PER_BATCH) {
      toast.add({
        severity: 'warn',
        summary: '文件数量过多',
        detail: `单次最多只能上传 ${FILE_LIMITS.MAX_FILES_PER_BATCH} 个文件`,
        life: 5000
      })
      return
    }

    const totalSize =
      collected.reduce((sum, c) => sum + (c.node.size || 0), 0) +
      pendingFiles.value.reduce((sum, pf) => sum + pf.file.size, 0)
    if (totalSize > FILE_LIMITS.MAX_TOTAL_SIZE) {
      toast.add({
        severity: 'warn',
        summary: '文件总大小过大',
        detail: `文件总大小不能超过 ${formatFileSize(FILE_LIMITS.MAX_TOTAL_SIZE)}`,
        life: 5000
      })
      return
    }

    const newFiles: PendingFile[] = collected.map(({ node, dir }) => {
      const type = guessMimeFromExt(node.ext)
      // 占位 File：包含 name 与 size，但无真实字节（上传前惰性读取）
      const placeholder = new File([], node.name, { type, lastModified: Date.now() })
      // 占位 File 的 size 为 0，这里手动覆盖 size 校验已通过；真实大小见 node.size
      const pending: PendingFile = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: placeholder,
        localPath: node.path,
        localDirPath: dir,
        localSize: node.size,
        preview: undefined
      }
      return pending
    })

    pendingFiles.value.push(...newFiles)
    // 异步生成预览（占位 File 的 createObjectURL 不可用，预览仅对可读类型有意义；
    // 这里跳过预览，预览在上传时读取字节后再生成会引入复杂度，暂不强求）
    pendingFiles.value = [...pendingFiles.value]
  }

  async function generatePreviews(files: File[], newFiles: PendingFile[]) {
    for (let i = 0; i < files.length; i++) {
      try {
        newFiles[i].preview = await createPreviewUrl(files[i])
        pendingFiles.value = [...pendingFiles.value]
      } catch (error) {
        console.warn(`生成文件 ${files[i].name} 预览失败:`, error)
      }
    }
  }

  async function createPreviewUrl(file: File): Promise<string | undefined> {
    if (file.type.startsWith('image/')) return URL.createObjectURL(file)
    if (file.type.startsWith('video/')) {
      const { createVideoThumbnail } = await import('@renderer/utils/fileUtils')
      return createVideoThumbnail(file, undefined, 320)
    }
    return undefined
  }

  function removePendingFile(id: string) {
    const index = pendingFiles.value.findIndex((f) => f.id === id)
    if (index === -1) return
    const file = pendingFiles.value[index]
    if (file.preview) URL.revokeObjectURL(file.preview)
    pendingFiles.value.splice(index, 1)
    selectedPendingIds.value = selectedPendingIds.value.filter((fid) => fid !== id)
  }

  function clearAllPendingFiles() {
    pendingFiles.value.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview)
    })
    pendingFiles.value = []
    selectedPendingIds.value = []
  }

  return {
    pendingFiles,
    selectedPendingIds,
    isDragOver,
    columnsPerRow,
    addFiles,
    addLocalFiles,
    removePendingFile,
    clearAllPendingFiles
  }
}

// 文件类型判断
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}
export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}
export function isDocumentFile(mimeType: string): boolean {
  return (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  )
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
