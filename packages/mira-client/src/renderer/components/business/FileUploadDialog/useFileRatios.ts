/**
 * useFileRatios —— 待上传文件的真实图片比例预加载
 *
 * 复用 WaterfallComponent 的 thumbnailRatioCache 能力,让 FileUploadDialog 的
 * 瀑布流按图片真实比例变高(而非固定正方形)。
 *
 * 与媒体库场景的差异:待上传文件的 preview 是异步生成的 blob URL,必须等 preview
 * 就绪后才能读取 naturalWidth/Height。因此本 composable 同时监听 preview 变化。
 *
 * 策略(对齐 WaterfallComponent):
 *  1. 首屏前 N 个同步预加载,等真实比例再渲染,避免首屏布局抖动
 *  2. 其余项异步预热(限并发),完成后写入跨实例缓存供下次复用
 *  3. 未加载到比例前用稳定 fallback(hash 派生 [0.8,1.3])占位
 */
import { computed, ref, watch, type Ref } from 'vue'
import {
  getCachedThumbnailRatio,
  loadThumbnailRatio
} from '../WaterfallComponent/thumbnailRatioCache'
import { isImageFile, isVideoFile } from './useFileManagement'
import type { PendingFile } from './types'

/** ratio = naturalWidth / naturalHeight。非图片/无可读比例时为 null(用 fallback) */
export function useFileRatios(files: Ref<PendingFile[]>, columnsPerRow = 6) {
  const ratios = ref<Record<string, number>>({})
  const ready = ref(false)

  const initialPreloadCount = computed(() => Math.max(columnsPerRow * 4, 16))

  // preview 可能异步就绪:用 `${id}:${preview}` 作为依赖,preview 变化即重新尝试加载
  const fileSignatures = computed(() =>
    files.value.map((f) => `${f.id}:${f.preview ?? ''}`)
  )

  let loadVersion = 0

  const preload = async (list: PendingFile[]) => {
    const version = ++loadVersion
    ready.value = false

    // 仅图片/视频能读取真实比例
    const loadable = (f: PendingFile) =>
      f.preview && (isImageFile(f.file.type) || isVideoFile(f.file.type))

    // 1. 首屏前 N 个同步预加载
    const head = list.slice(0, initialPreloadCount.value).filter(loadable)
    const headEntries = await Promise.all(
      head.map(async (f) => {
        const ratio = await loadThumbnailRatio(f.id, f.preview!)
        return ratio ? ([f.id, ratio] as const) : null
      })
    )
    if (version !== loadVersion) return

    const published: Record<string, number> = {}
    for (const entry of headEntries) if (entry) published[entry[0]] = entry[1]

    // 合并跨实例缓存中已有的比例
    for (const f of list) {
      if (!loadable(f)) continue
      const cached = getCachedThumbnailRatio(f.id, f.preview!)
      if (cached) published[f.id] = cached
    }

    ratios.value = published
    ready.value = true

    // 2. 首屏外异步预热(限并发),仅写跨实例缓存,不扰动当前布局
    void loadRemaining(list.filter(loadable))
  }

  const loadingIds = new Set<string>()
  const CONCURRENCY = 12
  const loadRemaining = async (list: PendingFile[]) => {
    const pending = list.filter(
      (f) => f.preview && !getCachedThumbnailRatio(f.id, f.preview) && !loadingIds.has(f.id)
    )
    let cursor = 0
    const runWorker = async () => {
      while (cursor < pending.length) {
        const f = pending[cursor++]
        loadingIds.add(f.id)
        await loadThumbnailRatio(f.id, f.preview!)
        loadingIds.delete(f.id)
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, runWorker))
  }

  watch(fileSignatures, () => void preload(files.value), { immediate: true })

  /** 稳定 fallback:hash 派生 [0.8, 1.3],当前实例内不变,避免异步比例引起连续重排 */
  const fallbackRatio = (id: string): number => {
    let seed = 0
    for (let i = 0; i < id.length; i++) seed = ((seed << 5) - seed + id.charCodeAt(i)) | 0
    return (Math.abs(seed) % 50) / 100 + 0.8
  }

  /** 取某文件的比例(真实优先,其次 fallback)。非图片返回 null 表示用固定高度策略 */
  const getRatio = (file: PendingFile): number | null => {
    if (!isImageFile(file.file.type) && !isVideoFile(file.file.type)) return null
    const r = ratios.value[file.id]
    return r ?? fallbackRatio(file.id)
  }

  return { ratios, ready, getRatio }
}
