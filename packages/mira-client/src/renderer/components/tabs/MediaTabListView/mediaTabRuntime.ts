export interface MediaTabCacheSnapshot<T> {
  data: T[]
  total: number
  lastUpdated: number
}

export function resolveMediaTabItems<T>(cache: MediaTabCacheSnapshot<T>, fallback: T[]): T[] {
  return cache.lastUpdated > 0 ? cache.data : fallback
}

export function mergeMediaTabFilters(
  inherentFilters: Record<string, unknown>,
  currentFilters: Record<string, unknown>
): Record<string, unknown> {
  return { ...inherentFilters, ...currentFilters }
}
