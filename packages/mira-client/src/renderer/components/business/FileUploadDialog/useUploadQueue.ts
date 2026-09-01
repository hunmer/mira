import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Queue from 'queue'
import { useToast } from '@/renderer/composables/useToast'
import { useMediaStore } from '@renderer/stores/media'
import { useSettingsStore } from '@renderer/stores/settings'
import { useLibraryStore } from '@renderer/stores/library'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { environment } from '@renderer/utils'
import { useUploadHistoryStore } from '@renderer/stores/uploadHistory'
import type { PendingFile } from './types'
import { FILE_LIMITS } from './types'

/** 当前应用内所有待处理上传任务数量，供 HomeHeader 展示入口状态。 */
export const activeUploadCount = ref(0)

/** 判断绝对路径是否位于素材库根目录内（跨平台处理分隔符和大小写）。 */
function isPathInsideLibrary(filePath: string | undefined, libraryPath: string | undefined): boolean {
  if (!filePath || !libraryPath) return false
  const normalize = (value: string) => value.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
  const file = normalize(filePath)
  const root = normalize(libraryPath)
  if (!root) return false
  return root === '/' ? file.startsWith('/') : (file === root || file.startsWith(`${root}/`))
}

function isLocalServer(): boolean {
  try {
    const raw = miraSDKService.getConnectionConfig()?.serverUrl
    if (!raw) return false
    const hostname = new URL(raw).hostname.toLowerCase()
    return environment.isElectron && ['localhost', '127.0.0.1', '::1'].includes(hostname)
  } catch {
    return false
  }
}

export function useUploadQueue() {
  const toast = useToast()
  const mediaStore = useMediaStore()
  const settingsStore = useSettingsStore()
  const libraryStore = useLibraryStore()
  const uploadHistoryStore = useUploadHistoryStore()
  const { t } = useI18n()

  const uploadingFileIds = ref<Set<string>>(new Set())
  const uploadProgressMap = ref<Map<string, number>>(new Map())

  const uploadQueue = new Queue({
    // 并发数取设置-素材库的上传设置,非法值回退 FILE_LIMITS 默认
    concurrency: Math.max(1, settingsStore.settings.uploadMaxConcurrentUploads || FILE_LIMITS.MAX_CONCURRENT_UPLOADS),
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
    onFileRemoved: (id: string) => void,
    batchId: string,
    options?: { skipSameName?: boolean; enableHash?: boolean }
  ) {
    const addHistory = (status: 'success' | 'failed', error?: string, serverId?: string) => {
      const library = libraryStore.libraries.find((item) => item.id === libraryId)
      uploadHistoryStore.addUploadRecord({
        name: pendingFile.file.name,
        size: pendingFile.localSize ?? pendingFile.file.size,
        mimeType: pendingFile.file.type || 'application/octet-stream',
        libraryId,
        libraryName: library?.name || libraryId,
        status,
        localPath: pendingFile.localPath,
        serverId,
        error,
        batchId,
      })
    }
    return async (callback?: (error?: Error, result?: any) => void) => {
      const metadata: Record<string, any> = {}
      if (pendingFile.folderId) metadata.folderId = pendingFile.folderId
      if (pendingFile.tags && pendingFile.tags.length > 0) metadata.tags = pendingFile.tags

      const progressInterval = setInterval(() => {
        const current = uploadProgressMap.value.get(pendingFile.id) || 0
        uploadProgressMap.value.set(pendingFile.id, Math.min(current + Math.random() * 20, 90))
      }, 200)

      try {
        // 文件已经位于目标本地素材库目录时，服务端可直接访问该路径，完全跳过字节传输。
        const library = useLibraryStore().libraries.find((item) => item.id === libraryId)
        const canImportByPath = !options && isLocalServer() && Boolean(pendingFile.localPath) && (
          isPathInsideLibrary(pendingFile.localPath, library?.path) || Boolean(library?.path)
        )
        if (canImportByPath) {
          const result = await miraSDKService.importLocalFilePath(libraryId, pendingFile.localPath!)
          clearInterval(progressInterval)
          uploadProgressMap.value.set(pendingFile.id, 100)
          onFileRemoved(pendingFile.id)
          uploadingFileIds.value.delete(pendingFile.id)
          activeUploadCount.value = Math.max(0, activeUploadCount.value - 1)
          addHistory('success', undefined, (result.data as any)?.id ? String((result.data as any).id) : undefined)
          callback?.(undefined, result)
          return
        }

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
          Object.keys(metadata).length > 0 || pendingFile.localPath || options
            ? { ...metadata, ...(pendingFile.localPath ? { sourcePath: pendingFile.localPath } : {}), ...options }
            : undefined
        )
        clearInterval(progressInterval)
        uploadProgressMap.value.set(pendingFile.id, 100)
        if (result.success) {
          onFileRemoved(pendingFile.id)
          uploadingFileIds.value.delete(pendingFile.id)
          activeUploadCount.value = Math.max(0, activeUploadCount.value - 1)
          addHistory('success', undefined, (result.data as any)?.id ? String((result.data as any).id) : undefined)
          callback?.(undefined, result)
        } else {
          throw new Error(result.error || t('business.uploadQueue.uploadFailed'))
        }
      } catch (error) {
        clearInterval(progressInterval)
        uploadingFileIds.value.delete(pendingFile.id)
        activeUploadCount.value = Math.max(0, activeUploadCount.value - 1)
        console.error('Upload error:', error)
        addHistory('failed', (error as Error).message)
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
    onFileRemoved: (id: string) => void,
    options?: { skipSameName?: boolean; enableHash?: boolean }
  ) {
    const batchId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    files.forEach((pendingFile) => {
      uploadingFileIds.value.add(pendingFile.id)
      activeUploadCount.value++
      uploadProgressMap.value.set(pendingFile.id, 0)
      uploadQueue.push(createUploadJob(pendingFile, libraryId, onFileRemoved, batchId, options))
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
