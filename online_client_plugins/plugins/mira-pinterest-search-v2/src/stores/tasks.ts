import { computed, reactive } from 'vue'
import { PinterestError, getLargeUrl, getVisualSearch, pinUrl } from '@/lib/pinterest'
import { logError, logInfo, saveToLibrary } from '@/lib/mira'
import type { MediaInput, ResultItem, SearchTask } from '@/types'

/**
 * 任务中心：左侧每张种子图是一个任务，队列并发 3 执行视觉搜索。
 * 分页游标 bookmark 按任务独立保存（修复原版全局 bookmark 在多任务并发时串页的缺陷）；
 * 无限滚动以 results[seedIndex] 作为新种子“以结果养结果”。
 */

const CONCURRENCY = 3
export const MAX_INPUT = 5

export const state = reactive({
  tasks: [] as SearchTask[],
  currentId: null as string | null,
  /** 瀑布流中悬停的结果项（快捷键 S/F/O 的作用对象） */
  hoveredKey: null as string | null,
  preview: { open: false, index: 0 },
  /** 超量输入确认弹窗（App 渲染 InputWarningDialog） */
  inputWarning: null as { count: number; resolve: (all: boolean) => void } | null,
})

export const currentTask = computed<SearchTask | null>(
  () => state.tasks.find((task) => task.id === state.currentId) || null,
)

export const previewItem = computed<ResultItem | null>(() => {
  const task = currentTask.value
  if (!task || !state.preview.open) return null
  return task.results[state.preview.index] || null
})

function byId(id: string): SearchTask | undefined {
  return state.tasks.find((task) => task.id === id)
}

function makeTask(input: MediaInput): SearchTask {
  const url = input.url || input.thumbnailURL || ''
  return {
    id: input.id || crypto.randomUUID(),
    name: input.name || '',
    ext: (input.ext || '').toLowerCase(),
    width: input.width || 0,
    height: input.height || 0,
    imageUrl: url,
    thumbUrl: input.thumbnailURL || undefined,
    state: 'waiting',
    results: [],
    seedIndex: 0,
    loadingMore: false,
    scroll: 0,
  }
}

/** 超过 5 张时弹窗确认（decline 只保留前 5 张） */
function requestConfirm(count: number): Promise<boolean> {
  return new Promise((resolve) => {
    state.inputWarning = { count, resolve }
  })
}

export function resolveInputWarning(all: boolean) {
  state.inputWarning?.resolve(all)
  state.inputWarning = null
}

/** 批量加入任务并启动搜索；返回实际加入数量 */
export async function addTasks(inputs: MediaInput[]): Promise<number> {
  let list = inputs.filter((input) => input.url || input.thumbnailURL)
  if (!list.length) return 0
  if (list.length > MAX_INPUT) {
    const all = await requestConfirm(list.length)
    if (!all) list = list.slice(0, MAX_INPUT)
  }
  const created: SearchTask[] = []
  for (const input of list) {
    const task = makeTask(input)
    if (byId(task.id)) continue // 反向搜索等场景去重
    created.push(task)
  }
  if (!created.length) return 0
  state.tasks.push(...created)
  if (!state.currentId) state.currentId = created[0].id
  created.forEach(enqueue)
  return created.length
}

/** 加入单张 dataURL 图片（拖拽 / 粘贴 / 裁剪产物） */
export function addDataTask(dataUrl: string, width = 0, height = 0, name = ''): void {
  void addTasks([{ id: crypto.randomUUID(), name, ext: 'jpg', width, height, url: dataUrl, thumbnailURL: dataUrl }])
}

// ── 搜索队列（并发 3）─────────────────────────────────────────────
const queue: string[] = []
let active = 0

function enqueue(task: SearchTask) {
  queue.push(task.id)
  pump()
}

function pump() {
  while (active < CONCURRENCY && queue.length) {
    const task = byId(queue.shift()!)
    if (!task) continue // 已被关闭
    active++
    runSearch(task, task.imageUrl, undefined, false).finally(() => {
      active--
      pump()
    })
  }
}

/**
 * 执行一次搜索并写入任务。
 * @param seed 种子图（首页 = task.imageUrl；分页 = 上一页某条结果；裁剪 = dataURL）
 */
