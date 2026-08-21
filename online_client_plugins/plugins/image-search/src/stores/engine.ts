import { computed, reactive, watch } from 'vue'
import { getSite, toOnlineUrl } from '@/lib/sites'
import { logError } from '@/lib/mira'
import { currentTask } from './tasks'

/**
 * 搜索模式中心：右侧站点栏的当前选择。
 *   - 'pinterest'：接口搜图（ResultPanel 瀑布流，原有能力）
 *   - 站点 id：网页搜图（种子图换在线地址后按 URL 反搜，WebPanel 的 webview 加载）
 * 站点页 v-show 常驻保活，切换任务 / 切换站点时重新发起搜索。
 */

export type EngineId = 'pinterest' | string

export interface WebTabState {
  /** 'idle' 未发起 | 'uploading' 上传图床中 | 'loading' webview 加载中 | 'ready' 完成 | 'failed' 失败 */
  status: 'idle' | 'uploading' | 'loading' | 'ready' | 'failed'
  /** webview 目标地址（搜索结果页 URL） */
  url: string
  error: string
}

export const engineState = reactive({
  engine: 'pinterest' as EngineId,
  /** 已访问过的站点（懒创建 webview，切回不重载） */
  visited: new Set<string>(),
  tabs: {} as Record<string, WebTabState>,
  /** webview 实际导航状态（跟随站内跳转，供工具栏外链） */
  pages: {} as Record<string, { loading: boolean; url: string }>,
})

export const isWebMode = computed(() => engineState.engine !== 'pinterest')

function tab(siteId: string): WebTabState {
  if (!engineState.tabs[siteId]) {
    engineState.tabs[siteId] = { status: 'idle', url: '', error: '' }
  }
  return engineState.tabs[siteId]
}

export function currentTab(): WebTabState | null {
  return isWebMode.value ? tab(engineState.engine) : null
}

/** 当前 webview 实际页面地址（导航跟踪优先，回退搜索发起 URL） */
export function currentPageUrl(): string {
  if (!isWebMode.value) return ''
  return engineState.pages[engineState.engine]?.url || tab(engineState.engine).url
}

/** 切换站点：web 模式立即对当前任务发起搜索 */
export function setEngine(id: EngineId): void {
  if (engineState.engine === id) return
  engineState.engine = id
  if (id !== 'pinterest') {
    engineState.visited.add(id)
    void startWebSearch(id)
  }
}

/** 网页搜图：种子图换在线地址 → 拼 URL 模板 → webState 更新（WebPanel watch url 加载） */
async function startWebSearch(siteId: string): Promise<void> {
  const site = getSite(siteId)
  const task = currentTask.value
  const state = tab(siteId)
  if (!site || !task) {
    state.status = 'idle'
    return
  }
  state.error = ''
  state.status = 'uploading'
  try {
    // 在线地址按任务缓存；裁剪/恢复原图后由 tasks.ts 清空触发重传
    if (!task.webSeedUrl) {
      task.webSeedUrl = await toOnlineUrl(task.imageUrl)
    }
    state.url = site.searchUrl(task.webSeedUrl)
    state.status = 'loading'
  } catch (e) {
    state.status = 'failed'
    state.error = e instanceof Error ? e.message : String(e)
    logError('[image-search] web search failed:', state.error)
  }
}

/** 重试（失败态） */
export function retryWebSearch(): void {
  if (isWebMode.value) void startWebSearch(engineState.engine)
}

// 切换任务时，当前站点的 webview 重新用新任务的种子图搜索
watch(() => currentTask.value?.id, (id, old) => {
  if (id === old || !isWebMode.value) return
  void startWebSearch(engineState.engine)
})

// 种子图在线地址失效（裁剪/恢复原图）时，正在显示的站点重新上传搜索
watch(() => currentTask.value?.webSeedUrl, (value, old) => {
  if (value === old || !isWebMode.value) return
  void startWebSearch(engineState.engine)
})
