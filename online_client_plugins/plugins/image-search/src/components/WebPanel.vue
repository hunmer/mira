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
  // 搜索引擎普遍拦截 Electron 默认 UA，伪装成常规 Chrome
  anyEl.useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

  // loadURL 在 attach（dom-ready）前不可用：就绪后消费 pending 或直接加载
  anyEl.addEventListener('dom-ready', () => {
    anyEl.__ready = true
    syncUrl(siteId, anyEl)
  })
  anyEl.addEventListener('did-start-loading', () => {
    engineState.pages[siteId] = { loading: true, url: anyEl.getURL?.() || '' }
  })
  anyEl.addEventListener('did-stop-loading', () => {
    engineState.pages[siteId] = { loading: false, url: anyEl.getURL?.() || '' }
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
  syncUrl(siteId, anyEl)
}

/** 目标搜索 URL 变化 → 导航（未就绪则挂起，dom-ready 后重试） */
function syncUrl(siteId: string, anyEl: any) {
  const url = engineState.tabs[siteId]?.url
  if (!url || anyEl.__loadedUrl === url) return
  if (!anyEl.__ready) return
  anyEl.__loadedUrl = url
  anyEl.loadURL(url)
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
    <!-- 站点 webview：v-show 常驻保活，visited 后才创建 -->
    <webview
      v-for="site in createdSites"
      :key="site.id"
      :ref="setRef(site.id)"
      v-show="engineState.engine === site.id"
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
