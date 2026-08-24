<template>
  <div id="app" class="h-screen w-screen overflow-hidden bg-background">
    <!-- iOS风格拖拽横条（仅 Electron 窗口显示，dev 网页隐藏） -->
    <div v-if="environment.isElectron" class="drag-handle-bar">
      <div class="drag-handle-indicator"></div>
    </div>

    <!-- 全局 Toast 消息 -->
    <Toaster
      richColors
      closeButton
      position="bottom-right"
      :theme="settingsStore.isDarkMode ? 'dark' : 'light'"
    />

    <!-- 更新对话框 -->
    <Dialog v-model:open="updateDialog.visible">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ $t('commonUi.updateDialog.title', { version: updateDialog.version }) }}</DialogTitle>
          <DialogDescription>
            {{ updateDialog.releaseNotes || $t('commonUi.updateDialog.defaultReleaseNotes') }}
          </DialogDescription>
        </DialogHeader>
        <div v-if="updateDialog.downloading" class="space-y-2">
          <Progress :value="updateDialog.progress" class="w-full" />
          <p class="text-sm text-muted-foreground text-center">{{ Math.round(updateDialog.progress) }}%</p>
        </div>
        <DialogFooter v-else>
          <Button variant="outline" @click="updateDialog.visible = false">{{ $t('commonUi.updateDialog.later') }}</Button>
          <Button @click="startDownload" :disabled="updateDialog.downloading">{{ $t('commonUi.updateDialog.updateNow') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 全局确认对话框（消费 useConfirm 的 confirmState）
         z-index 高于普通 Dialog(z-50)，确保从其他对话框内弹出时显示在最上层。
         用普通 Button 而非 AlertDialogAction/Cancel：后两者内部是 DialogClose，
         点击会自动 onOpenChange(false)，与确认回调的执行时序耦合，曾导致
         “点确认无反应”。这里完全由 confirmState 控制开关，按钮逻辑自管。 -->
    <AlertDialog :open="confirmState.visible" @update:open="(open: boolean) => { if (!open) onConfirmCancel() }">
      <!-- z-[100] 让确认框层叠在普通 Dialog(z-50) 之上；
           背景与动画样式由 AlertDialogContent 内部统一提供（玻璃质感，与 Dialog 一致）。 -->
      <AlertDialogContent class="z-[100] max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ confirmState.header || $t('commonUi.confirmDialog.defaultHeader') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ confirmState.message }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" @click="onConfirmCancel">{{ confirmState.rejectLabel || $t('commonUi.confirmDialog.reject') }}</Button>
          <Button @click="onConfirmAccept">{{ confirmState.acceptLabel || $t('commonUi.confirmDialog.accept') }}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <!-- 全局Loading -->
    <GlobalLoading
      :is-visible="globalLoading.isVisible"
      :title="globalLoading.title"
      :message="globalLoading.message"
      :progress="globalLoading.progress"
      :show-progress="globalLoading.showProgress"
      :show-cancel="globalLoading.showCancel"
      @cancel="handleGlobalLoadingCancel"
    />
    <ServerStartupLoading
      :visible="serverStartup.visible"
      :message="serverStartup.message"
    />
    
    <!-- 应用主内容 -->
    <div class="flex h-full">
      
      <!-- 主内容区域 -->
      <main class="flex-1 overflow-hidden">
        <router-view v-slot="{ Component, route: currentRoute }">
          <transition :name="String(currentRoute.meta?.transition ?? 'fade')" mode="out-in">
            <keep-alive include="Home">
              <component :is="Component" :key="currentRoute.name" />
            </keep-alive>
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 从 URL 导入对话框（全局入口：菜单/工具栏/拖拽） -->
    <UrlImportDialog />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import GlobalLoading from './components/GlobalLoading.vue'
import ServerStartupLoading from './components/ServerStartupLoading.vue'
import UrlImportDialog from './components/business/UrlImportDialog.vue'
import { useSettingsStore } from './stores/settings'
import { useUrlImportStore } from './stores/urlImport'
import { confirmState } from './composables/useConfirm'

// Import shadcn components
import { Toaster } from '@/components/ui/sonner'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

// 初始化搜索处理器（仅在 Electron 环境中，且避免重复初始化）
import { SearchHandlers } from './services/SearchHandlers'
import { environment } from './utils'
import { useTabs } from './composables/useTabs'
import { useLibraryStore } from './stores/library'
import { miraSDKService } from './services/MiraSDKService'

// 全局快捷键系统
import { useAutoShortcuts } from './composables/useShortcuts'

import { toast } from 'vue-sonner'
import i18n from './i18n'

const router = useRouter()
const settingsStore = useSettingsStore()
const libraryStore = useLibraryStore()
const urlImportStore = useUrlImportStore()

// 拖拽状态管理 - 简化为始终启用


// 全局Loading状态管理
// title/message 默认空串，由 GlobalLoading 组件用 i18n 兜底
const globalLoading = reactive({
  isVisible: false,
  title: '',
  message: '',
  progress: undefined as number | undefined,
  showProgress: false,
  showCancel: false
})

const serverStartup = reactive({
  visible: environment.isElectron && !!window.electronAPI?.serverAutoStart,
  message: '',
})

const waitForServerStartup = async () => {
  if (!serverStartup.visible || !window.electronAPI?.serverAutoStart) return
  serverStartup.message = ''
  const result = await window.electronAPI.serverAutoStart.waitReady()
  if (result.success) {
    serverStartup.visible = false
  } else {
    // 连接失败不展示失败界面，直接关闭 Loading 并跳转到 Login 路由
    serverStartup.visible = false
    router.push({ name: 'Login' })
  }
}

// 更新对话框状态
const updateDialog = reactive({
  visible: false,
  version: '',
  releaseNotes: '' as string | undefined,
  downloading: false,
  progress: 0,
})

const startDownload = async () => {
  updateDialog.downloading = true
  try {
    await window.electronAPI.updater.download()
  } catch (e) {
    console.error('下载更新失败:', e)
    updateDialog.downloading = false
    updateDialog.visible = false
  }
}

// 更新监听清理函数
let cleanupUpdaters: (() => void)[] = []

// 在 Electron 环境中初始化搜索处理器（使用单例模式确保只初始化一次）
if (environment.isElectron) {
  SearchHandlers.getInstance()
}

// 初始化全局快捷键系统
useAutoShortcuts()


// 处理全局Loading取消
const handleGlobalLoadingCancel = () => {
  globalLoading.isVisible = false
  globalLoading.showCancel = false
}

// ==================== 全局确认对话框处理 ====================
// 消费 useConfirm 的 confirmState：把 confirm.require(...) 调用渲染成可见的 AlertDialog。
// 用普通 Button 而非 AlertDialogAction/Cancel，避免 reka-ui DialogClose 自动关闭
// 与确认回调的时序耦合。开关完全由 confirmState.visible 控制。
const onConfirmAccept = () => {
  const cb = confirmState.value.onAccept
  // 先关闭并清空，再执行回调（回调可能是 async，不阻塞 UI）
  confirmState.value.visible = false
  confirmState.value.onAccept = undefined
  confirmState.value.onReject = undefined
  try {
    cb?.()
  } catch (e) {
    console.error('[confirm] accept handler error:', e)
  }
}

const onConfirmCancel = () => {
  const cb = confirmState.value.onReject
  confirmState.value.visible = false
  confirmState.value.onAccept = undefined
  confirmState.value.onReject = undefined
  try {
    cb?.()
  } catch (e) {
    console.error('[confirm] reject handler error:', e)
  }
}

// 键盘快捷键处理
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + R: 刷新当前页面
  if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
    event.preventDefault()
    window.location.reload()
  }

  // Ctrl/Cmd + Shift + D: 打开开发者工具
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
    event.preventDefault()
    // 通过 IPC 调用主进程打开开发者工具
    if (window.electronAPI) {
      window.electronAPI.send('app:toggle-devtools')
    }
  }

  // ESC: 清除选择状态
  if (event.key === 'Escape') {
    // 可以在这里添加清除选择等操作
  }
}

