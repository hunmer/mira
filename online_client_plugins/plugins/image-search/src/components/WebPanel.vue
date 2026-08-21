<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { CircleAlert, ExternalLink, Globe, Loader2, RotateCcw } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { t } from '@/lib/i18n'
import { openExternal } from '@/lib/mira'
import { SITES } from '@/lib/sites'
import { currentTab, engineState, retryWebSearch } from '@/stores/engine'
import { currentTask } from '@/stores/tasks'

/**
 * 网页搜图中栏：每站点一个 <webview> 实例，v-show 常驻保活
 * （切站点/切回不丢页面状态）。搜索 URL 由 engine store 写入，
 * webview 首个 dom-ready 后导航（Electron 的 loadURL 等方法
 * attach 前不可用）。vite dev（纯浏览器）无 webview，显示占位。
 */

const tab = currentTab
/** Electron webview 能力探测（插件窗口 UA 含 Electron；dev 浏览器不支持） */
const webviewSupported = navigator.userAgent.includes('Electron')

const noTask = computed(() => !currentTask.value)

/** 已创建的站点 webview（visited 后渲染，:key 稳定只挂载一次） */
const createdSites = computed(() => SITES.filter((site) => engineState.visited.has(site.id)))

/** 已挂载的站点 webview 元素表（siteId → el），供 store URL 变化时驱动导航 */
const webviewEls = new Map<string, any>()

function setRef(siteId: string) {
  return (el: unknown) => {
    if (!el) {
      webviewEls.delete(siteId)
      return
    }
    webviewEls.set(siteId, el)
    attachWebview(siteId, el as HTMLElement)
  }
}

function attachWebview(siteId: string, el: HTMLElement) {
  const anyEl = el as any
  if (anyEl.__bound) return
  anyEl.__bound = true
  // 搜索引擎普遍拦截 Electron 默认 UA，伪装成常规 Chrome（attribute 形式，首航前生效）
  anyEl.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')

  anyEl.addEventListener('dom-ready', () => {
    anyEl.__ready = true
    syncUrl(siteId, anyEl)
  })
  // did-start-loading 等事件可能在 dom-ready 前派发，此时尚未 attach 的
  // getURL/isLoading 会抛 "WebView must be attached" —— 统一安全读取
  const safeUrl = () => {
    try { return anyEl.getURL?.() || '' } catch { return '' }
  }
  const trackUrl = () => {
    engineState.pages[siteId] = safeUrl()
  }
  anyEl.addEventListener('did-start-loading', trackUrl)
  anyEl.addEventListener('did-navigate', trackUrl)
  anyEl.addEventListener('did-navigate-in-page', trackUrl)
  anyEl.addEventListener('did-stop-loading', () => {
    engineState.pages[siteId] = safeUrl()
    const state = engineState.tabs[siteId]
    if (state && state.status !== 'failed') state.status = 'ready'
  })
  anyEl.addEventListener('did-fail-load', (e: any) => {
    if (e.isMainFrame === false) return // 子框架失败可忽略
    const state = engineState.tabs[siteId]
    if (state) {
      state.status = 'failed'
      state.error = e.errorDescription || `HTTP ${e.errorCode}`
    }
  })
  // 新窗口（target=_blank / window.open）默认用系统浏览器打开，不在插件内弹子窗口
  anyEl.addEventListener('new-window', (e: any) => {
    try { e.preventDefault?.() } catch { /* allowpopups 关闭时本就不弹 */ }
    if (e.url) void openExternal(e.url)
  })
  syncUrl(siteId, anyEl)
}

/**
 * 目标搜索 URL 变化 → 导航。guest 就绪前用 src attribute（Electron 依此创建
 * guest 页面并导航——没有初始 src 时 dom-ready 永不触发、loadURL 无效），
 * 就绪后用 loadURL（可覆盖站内跳转回到搜索结果页）。
 */
function syncUrl(siteId: string, anyEl: any) {
  const url = engineState.tabs[siteId]?.url
  if (!url || anyEl.__loadedUrl === url) return
  anyEl.__loadedUrl = url
  if (anyEl.__ready) anyEl.loadURL(url)
  else anyEl.setAttribute('src', url)
}

// store 写入新搜索 URL（切换任务/站点/重试）时驱动所有已挂载 webview
watch(() => engineState.tabs, () => {
  for (const [siteId, el] of webviewEls) syncUrl(siteId, el)
}, { deep: true })

// 工具栏「刷新」：重载当前站点 webview
function onRefresh() {
  const el = webviewEls.get(engineState.engine)
  if (el?.__ready) el.reload()
}
window.addEventListener('image-search:web-refresh', onRefresh)
onBeforeUnmount(() => window.removeEventListener('image-search:web-refresh', onRefresh))
</script>

<template>
  <section class="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
    <!-- 站点 webview：v-show 常驻保活，visited 后才创建；初始 about:blank 确保 guest 建立 -->
    <webview
      v-for="site in createdSites"
      :key="site.id"
      :ref="setRef(site.id)"
      v-show="engineState.engine === site.id"
      src="about:blank"
      class="h-full w-full flex-1"
    />

    <!-- 状态浮层：dev 无 webview / 无任务 / 上传中 / 加载中 / 失败 -->
    <div
      v-if="tab && (tab.status !== 'ready' || !webviewSupported)"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/80"
    >
      <div class="pointer-events-auto flex max-w-md flex-col items-center gap-3 px-6 text-center">
        <template v-if="!webviewSupported">
          <Globe class="size-8 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">{{ t('web.noWebview') }}</p>
          <Button v-if="tab.url" size="sm" variant="outline" @click="openExternal(tab.url)">
            <ExternalLink class="size-3.5" />
            {{ t('web.openExternal') }}
          </Button>
        </template>
        <template v-else-if="noTask">
          <Globe class="size-8 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">{{ t('web.noTask') }}</p>
        </template>
        <template v-else-if="tab.status === 'uploading'">
          <Loader2 class="size-8 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">{{ t('web.uploading') }}</p>
        </template>
        <template v-else-if="tab.status === 'failed'">
          <CircleAlert class="size-8 text-destructive" />
          <p class="text-sm text-destructive">{{ tab.error || t('web.loadFailed') }}</p>
          <Button size="sm" variant="outline" @click="retryWebSearch">
            <RotateCcw class="size-3.5" />
            {{ t('main.connectError.retry') }}
          </Button>
        </template>
        <template v-else-if="tab.status === 'loading'">
          <Loader2 class="size-8 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">{{ t('web.loading') }}</p>
        </template>
      </div>
    </div>
  </section>
</template>
