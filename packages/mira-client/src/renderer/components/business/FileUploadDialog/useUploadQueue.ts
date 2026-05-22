import { ref } from 'vue'
import Queue from 'queue'
import { useToast } from '@/renderer/composables/useToast'
import { useMediaStore } from '@renderer/stores/media'
import type { PendingFile } from './types'
import { FILE_LIMITS } from './types'

export function useUploadQueue() {
  const toast = useToast()
  const mediaStore = useMediaStore()

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
    return (callback?: (error?: Error, result?: any) => void) => {
      const metadata: Record<string, any> = {}
      if (pendingFile.folderId) metadata.folderId = pendingFile.folderId
      if (pendingFile.tags && pendingFile.tags.length > 0) metadata.tags = pendingFile.tags

      const progressInterval = setInterval(() => {
        const current = uploadProgressMap.value.get(pendingFile.id) || 0
        uploadProgressMap.value.set(pendingFile.id, Math.min(current + Math.random() * 20, 90))
      }, 200)

      mediaStore
        .uploadFile(
          pendingFile.file,
          libraryId,
          Object.keys(metadata).length > 0 ? metadata : undefined
        )
        .then((result) => {
          clearInterval(progressInterval)
          uploadProgressMap.value.set(pendingFile.id, 100)
          if (result.success) {
            onFileRemoved(pendingFile.id)
            uploadingFileIds.value.delete(pendingFile.id)
            callback?.(undefined, result)
          } else {
            throw new Error(result.error || '上传失败')
          }
        })
        .catch((error) => {
          clearInterval(progressInterval)
          uploadingFileIds.value.delete(pendingFile.id)
          console.error('Upload error:', error)
          callback?.(error)
          toast.add({
            severity: 'error',
            summary: '上传失败',
            detail: `文件 ${pendingFile.file.name}: ${error.message}`,
            life: 5000
          })
        })
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
