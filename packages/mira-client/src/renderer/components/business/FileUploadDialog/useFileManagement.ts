import { ref } from 'vue'
import { useToast } from '@/renderer/composables/useToast'
import type { PendingFile } from './types'
import { FILE_LIMITS } from './types'

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