// 监听主进程事件
const setupElectronListeners = () => {
  if (!window.electronAPI) return
  
  // 监听菜单事件
  window.electronAPI.on('menu:refresh', () => {
    window.location.reload()
  })
  
  window.electronAPI.on('navigate:home', () => {
    router.push('/')
  })
  
  window.electronAPI.on('navigate:plugins', () => {
    router.push('/plugins')
  })
  
  window.electronAPI.on('navigate:settings', () => {
    router.push('/settings')
  })

  // 监听通知窗口的点击/操作回调，跳转到对应文件详情
  window.electronAPI.on('notification-from-window', (payload: any) => {
    console.info('[NotificationDebug][renderer] notification received', payload)
    if (!payload) return
    const fileId = payload?.data?.fileId
    // 点击通知卡片或“查看”按钮，按媒体类型打开对应预览页。
    const shouldOpen =
      (payload.type === 'notification:click' && fileId) ||
      (payload.type === 'notification:action' && payload.actionId === 'view' && fileId)
    if (shouldOpen) {
      const previewRoute = payload?.data?.previewType === 'video'
        ? 'video-preview'
        : 'image-preview'
      const target = `/${previewRoute}/${encodeURIComponent(String(fileId))}`
      console.info('[NotificationDebug][renderer] routing', { target, payload })
      router.push(target).then(() => {
        console.info('[NotificationDebug][renderer] route completed', { target })
      }).catch((error) => {
        console.error('[NotificationDebug][renderer] route failed', { target, error })
      })
    } else {
      console.warn('[NotificationDebug][renderer] ignored notification payload', {
        payload,
        fileId,
        shouldOpen,
      })
    }
  })
  
  // 监听文件导入事件
  window.electronAPI.on('files:import', (_filePaths: string[]) => {
    // 处理文件导入
    // 这里可以调用文件上传逻辑
  })

  // 监听「从 URL 导入」菜单事件
  window.electronAPI.on('files:import-from-url', () => {
    urlImportStore.open()
  })

  window.electronAPI.on('plugin-window:mira-item-add-from-url', async (request: any) => {
    const reply = (result: any) => window.electronAPI.send('plugin-window:mira-item-add-from-url-result', request?.requestId, result)
    try {
      const libraryId = libraryStore.currentLibrary?.id
      if (!libraryId) throw new Error('当前没有可用素材库')
      const rawData = request?.data
      const data = rawData instanceof Uint8Array
        ? rawData
        : rawData instanceof ArrayBuffer
          ? new Uint8Array(rawData)
          : rawData?.type === 'Buffer' && Array.isArray(rawData.data)
            ? new Uint8Array(rawData.data)
            : new Uint8Array(rawData || [])
      const file = new File([data], request.name || 'mira-download', { type: request.mimeType || 'application/octet-stream' })
      const options = request.options || {}
      const metadata = {
        folderId: Array.isArray(options.folders) ? options.folders[0] : undefined,
        tags: Array.isArray(options.tags) ? options.tags : undefined,
      }
      const uploaded = await miraSDKService.uploadFile(file, libraryId, metadata)
      if (!uploaded?.success || !uploaded.data?.id) throw new Error(uploaded?.message || 'Mira 上传失败')
      try {
        await miraSDKService.updateFile(libraryId, uploaded.data.id, {
          website: typeof options.website === 'string' ? options.website : request.url,
          notes: typeof options.annotation === 'string' ? options.annotation : undefined,
          custom_fields: { source_url: request.url },
        })
      } catch (error) {
        console.warn('[PluginWindow] 素材已上传，但来源元数据写入失败', error)
      }
      reply({ success: true, data: { id: uploaded.data.id }, message: uploaded.message })
    } catch (error) {
      reply({ success: false, message: error instanceof Error ? error.message : String(error) })
    }
  })

  // 监听 openTab 协议事件（来自 dashboard 等外部来源）
  window.electronAPI.on('protocol:open-tab', (data: any) => {
    if (!data || !data.tabType) return
    const tabs = useTabs()

    if (data.tabType === 'folder') {
      tabs.createTabFromFolder({ id: String(data.id), title: data.name }, data.libraryId)
    } else if (data.tabType === 'tag') {
      tabs.createTabFromTag({ id: String(data.id), title: data.name }, data.libraryId)
    }
  })

  // 监听 server_import 协议事件（来自 dashboard 分享链接），导入服务器配置
  window.electronAPI.on('protocol:server-import', async (data: any) => {
    const serverUrl = typeof data?.serverUrl === 'string' ? data.serverUrl.trim() : ''
    if (!serverUrl) return
    try {
      const { useServerListStore } = await import('./stores/serverList')
      const serverListStore = useServerListStore()
      // 先恢复本地已存列表，避免空 state 覆盖已有配置
      await serverListStore.restoreServerListState()
      const result = await serverListStore.addServer({
        id: String(data.id || serverUrl),
        name: typeof data.name === 'string' && data.name ? data.name : serverUrl,
        serverUrl,
        websocketUrl: typeof data.websocketUrl === 'string' && data.websocketUrl
          ? data.websocketUrl
          : serverUrl.replace(/^http/, 'ws'),
        // 分享链接可携带 API Token，导入后免登录连接
        ...(typeof data.authToken === 'string' && data.authToken ? { authToken: data.authToken } : {}),
      })
      if (result.success) {
        toast.success(i18n.global.t('stores.serverList.imported', { name: typeof data.name === 'string' && data.name ? data.name : serverUrl }))
      } else {
        toast.error(i18n.global.t('stores.serverList.importFailed'))
      }
    } catch (error) {
      console.error('Failed to import server:', error)
      toast.error(i18n.global.t('stores.serverList.importFailed'))
    }
  })
  
  // 监听全局Loading事件
  window.electronAPI.on('show-global-loading', (message: string, options?: {
    title?: string
    progress?: number
    showProgress?: boolean
    showCancel?: boolean
  }) => {
    globalLoading.isVisible = true
    globalLoading.message = message || ''
    globalLoading.title = options?.title || ''
    globalLoading.progress = options?.progress
    globalLoading.showProgress = options?.showProgress || false
    globalLoading.showCancel = options?.showCancel || false
  })
  
  // 监听隐藏全局Loading事件
  window.electronAPI.on('hide-global-loading', () => {
    globalLoading.isVisible = false
  })

  // 自动更新事件
  const unsubAvailable = window.electronAPI.updater.onUpdateAvailable((info: any) => {
    updateDialog.version = info.version
    updateDialog.releaseNotes = typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    updateDialog.downloading = false
    updateDialog.progress = 0
    updateDialog.visible = true
  })

  const unsubProgress = window.electronAPI.updater.onUpdateDownloadProgress((progress: any) => {
    updateDialog.progress = progress.percent
  })

  const unsubDownloaded = window.electronAPI.updater.onUpdateDownloaded(() => {
    updateDialog.visible = false
    window.electronAPI.updater.install()
  })

  cleanupUpdaters = [unsubAvailable, unsubProgress, unsubDownloaded]
}