async function runSearch(task: SearchTask, seed: string, bookmark: string | undefined, append: boolean): Promise<void> {
  if (!append) {
    task.state = 'processing'
    task.error = undefined
    task.results = []
    task.bookmark = undefined
    task.seedIndex = 0
  }
  try {
    const { results, bookmark: nextBookmark } = await getVisualSearch(seed, bookmark)
    task.results.push(...results)
    task.bookmark = nextBookmark
    task.state = 'success'
  } catch (error) {
    if (error instanceof PinterestError && error.code === 'ENOR') {
      // 无结果不算失败：success + 空列表 → 界面显示“无结果”空态
      task.state = 'success'
      if (!append) task.results = []
    } else {
      task.state = 'failed'
      task.error = error instanceof Error ? error.message : String(error)
      logError('[mira-pinterest-search-v2] search failed:', task.error)
    }
  }
}

/** 首页重试（连接错误空态的“重试”按钮） */
export function retryTask(task: SearchTask) {
  enqueue(task)
}

/** 无限滚动：取 results[seedIndex] 作为新种子 + bookmark 翻页，结果追加进瀑布流 */
export function loadMore(task: SearchTask): void {
  if (task.state !== 'success' || task.loadingMore) return
  const seed = task.results[task.seedIndex]
  if (!seed || !task.bookmark) return
  task.seedIndex++
  task.loadingMore = true
  const seedUrl = seed.largeUrl || seed.url || seed.squareUrl
  runSearch(task, seedUrl, task.bookmark, true).finally(() => {
    task.loadingMore = false
  })
}

/** 裁剪搜索：用局部区域 dataURL 重跑当前任务 */
export function cropperSearch(task: SearchTask, dataUrl: string): void {
  task.imageUrl = dataUrl
  enqueue(task)
}

/** 反向搜索：把某条结果作为新任务插到当前任务之后 */
export function reSearch(item: ResultItem): void {
  const task = makeTask({
    id: `pin-${item.id}`,
    name: item.title || item.id,
    ext: 'jpg',
    width: item.width,
    height: item.height,
    url: item.largeUrl || item.url,
    thumbnailURL: item.url,
  })
  if (byId(task.id)) {
    state.currentId = task.id
    return
  }
  const index = state.tasks.findIndex((t) => t.id === state.currentId)
  state.tasks.splice(index + 1, 0, task)
  state.currentId = task.id
  enqueue(task)
}

// ── 任务切换 / 关闭 ──────────────────────────────────────────────

export function setCurrent(id: string) {
  if (state.currentId !== id) {
    state.currentId = id
    state.preview.open = false
    state.hoveredKey = null
  }
}

/** 关闭后切换到列表中相对位置的下一个（环形），全部关闭则回空态 */
function focusNeighbor(closedIndex: number) {
  if (!state.tasks.length) {
    state.currentId = null
    return
  }
  const next = state.tasks[Math.min(closedIndex, state.tasks.length - 1)]
  state.currentId = next.id
}

export function closeTask(id: string) {
  const index = state.tasks.findIndex((task) => task.id === id)
  if (index === -1) return
  state.tasks.splice(index, 1)
  if (state.currentId === id) focusNeighbor(index)
}

export function closeOthers(id: string) {
  state.tasks = state.tasks.filter((task) => task.id === id)
  state.currentId = id
}

export function closeBelow(id: string) {
  const index = state.tasks.findIndex((task) => task.id === id)
  state.tasks = state.tasks.slice(0, index + 1)
  state.currentId = id
}

// ── 结果操作 ─────────────────────────────────────────────────────

/** 保存：探测原图后经宿主 addFromURL 写入素材库（dev mock 退化为打开原图） */
export async function saveItem(item: ResultItem): Promise<void> {
  if (item.saved) return
  try {
    const large = await getLargeUrl(item.largeUrl || item.url)
    await saveToLibrary(large, { website: pinUrl(item.id), name: item.title || undefined })
    item.saved = true
    logInfo('[mira-pinterest-search-v2] saved pin', item.id)
  } catch (error) {
    logError('[mira-pinterest-search-v2] save failed:', error)
    window.alert(`保存失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

/** 快捷键作用对象：预览态取当前预览项，否则取悬停项 */
export function activeItem(): ResultItem | null {
  if (previewItem.value) return previewItem.value
  const task = currentTask.value
  if (!task || !state.hoveredKey) return null
  return task.results.find((item) => item.key === state.hoveredKey) || null
}

// ── 大图预览 ─────────────────────────────────────────────────────

export function openPreview(item: ResultItem) {
  const task = currentTask.value
  if (!task) return
  const index = task.results.findIndex((result) => result.key === item.key)
  if (index === -1) return
  state.preview = { open: true, index }
}

export function closePreview() {
  state.preview.open = false
}

export function previewNav(direction: 1 | -1) {
  const task = currentTask.value
  if (!task || !state.preview.open || !task.results.length) return
  state.preview.index = (state.preview.index + direction + task.results.length) % task.results.length
}
