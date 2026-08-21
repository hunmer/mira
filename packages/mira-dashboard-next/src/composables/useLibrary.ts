import { ref, computed, watch } from 'vue'
import type { Library } from '@/types/mira'
import { libraryApi } from '@/api'

const STORAGE_KEY = 'selected_library'
const libraries = ref<Library[]>([])
const selectedId = ref<string>('')
const loading = ref(false)
let loaded = false
let loadPromise: Promise<void> | null = null

async function loadLibraries() {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    loading.value = true
    try {
      libraries.value = await libraryApi.list()
      // Drop stale URL/storage selections before applying the normal fallback.
      if (selectedId.value && !libraries.value.some(lib => lib.id === selectedId.value)) {
        selectedId.value = ''
      }
      if (!selectedId.value && libraries.value.length) {
        // 恢复顺序：localStorage 中上次选中的库 > active 库 > 第一个库
        const saved = localStorage.getItem(STORAGE_KEY)
        const matched = saved ? libraries.value.find(lib => lib.id === saved) : null
        if (matched) {
          selectedId.value = matched.id
        } else {
          const active = libraries.value.find(lib => lib.status === 'active')
          selectedId.value = (active || libraries.value[0]).id
        }
      }
      loaded = true
    } catch {
      // Allow a later layout mount to retry after a transient request failure.
      loaded = false
    } finally {
      loading.value = false
      loadPromise = null
    }
  })()

  return loadPromise
}

function ensureLoaded() {
  if (loaded) return Promise.resolve()
  return loadLibraries()
}

// 持久化当前选中的素材库到 localStorage
watch(selectedId, (id) => {
  if (id) localStorage.setItem(STORAGE_KEY, id)
})

export function useLibrary() {
  return {
    libraries,
    selectedId,
    loading,
    selectedLibrary: computed(() =>
      libraries.value.find(lib => lib.id === selectedId.value) || null,
    ),
    loadLibraries,
    ensureLoaded,
  }
}
