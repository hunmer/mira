import { computed, ref } from 'vue'
import { getLibraryPrefs } from '@renderer/composables/LibraryPrefs'
import type { LocalFileEntry } from '@/shared/types'

export const LOAD_MORE_THRESHOLD = 160

export function useLocalPagination() {
  const pageLimits = ref<Record<string, number>>({})
  const PAGE_SIZE = computed(() => getLibraryPrefs().pageSize)

  function pageLimit(path: string) {
    return pageLimits.value[path] ?? PAGE_SIZE.value
  }

  function paginateEntries(path: string, source: LocalFileEntry[]) {
    return source.slice(0, pageLimit(path))
  }

  function loadNextPage(path: string, total: number) {
    const currentLimit = pageLimit(path)
    if (currentLimit >= total) return
    pageLimits.value = {
      ...pageLimits.value,
      [path]: Math.min(currentLimit + PAGE_SIZE.value, total),
    }
  }

  function handleVerticalScroll(event: Event, path: string, total: number) {
    const element = event.currentTarget as HTMLElement
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight
    if (remaining <= LOAD_MORE_THRESHOLD) loadNextPage(path, total)
  }

  function clearPageLimit(path: string) {
    const nextPageLimits = { ...pageLimits.value }
    delete nextPageLimits[path]
    pageLimits.value = nextPageLimits
  }

  function clearPageLimits() {
    pageLimits.value = {}
  }

  return { PAGE_SIZE, paginateEntries, loadNextPage, handleVerticalScroll, clearPageLimit, clearPageLimits }
}