const cleanupElectronListeners = () => {
  if (!window.electronAPI) return
  
  window.electronAPI.removeAllListeners('menu:refresh')
  window.electronAPI.removeAllListeners('navigate:home')
  window.electronAPI.removeAllListeners('navigate:plugins')
  window.electronAPI.removeAllListeners('navigate:settings')
  window.electronAPI.removeAllListeners('notification-from-window')
  window.electronAPI.removeAllListeners('files:import')
  window.electronAPI.removeAllListeners('files:import-from-url')
  window.electronAPI.removeAllListeners('plugin-window:mira-item-add-from-url')
  window.electronAPI.removeAllListeners('protocol:open-tab')
  window.electronAPI.removeAllListeners('protocol:server-import')
  window.electronAPI.removeAllListeners('show-global-loading')
  window.electronAPI.removeAllListeners('hide-global-loading')

  // 清理更新监听
  cleanupUpdaters.forEach(fn => fn())
  cleanupUpdaters = []
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  setupElectronListeners()
  void waitForServerStartup()

  // 应用主题
  settingsStore.applyTheme()

  // 初始化拖拽横条状态 - 始终启用拖拽
  const dragBar = document.querySelector('.drag-handle-bar') as HTMLElement
  if (dragBar) {
    ;(dragBar.style as any).webkitAppRegion = 'drag'
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  cleanupElectronListeners()
})
</script>

