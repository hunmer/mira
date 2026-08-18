import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Queue from 'queue'
import { useToast } from '@/renderer/composables/useToast'
import { useMediaStore } from '@renderer/stores/media'
import type { PendingFile } from './types'
import { FILE_LIMITS } from './types'

export function useUploadQueue() {
  const toast = useToast()
  const mediaStore = useMediaStore()
  const { t } = useI18n()

  const uploadingFileIds = ref<Set<string>>(new Set())
  const uploadProgressMap = ref<Map<string, number>>(new Map())

  const uploadQueue = new Queue({
    concurrency: FILE_LIMITS.MAX_CONCURRENT_UPLOADS,
    timeout: 60000,
    autostart: true
  })

  const queueStats = ref({
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0
  })

  uploadQueue.addEventListener('start', updateQueueStats)
  uploadQueue.addEventListener('success', () => {
    queueStats.value.completed++
    updateQueueStats()
  })
  uploadQueue.addEventListener('error', () => {
    queueStats.value.failed++
    updateQueueStats()
  })
  uploadQueue.addEventListener('end', updateQueueStats)

  function updateQueueStats() {
    queueStats.value.pending = uploadQueue.length
    queueStats.value.running = uploadingFileIds.value.size
  }

  function getUploadProgress(id: string): number {
    return Math.round(uploadProgressMap.value.get(id) || 0)
  }

  function createUploadJob(
    pendingFile: PendingFile,
    libraryId: string,
    onFileRemoved: (id: string) => void
  ) {
    return async (callback?: (error?: Error, result?: any) => void) => {
      const metadata: Record<string, any> = {}
      if (pendingFile.folderId) metadata.folderId = pendingFile.folderId
      if (pendingFile.tags && pendingFile.tags.length > 0) metadata.tags = pendingFile.tags

      const progressInterval = setInterval(() => {
        const current = uploadProgressMap.value.get(pendingFile.id) || 0
        uploadProgressMap.value.set(pendingFile.id, Math.min(current + Math.random() * 20, 90))
      }, 200)

      try {
        // 惰性读取：导入的本地文件占位 File 无字节，上传前按路径读取真实字节
        let uploadFile: File = pendingFile.file
        if (pendingFile.localPath) {
          const bytesRes = await window.electronAPI.fs.readFileBytes(pendingFile.localPath)
          if (!bytesRes.success || !bytesRes.data) {
            throw new Error(bytesRes.message || t('business.uploadQueue.readLocalFileFailed'))
          }
          uploadFile = new File([bytesRes.data], pendingFile.file.name, {
            type: pendingFile.file.type || 'application/octet-stream',
            lastModified: Date.now()
          })
        } else if (pendingFile.sourceBytes) {
          uploadFile = new File([Uint8Array.from(pendingFile.sourceBytes)], pendingFile.file.name, {
            type: pendingFile.file.type || 'application/octet-stream',
            lastModified: Date.now()
          })
        }

        const result = await mediaStore.uploadFile(
          uploadFile,
          libraryId,
          Object.keys(metadata).length > 0 ? metadata : undefined
        )
        clearInterval(progressInterval)
        uploadProgressMap.value.set(pendingFile.id, 100)
        if (result.success) {
          onFileRemoved(pendingFile.id)
          uploadingFileIds.value.delete(pendingFile.id)
          callback?.(undefined, result)
        } else {
          throw new Error(result.error || t('business.uploadQueue.uploadFailed'))
        }
      } catch (error) {
        clearInterval(progressInterval)
        uploadingFileIds.value.delete(pendingFile.id)
        console.error('Upload error:', error)
        callback?.(error as Error)
        toast.add({
          severity: 'error',
          summary: t('business.uploadQueue.uploadFailedTitle'),
          detail: t('business.uploadQueue.uploadFailedDetail', { name: pendingFile.file.name, message: (error as Error).message }),
          life: 5000
        })
      }
    }
  }

  function enqueueFiles(
    files: PendingFile[],
    libraryId: string,
    onFileRemoved: (id: string) => void
  ) {
    files.forEach((pendingFile) => {
      uploadingFileIds.value.add(pendingFile.id)
      uploadProgressMap.value.set(pendingFile.id, 0)
      uploadQueue.push(createUploadJob(pendingFile, libraryId, onFileRemoved))
    })
  }

  return {
    uploadingFileIds,
    uploadProgressMap,
    queueStats,
    getUploadProgress,
    enqueueFiles
  }
}
