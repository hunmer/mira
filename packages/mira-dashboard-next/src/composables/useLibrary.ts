import { ref, computed, watch } from 'vue'
import type { Library } from '@/types/mira'
import { libraryApi } from '@/api'

const STORAGE_KEY = 'selected_library'
const libraries = ref<Library[]>([])
const selectedId = ref<string>('')
const loading = ref(false)
let loaded = false
let loadPromise: Promise<void> | null = null

/** 从地址栏读取 ?library= 参数（hash 路由参数在 hash 内：#/overview?library=x，兼容 search） */
function libraryIdFromUrl(): string {
  const hashQuery = window.location.hash.split('?')[1] || ''
  return (
    new URLSearchParams(hashQuery).get('library') ||
    new URLSearchParams(window.location.search).get('library') ||
    ''
  )
}

/** 移除地址栏中的 library 参数，避免后续手动切库后刷新被旧参数覆盖 */
function clearLibraryFromUrl() {
  const [hashPath, hashQuery = ''] = window.location.hash.split('?')
  const hashParams = new URLSearchParams(hashQuery)
  const searchParams = new URLSearchParams(window.location.search)
  if (!hashParams.has('library') && !searchParams.has('library')) return
  hashParams.delete('library')
  searchParams.delete('library')
  const hash = `${hashPath}${hashParams.toString() ? `?${hashParams}` : ''}`
  const search = searchParams.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${hash}`)
}

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
      // URL 指定的库优先（外部入口带 ?library= 跳转进来时默认选中）
      const urlLibraryId = libraryIdFromUrl()
      if (urlLibraryId && libraries.value.some(lib => lib.id === urlLibraryId)) {
        selectedId.value = urlLibraryId
        clearLibraryFromUrl()
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