<style>
/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}

/* 页面切换动画 */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s ease;
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

/* 全局样式调整 */
#app {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  /* 背景保持中性，使用语义变量，不被主色调染。
     主题风格(Mira/Lyra/Luma/Rhea)改变 --background 时背景才变化。 */
  background-color: var(--background);
  color: var(--foreground);
  transition: background-color 250ms ease, color 250ms ease;
}

/* 确保全屏布局 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* 改善盒模型 */
*, *::before, *::after {
  box-sizing: border-box;
}

/* 暗色主题样式 */
.dark {
  color-scheme: dark;
}

.dark #app {
  background-color: var(--background);
  color: var(--foreground);
}

/* 高对比度主题 */
.high-contrast #app {
  /* 高对比度样式在 theme.css 中定义 */
  filter: contrast(1.5);
}

/* 滚动条样式统一在 main.css 中定义（极细 3px 风格），此处不再重复 */

/* 焦点样式 */
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* 选择样式 */
::selection {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.dark ::selection {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

/* 无障碍访问 - 减少动画 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  #app {
    filter: contrast(1.2);
  }
}

/* 响应式字体大小 */
@media (max-width: 768px) {
  #app {
    font-size: 14px;
  }
}

@media (min-width: 1920px) {
  #app {
    font-size: 16px;
  }
}

