import { computed, ref } from 'vue'
import type { LocalFileEntry } from '@/shared/types'
import { supportsNativeThumbnail } from './localFolderUtils'

export function useLocalThumbnails() {
  const api = computed(() => window.electronAPI?.fs)
  const thumbnailUrls = ref<Record<string, string>>({})
  const thumbnailCacheKeys = ref<Record<string, string>>({})
  const thumbnailRequests = new Map<string, string>()

  async function loadNativeThumbnail(entry: LocalFileEntry) {
    if (!supportsNativeThumbnail(entry) || !api.value?.getThumbnail) return
    const cacheKey = `${entry.modifiedAt}:${entry.size}`
    if (thumbnailCacheKeys.value[entry.path] === cacheKey || thumbnailRequests.get(entry.path) === cacheKey) return
    thumbnailRequests.set(entry.path, cacheKey)
    const result = await api.value.getThumbnail(entry.path, { width: 96, height: 96 })
    if (thumbnailRequests.get(entry.path) !== cacheKey) return
    thumbnailRequests.delete(entry.path)
    if (!result.success || !result.data) return
    thumbnailCacheKeys.value = { ...thumbnailCacheKeys.value, [entry.path]: cacheKey }
    thumbnailUrls.value = { ...thumbnailUrls.value, [entry.path]: result.data }
  }

  function resetThumbnails() {
    thumbnailUrls.value = {}
    thumbnailCacheKeys.value = {}
    thumbnailRequests.clear()
  }

  return { thumbnailUrls, loadNativeThumbnail, resetThumbnails }
}
