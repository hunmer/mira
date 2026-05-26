import { ref, computed } from 'vue'
import type { Library } from '@/types/mira'
import { libraryApi } from '@/api'

const libraries = ref<Library[]>([])
const selectedId = ref<string>('')
const loading = ref(false)
let loaded = false

async function loadLibraries() {
  loading.value = true
  try {
    const res = await libraryApi.list()
    const d = res.data as any
    libraries.value = Array.isArray(d) ? d : d?.data || []
    if (!selectedId.value && libraries.value.length) {
      const active = libraries.value.find(lib => lib.status === 'active')
      selectedId.value = (active || libraries.value[0]).id
    }
  } catch { /* ignore */ } finally {
    loading.value = false
    loaded = true
  }
}

function ensureLoaded() {
  if (!loaded) loadLibraries()
}

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
