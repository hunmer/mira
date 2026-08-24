import { ref } from 'vue'
import type { LocalFileEntry } from '@/shared/types'
import { entryType, type DateFilter, type SortDirection, type SortKey, type TypeFilter } from './localFolderUtils'

const TYPE_FILTERS = ['all', 'folder', 'image', 'video', 'audio', 'document', 'archive', 'other']
const DATE_FILTERS = ['all', 'today', 'week', 'month']
const SORT_KEYS = ['name', 'modifiedAt', 'size', 'type']

export function useLocalEntryFilters(savedTabData: Record<string, unknown> = {}) {
  const savedTypeFilter = savedTabData.typeFilter
  const savedDateFilter = savedTabData.dateFilter
  const searchQuery = ref(typeof savedTabData.searchQuery === 'string' ? savedTabData.searchQuery : '')
  const typeFilter = ref<TypeFilter>(TYPE_FILTERS.includes(String(savedTypeFilter)) ? savedTypeFilter as TypeFilter : 'all')
  const dateFilter = ref<DateFilter>(DATE_FILTERS.includes(String(savedDateFilter)) ? savedDateFilter as DateFilter : 'all')
  const sortKey = ref<SortKey>(SORT_KEYS.includes(String(savedTabData.sortKey)) ? savedTabData.sortKey as SortKey : 'name')
  const sortDirection = ref<SortDirection>(savedTabData.sortDirection === 'desc' ? 'desc' : 'asc')

  function filterAndSortEntries(source: LocalFileEntry[]) {
    const query = searchQuery.value.trim().toLocaleLowerCase()
    const now = Date.now()
    const dateThreshold = dateFilter.value === 'today'
      ? new Date().setHours(0, 0, 0, 0)
      : dateFilter.value === 'week'
        ? now - 7 * 24 * 60 * 60 * 1000
        : dateFilter.value === 'month'
          ? now - 30 * 24 * 60 * 60 * 1000
          : 0

    return [...source]
      .filter((entry) => !query || entry.name.toLocaleLowerCase().includes(query))
      .filter((entry) => typeFilter.value === 'all' || entryType(entry) === typeFilter.value)
      .filter((entry) => !dateThreshold || entry.modifiedAt >= dateThreshold)
      .sort((left, right) => {
        const directoryOrder = Number(right.isDirectory) - Number(left.isDirectory)
        if (directoryOrder) return directoryOrder

        let comparison = 0
        if (sortKey.value === 'name') comparison = left.name.localeCompare(right.name)
        else if (sortKey.value === 'modifiedAt') comparison = left.modifiedAt - right.modifiedAt
        else if (sortKey.value === 'size') comparison = left.size - right.size
        else comparison = entryType(left).localeCompare(entryType(right)) || left.name.localeCompare(right.name)
        return sortDirection.value === 'asc' ? comparison : -comparison
      })
  }

  return { searchQuery, typeFilter, dateFilter, sortKey, sortDirection, filterAndSortEntries }
}
