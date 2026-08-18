/**
 * FileSystem 组合式函数（由 React 版 hooks 移植）
 *
 * - useVirtualWindow：窗口化渲染，仅挂载与视口相交的条目（外加两侧 overscan），
 *   视图在数千条目下保持常数开销；窗口保持一格余量，滚动不会逐条重渲。
 * - useResolvedFileUrl：按 path 解析（预签名）URL，带跨挂载共享缓存。
 * - useSettledValue：值停止变化 delay 毫秒后才返回，画廊快速划过时只在
 *   落定时才加载重预览。
 * - createEntryTypeAhead：各视图共享的 Finder 式类型快进。
 */
import { onScopeDispose, ref, shallowRef, toValue, watchEffect, type Ref } from "vue"
import {
  isTypeAheadKey,
  TYPE_AHEAD_RESET_MS,
  type FileEntry,
  type FileSystemFileItem,
} from "./fileSystemUtils"

export function useVirtualWindow(options: {
  count: () => number
  horizontal?: boolean
  itemStride: () => number
  leadingPx?: number
  overscan?: number
  viewport: Ref<HTMLElement | null>
}): { start: Ref<number>, end: Ref<number> } {
  const overscan = options.overscan ?? 8
  const leadingPx = options.leadingPx ?? 0
  const start = ref(0)
  const end = ref(Math.min(toValue(options.count), overscan * 2))

  watchEffect((onCleanup) => {
    const viewport = options.viewport.value
    const count = toValue(options.count)
    const itemStride = toValue(options.itemStride)
    const horizontal = options.horizontal ?? false

    if (!viewport || itemStride <= 0) return

    const update = () => {
      const scrollStart =
        (horizontal ? viewport.scrollLeft : viewport.scrollTop) - leadingPx
      const viewportSize = horizontal
        ? viewport.clientWidth
        : viewport.clientHeight
      const firstVisible = Math.max(0, Math.floor(scrollStart / itemStride))
      const lastVisible = Math.min(
        count,
        Math.ceil((scrollStart + viewportSize) / itemStride)
      )

      if (
        end.value <= count &&
        start.value <= Math.max(0, firstVisible - 1) &&
        end.value >= Math.min(count, lastVisible + 1)
      ) {
        return
      }
      start.value = Math.max(0, firstVisible - overscan)
      end.value = Math.min(count, lastVisible + overscan)
    }

    update()
    viewport.addEventListener("scroll", update, { passive: true })

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)

    observer?.observe(viewport)
    onCleanup(() => {
      viewport.removeEventListener("scroll", update)
      observer?.disconnect()
    })
  })

  return { start, end }
}

// 解析文件的展示 URL：先取自身的 `url`，再走 `getFileUrl`。按 path/url 记忆
// （而非对象身份），清单变化（如缩略图陆续到达）不会对同一文件重复预签名；
// 跨挂载共享的 `cache` 让重新访问的文件同步命中，不再闪加载态。
export function useResolvedFileUrl(
  file: Ref<FileEntry | null> | (() => FileEntry | null),
  getFileUrl?: (file: FileSystemFileItem) => string | Promise<string>,
  cache?: Map<string, string>
): { isResolving: Ref<boolean>, url: Ref<string | null> } {
  const isResolving = ref(false)
  const url = ref<string | null>(null)

  watchEffect((onCleanup) => {
    const currentFile = toValue(file)
    const filePath = currentFile?.path ?? null
    const knownUrl =
      currentFile?.url ??
      (filePath ? (cache?.get(filePath) ?? null) : null) ??
      null

    if (!currentFile || knownUrl || !getFileUrl) {
      isResolving.value = false
      url.value = knownUrl
      return
    }

    let isCurrent = true

    isResolving.value = true
    url.value = null
    void Promise.resolve(getFileUrl(currentFile))
      .then((resolved) => {
        if (resolved) cache?.set(currentFile.path, resolved)
        if (isCurrent) {
          isResolving.value = false
          url.value = resolved
        }
      })
      .catch(() => {
        if (isCurrent) {
          isResolving.value = false
          url.value = null
        }
      })

    onCleanup(() => {
      isCurrent = false
    })
  })

  return { isResolving, url }
}

export function useSettledValue<T>(value: () => T, delay: number): Ref<T> {
  const settled = shallowRef(toValue(value)) as Ref<T>

  watchEffect((onCleanup) => {
    const next = toValue(value)

    if (Object.is(settled.value, next)) return

    const timeout = window.setTimeout(() => {
      settled.value = next
    }, delay)

    onCleanup(() => window.clearTimeout(timeout))
  })

  return settled
}

// 各视图共享的 Finder 式类型快进：可打印按键累积缓冲并跳到名称以之开头的
// 下一个条目，重复单字母在该前缀的条目间循环。每个视图传入自己的展示序
// 候选列表，同样的按键在任何视图落在同一个文件上。
export function createEntryTypeAhead<T extends { name: string }>() {
  const state = { buffer: "", timeout: 0 }

  onScopeDispose(() => window.clearTimeout(state.timeout))

  return (
    event: KeyboardEvent,
    entries: readonly T[],
    currentIndex: number
  ): T | null => {
    if (!isTypeAheadKey(event) || entries.length === 0) return null

    // 内嵌查看器（以及未来的输入框）保留自己的按键。
    const target = event.target

    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT")
    ) {
      return null
    }

    window.clearTimeout(state.timeout)
    state.timeout = window.setTimeout(() => {
      state.buffer = ""
    }, TYPE_AHEAD_RESET_MS)
    state.buffer += event.key.toLowerCase()

    // 重复单字母越过当前条目前进；更长缓冲原地细化匹配。
    const startIndex =
      currentIndex < 0
        ? 0
        : currentIndex + (state.buffer.length === 1 ? 1 : 0)

    for (let step = 0; step < entries.length; step += 1) {
      const entry = entries[(startIndex + step) % entries.length]

      if (entry.name.toLowerCase().startsWith(state.buffer)) {
        event.preventDefault()
        return entry
      }
    }
    event.preventDefault()
    return null
  }
}
