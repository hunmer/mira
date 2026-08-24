import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { LocalFileEntry } from '@/shared/types'
import { entryType, mimeTypeForEntry } from './localFolderUtils'

export function useLocalGallery() {
  const api = computed(() => window.electronAPI?.fs)
  const galleryEntry = ref<LocalFileEntry | null>(null)
  const galleryPreviewUrl = ref('')
  let galleryPreviewRequestId = 0

  function revokeGalleryPreview() {
    if (galleryPreviewUrl.value) URL.revokeObjectURL(galleryPreviewUrl.value)
    galleryPreviewUrl.value = ''
  }

  watch(galleryEntry, async (entry) => {
    const requestId = ++galleryPreviewRequestId
    revokeGalleryPreview()
    if (!entry || entryType(entry) !== 'image') return
    const result = await api.value?.readFileBytes(entry.path)
    if (requestId !== galleryPreviewRequestId || !result?.success || !result.data) return
    galleryPreviewUrl.value = URL.createObjectURL(new Blob([new Uint8Array(result.data)], { type: mimeTypeForEntry(entry) }))
  })

  onBeforeUnmount(revokeGalleryPreview)

  return { galleryEntry, galleryPreviewUrl, revokeGalleryPreview }
}
