import { markRaw, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/renderer/composables/useToast'
import type { PendingFile, LocalFsNode } from './types'
import { FILE_LIMITS } from './types'

type DroppedFileNode = LocalFsNode & {
  mimeType?: string
  bytes?: number[]
}

/** 简易 MIME 推断（导入本地文件时按扩展名给出 type，供预览判断） */
function guessMimeFromExt(ext?: string): string {
  if (!ext) return 'application/octet-stream'
  const normalized = ext.toLowerCase()
  const e = normalized.startsWith('.') ? normalized : `.${normalized}`
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
  const { t } = useI18n()

  const pendingFiles = ref<PendingFile[]>([])
  const selectedPendingIds = ref<string[]>([])
  const isDragOver = ref(false)
  const pendingPreviewUpdates = new Map<PendingFile, string>()
  let previewUpdateFrame: number | null = null

  function schedulePreviewUpdate(file: PendingFile, preview: string) {
    pendingPreviewUpdates.set(file, preview)
    if (previewUpdateFrame !== null) return

    previewUpdateFrame = window.requestAnimationFrame(() => {
      previewUpdateFrame = null
      let updated = 0
      for (const [pendingFile, previewUrl] of pendingPreviewUpdates) {
        if (pendingFiles.value.includes(pendingFile)) {
          pendingFile.preview = previewUrl
          updated++
        } else {
          URL.revokeObjectURL(previewUrl)
        }
      }
      pendingPreviewUpdates.clear()
      if (updated > 0) pendingFiles.value = [...pendingFiles.value]
      if (import.meta.env.DEV) {
        console.debug('[FileUploadPerf] preview batch committed', { updated })
      }
    })
  }

  function addFiles(files: File[], defaultFolderId?: string, defaultTagIds?: string[]) {
    if (files.length + pendingFiles.value.length > FILE_LIMITS.MAX_FILES_PER_BATCH) {
      toast.add({
        severity: 'warn',
        summary: t('business.fileManagement.tooManyFilesTitle'),
        detail: t('business.fileManagement.tooManyFilesDetail', { count: FILE_LIMITS.MAX_FILES_PER_BATCH }),
        life: 5000
      })
      return
    }

    const totalSize =
      files.reduce((sum, f) => sum + f.size, 0) +
      pendingFiles.value.reduce((sum, pf) => sum + (pf.localSize ?? pf.file.size), 0)
    if (totalSize > FILE_LIMITS.MAX_TOTAL_SIZE) {
      toast.add({
        severity: 'warn',
        summary: t('business.fileManagement.totalSizeTooLargeTitle'),
        detail: t('business.fileManagement.totalSizeTooLargeDetail', { size: formatFileSize(FILE_LIMITS.MAX_TOTAL_SIZE) }),
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
   * 从本地目录树入列待上传文件。
   * 磁盘文件构造占位 File 并在上传时惰性读取；浏览器文件使用随节点传入的字节。
   * - localPath: 文件绝对路径（上传时按需读字节）
   * - localDirPath: 直接归属的目录 path（左栏本地树筛选用）
   */
  function addLocalFiles(
    nodes: LocalFsNode[],
    rootDir?: string,
    defaultFolderId?: string,
    defaultTagIds?: string[]
  ) {
    // 扁平化收集所有文件节点 + 其直接父目录
    const collected: { node: DroppedFileNode; dir: string | undefined }[] = []
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
        summary: t('business.fileManagement.tooManyFilesTitle'),
        detail: t('business.fileManagement.tooManyFilesDetail', { count: FILE_LIMITS.MAX_FILES_PER_BATCH }),
        life: 5000
      })
      return
    }

    const totalSize =
      collected.reduce((sum, c) => sum + (c.node.size || 0), 0) +
      pendingFiles.value.reduce((sum, pf) => sum + (pf.localSize ?? pf.file.size), 0)
    if (totalSize > FILE_LIMITS.MAX_TOTAL_SIZE) {
      toast.add({
        severity: 'warn',
        summary: t('business.fileManagement.totalSizeTooLargeTitle'),
        detail: t('business.fileManagement.totalSizeTooLargeDetail', { size: formatFileSize(FILE_LIMITS.MAX_TOTAL_SIZE) }),
        life: 5000
      })
      return
    }

    const newFiles: PendingFile[] = collected.map(({ node, dir }) => {
      const type = node.mimeType || guessMimeFromExt(node.ext)
      // 仅创建元数据占位 File；原始字节延迟到预览/上传阶段处理，避免拖入时同步复制大文件。
      const file = new File([], node.name, { type, lastModified: Date.now() })
      const pending: PendingFile = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        folderId: defaultFolderId,
        tags: defaultTagIds ? [...defaultTagIds] : undefined,
        sourceBytes: node.bytes ? markRaw(node.bytes) : undefined,
        localPath: node.path || undefined,
        localDirPath: dir,
        localSize: node.size,
        preview: undefined
      }
      return pending
    })

    pendingFiles.value.push(...newFiles)
    pendingFiles.value = [...pendingFiles.value]
    // 后台为图片/视频生成缩略图预览（按需读取本地字节，不阻塞入列）
    generateLocalPreviews(newFiles)
  }

  /**
   * 为本地导入的图片/视频文件按需读取字节并生成预览。
   * 限制并发，避免一次性读取大量文件导致内存峰值过高。
   */
  async function generateLocalPreviews(files: PendingFile[]) {
    const PREVIEW_CONCURRENCY = 4
    let cursor = 0
    const run = async () => {
      while (cursor < files.length) {
        const i = cursor++
        const pf = files[i]
        if (!pf.file.type || (!pf.file.type.startsWith('image/') && !pf.file.type.startsWith('video/'))) {
          continue
        }
        try {
          let realFile = pf.file
          if (pf.localPath) {
            const bytesRes = await window.electronAPI.fs.readFileBytes(pf.localPath)
            if (!bytesRes.success || !bytesRes.data) continue
            realFile = new File([bytesRes.data], pf.file.name, { type: pf.file.type })
          } else if (pf.sourceBytes) {
            realFile = new File([Uint8Array.from(pf.sourceBytes)], pf.file.name, { type: pf.file.type })
          } else if (realFile.size === 0) {
            continue
          }
          const preview = await createPreviewUrl(realFile)
          if (preview) schedulePreviewUpdate(pf, preview)
        } catch (error) {
          console.warn(`生成本地文件 ${pf.file.name} 预览失败:`, error)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(PREVIEW_CONCURRENCY, files.length) }, run))
  }

  async function generatePreviews(files: File[], newFiles: PendingFile[]) {
    const PREVIEW_CONCURRENCY = 4
    let cursor = 0
    const run = async () => {
      while (cursor < files.length) {
        const i = cursor++
        try {
          const preview = await createPreviewUrl(files[i])
          if (preview) schedulePreviewUpdate(newFiles[i], preview)
        } catch (error) {
          console.warn(`生成文件 ${files[i].name} 预览失败:`, error)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(PREVIEW_CONCURRENCY, files.length) }, run))
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
