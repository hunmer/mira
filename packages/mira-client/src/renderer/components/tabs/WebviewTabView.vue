<template>
  <div v-if="url" class="flex h-full w-full flex-col">
    <!-- 简单导航栏：后退 / 前进 / 刷新 + 地址栏 -->
    <div class="relative flex shrink-0 items-center gap-0.5 border-b bg-background px-1.5 py-1">
      <button type="button" class="nav-btn" :disabled="!canGoBack" :title="t('views.webview.back')"
        @click="webviewRef?.goBack()">
        <span class="material-icons text-base">arrow_back</span>
      </button>
      <button type="button" class="nav-btn" :disabled="!canGoForward" :title="t('views.webview.forward')"
        @click="webviewRef?.goForward()">
        <span class="material-icons text-base">arrow_forward</span>
      </button>
      <button type="button" class="nav-btn" :class="{ 'text-primary': loading }" :title="t('views.webview.reload')"
        @click="webviewRef?.reload()">
        <span class="material-icons text-base" :class="{ 'nav-spin': loading }">refresh</span>
      </button>
      <form class="mx-1 min-w-0 flex-1" @submit.prevent="navigate">
        <input v-model="address" type="text" spellcheck="false"
          class="h-7 w-full rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary/50 focus:bg-background"
          :placeholder="t('views.webview.addressPlaceholder')" @focus="($event.target as HTMLInputElement).select()" />
      </form>
      <!-- 加载进度条：不定进度循环滑块，紧贴导航栏底边 -->
      <div v-if="loading" class="nav-progress absolute bottom-0 left-0 h-0.5 w-full overflow-hidden">
        <div class="nav-progress-bar h-full w-1/4 bg-primary" />
      </div>
    </div>
    <!-- allowpopups 让 target=_blank/window.open 请求进入主进程 setWindowOpenHandler 拦截链 -->
    <webview ref="webviewRef" :src="url" :partition="resolvedPartition" :webpreferences="webPreferences" allowpopups class="min-h-0 w-full flex-1"
      @dom-ready="onDomReady" @did-navigate="onNavigate" @did-navigate-in-page="onNavigate"
      @did-start-loading="loading = true" @did-stop-loading="onStopLoading" @page-title-updated="onPageTitleUpdated" />
  </div>
  <div v-else class="flex h-full items-center justify-center text-muted-foreground">Invalid URL</div>
</template>

<script setup lang="ts">
/**
 * Webview Tab 内容：简单浏览器外壳（导航栏 + 地址栏 + 加载进度条）+ <webview> 页面。
 *
 * 新链接（target=_blank / window.open）由主进程在 web-contents-created 时机统一拦截，
 * 让当前 webview 直接 loadURL（渲染进程 dom-ready 方案会因 KeepAlive 重建 guest 失效）。
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { normalizeWebviewPartition } from '../../../shared/webview'

const props = withDefaults(defineProps<{
  url: string
  /** webview 会话隔离 partition（persist:xxx）；空串用默认会话。仅在 webview 创建时生效 */
  partition?: string
  /** 加载后是否静音 */
  muted?: boolean
  /** 关闭 webSecurity（file:// 本地插件页面 fetch 相对路径资源需要）。仅在 webview 创建时生效 */
  disableWebSecurity?: boolean
}>(), {
  partition: '',
  muted: false,
  disableWebSecurity: false,
})
const emit = defineEmits<{
  /** 页面标题更新（供外层同步 tab label） */
  (e: 'title-updated', title: string): void
  /** 页面站点图标更新（供外层同步 tab icon） */
  (e: 'icon-updated', icon: string): void
  /** 页面 URL 更新（供外层按设置保存到 tabData.lastUrl） */
  (e: 'url-updated', url: string): void
}>()

const { t } = useI18n()
const webviewRef = ref<any>(null)
const address = ref(props.url || '')
const canGoBack = ref(false)
const canGoForward = ref(false)
const loading = ref(false)
let lastFaviconUrl = ''
const resolvedPartition = computed(() => normalizeWebviewPartition(props.partition))
const webPreferences = computed(() => (props.disableWebSecurity ? 'webSecurity=no' : undefined))

watch(() => props.url, (v) => { address.value = v || '' }, { immediate: true })

function onDomReady() {
  // 静音设置在页面加载完成后应用（audio mute 是 webContents 级别，导航后保持）
  if (props.muted) {
    try { webviewRef.value?.setAudioMuted?.(true) } catch { /* webContents 未就绪时忽略 */ }
  }
  syncNavState()
}

function onNavigate(event: Event) {
  const detail = (event as any).detail
  const nextUrl = (event as any).url ?? detail?.url
  if (nextUrl) {
    address.value = nextUrl
    syncFavicon(nextUrl)
    emit('url-updated', nextUrl)
  }
  syncNavState()
}

function onStopLoading() {
  loading.value = false
  syncNavState()
}

function syncNavState() {
  const wv = webviewRef.value
  if (!wv) return
  try {
    const currentUrl = typeof wv.getURL === 'function' ? wv.getURL() : ''
    if (currentUrl) {
      address.value = currentUrl
      syncFavicon(currentUrl)
    }
  } catch { /* webContents 未就绪时忽略 */ }
  try {
    canGoBack.value = wv.canGoBack()
    canGoForward.value = wv.canGoForward()
  } catch { /* webContents 未就绪时忽略 */ }
}

function syncFavicon(pageUrl: string) {
  let hostname = ''
  try {
    const parsed = new URL(pageUrl)
    if (!/^https?:$/.test(parsed.protocol)) return
    hostname = parsed.hostname
  } catch {
    return
  }
  if (!hostname) return

  const iconUrl = window.electronAPI
    ? `site-icon://${hostname}`
    : `https://www.google.com/s2/favicons?sz=32&domain=${hostname}`
  if (iconUrl === lastFaviconUrl) return
  lastFaviconUrl = iconUrl
  emit('icon-updated', iconUrl)
}

function onPageTitleUpdated(event: Event) {
  const title = (event as any).title
  if (title) emit('title-updated', title)
}

/** 地址栏回车跳转；无协议时按网址补 https:// */
function navigate() {
  let target = address.value.trim()
  if (!target) return
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) target = `https://${target}`
  webviewRef.value?.loadURL(target)
}
</script>

<style scoped>
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 0.375rem;
  color: var(--muted-foreground);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-btn:hover:not(:disabled) {
  background-color: color-mix(in oklch, var(--primary) 10%, transparent);
  color: var(--foreground);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.nav-btn:active:not(:disabled) {
  transform: scale(0.9);
}

/* 加载中刷新图标旋转 */
.nav-spin {
  animation: nav-rotate 0.9s linear infinite;
}

@keyframes nav-rotate {
  to {
    transform: rotate(360deg);
  }
}

/* 不定进度条：滑块从左侧滑出，循环直到加载结束 */
.nav-progress {
  background: transparent;
}

.nav-progress-bar {
  border-radius: 9999px;
  animation: nav-progress-slide 1.1s ease-in-out infinite;
}

@keyframes nav-progress-slide {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(400%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-spin {
    animation: none;
  }

  .nav-progress-bar {
    animation-duration: 2.5s;
  }
}
</style>
