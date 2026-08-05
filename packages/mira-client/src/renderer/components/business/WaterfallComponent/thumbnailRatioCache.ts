interface CachedThumbnailRatio {
  url: string
  ratio: number
}

const ratioCache = new Map<string, CachedThumbnailRatio>()
const pendingLoads = new Map<string, Promise<number | null>>()

export function getCachedThumbnailRatio(itemId: string, url: string): number | null {
  const cached = ratioCache.get(itemId)
  return cached?.url === url ? cached.ratio : null
}

export function loadThumbnailRatio(itemId: string, url: string): Promise<number | null> {
  if (!url) return Promise.resolve(null)

  const cached = getCachedThumbnailRatio(itemId, url)
  if (cached) return Promise.resolve(cached)

  const loadKey = `${itemId}\u0000${url}`
  const pending = pendingLoads.get(loadKey)
  if (pending) return pending

  const request = new Promise<number | null>((resolve) => {
    const image = new Image()
    image.onload = () => {
      const ratio = image.naturalWidth > 0 && image.naturalHeight > 0
        ? image.naturalWidth / image.naturalHeight
        : null
      if (ratio) ratioCache.set(itemId, { url, ratio })
      resolve(ratio)
    }
    image.onerror = () => resolve(null)
    image.src = url
  }).finally(() => {
    pendingLoads.delete(loadKey)
  })

  pendingLoads.set(loadKey, request)
  return request
}