/* 打印样式 */
@media print {
  #app {
    background: white !important;
    color: black !important;
  }
  
  .fade-enter-active,
  .fade-leave-active,
  .slide-enter-active,
  .slide-leave-active,
  .scale-enter-active,
  .scale-leave-active {
    transition: none !important;
  }
}

/* 加载状态样式 */
.global-loading {
  backdrop-filter: blur(4px);
  background-color: rgba(0, 0, 0, 0.4);
}

.dark .global-loading {
  background-color: rgba(0, 0, 0, 0.6);
}

/* 提升性能的样式 */
.performance-optimized {
  will-change: transform;
  transform: translateZ(0);
}

/* 自定义属性动画 */
@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

/* 加载动画 */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.shimmer {
  background: linear-gradient(90deg, 
    var(--muted) 25%, 
    var(--background) 50%, 
    var(--muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.dark .shimmer {
  background: linear-gradient(90deg,
    var(--muted) 25%,
    var(--muted) 50%,
    var(--muted) 75%);
  background-size: 200% 100%;
}

/* iOS风格拖拽横条样式 - 始终可拖拽 */
.drag-handle-bar {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 100px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  background-color: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
}

.drag-handle-bar:hover {
  background-color: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.18);
}

.drag-handle-indicator {
  width: 36px;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 2px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.drag-handle-indicator::before,
.drag-handle-indicator::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.drag-handle-indicator::before {
  left: -10px;
}

.drag-handle-indicator::after {
  right: -10px;
}

.drag-handle-bar:hover .drag-handle-indicator {
  background-color: rgba(0, 0, 0, 0.45);
}

.drag-handle-bar:hover .drag-handle-indicator::before,
.drag-handle-bar:hover .drag-handle-indicator::after {
  background-color: rgba(0, 0, 0, 0.35);
  transform: translateY(-50%) scale(1.15);
}


/* 暗色主题适配 */
.dark .drag-handle-bar {
  background-color: rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 0.05);
}

.dark .drag-handle-bar:hover {
  background-color: rgba(0, 0, 0, 0.35);
  border-color: rgba(255, 255, 255, 0.2);
}

.dark .drag-handle-indicator {
  background-color: rgba(255, 255, 255, 0.2);
}

.dark .drag-handle-indicator::before,
.dark .drag-handle-indicator::after {
  background-color: rgba(255, 255, 255, 0.12);
}

.dark .drag-handle-bar:hover .drag-handle-indicator {
  background-color: rgba(255, 255, 255, 0.7);
}

.dark .drag-handle-bar:hover .drag-handle-indicator::before,
.dark .drag-handle-bar:hover .drag-handle-indicator::after {
  background-color: rgba(255, 255, 255, 0.5);
}



/* 确保交互元素始终可点击 */
#app button,
#app input,
#app select,
#app textarea,
#app a,
#app [role="button"],
#app .clickable {
  -webkit-app-region: no-drag;
}

/* 拖拽横条始终可拖拽 */
#app .drag-handle-bar {
  -webkit-app-region: drag;
}
</style>
