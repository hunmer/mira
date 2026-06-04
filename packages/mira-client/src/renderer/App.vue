<template>
  <div id="app" class="h-screen w-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
    <!-- iOS风格拖拽横条 -->
    <div class="drag-handle-bar">
      <div class="drag-handle-indicator"></div>
    </div>

    <!-- 全局 Toast 消息 -->
    <Toaster />

    <!-- 更新对话框 -->
    <Dialog v-model:open="updateDialog.visible">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>发现新版本 v{{ updateDialog.version }}</DialogTitle>
          <DialogDescription>
            {{ updateDialog.releaseNotes || '新版本已就绪，建议立即更新以获得最新功能和修复。' }}
          </DialogDescription>
        </DialogHeader>
        <div v-if="updateDialog.downloading" class="space-y-2">
          <Progress :value="updateDialog.progress" class="w-full" />
          <p class="text-sm text-muted-foreground text-center">{{ Math.round(updateDialog.progress) }}%</p>
        </div>
        <DialogFooter v-else>
          <Button variant="outline" @click="updateDialog.visible = false">稍后</Button>
          <Button @click="startDownload" :disabled="updateDialog.downloading">立即更新</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 全局确认对话框 -->
    <AlertDialog>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <AlertDialogContent class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle />
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction>确认</AlertDialogAction>
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
    
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import GlobalLoading from './components/GlobalLoading.vue'
import { useSettingsStore } from './stores/settings'

// Import shadcn components
import { Sonner as Toaster } from '@/components/ui/sonner'
import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
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

// 全局快捷键系统
import { useAutoShortcuts } from './composables/useShortcuts'

const router = useRouter()
const settingsStore = useSettingsStore()

// 拖拽状态管理 - 简化为始终启用


// 全局Loading状态管理
const globalLoading = reactive({
  isVisible: false,
  title: '加载中...',
  message: '',
  progress: undefined as number | undefined,
  showProgress: false,
  showCancel: false
})

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
const shortcuts = useAutoShortcuts()


// 处理全局Loading取消
const handleGlobalLoadingCancel = () => {
  globalLoading.isVisible = false
  globalLoading.showCancel = false
  console.log('🚫 Global loading cancelled by user')
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

// 向上查找具有 data-file 或 data-files 属性的元素
const findElementWithDataFile = (element: HTMLElement | null): HTMLElement | null => {
  let currentElement = element

  while (currentElement && currentElement !== document.documentElement) {
    if (currentElement.hasAttribute('data-file') || currentElement.hasAttribute('data-files')) {
      return currentElement
    }
    currentElement = currentElement.parentElement
  }

  return null
}


// 检测拖拽元素并提取图标信息
const extractDragIcon = (event: DragEvent): { iconPath?: string; iconType?: string } => {
  const target = event.target as HTMLElement

  // 向上查找具有 data-file 属性的元素（已有逻辑）
  let currentElement: HTMLElement | null = target
  let elementWithDataFile: HTMLElement | null = null

  while (currentElement && currentElement !== document.documentElement) {
    if (currentElement.hasAttribute('data-file')) {
      elementWithDataFile = currentElement
      break
    }
    currentElement = currentElement.parentElement
  }

  if (!elementWithDataFile) {
    return {}
  }

  // 在该元素及其子元素中查找图片
  const findImageInElement = (element: HTMLElement): { iconPath?: string; iconType?: string } => {
    // 检查元素本身是否为图片
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement
      if (img.src) {
        console.log('🖼️ 检测到图片元素, src:', img.src)
        return {
          iconPath: img.src,
          iconType: 'element-image'
        }
      }
    }

    // 检查背景图片
    const computedStyle = window.getComputedStyle(element)
    const backgroundImage = computedStyle.backgroundImage
    if (backgroundImage && backgroundImage !== 'none') {
      const match = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/)
      if (match && match[1]) {
        console.log('🎨 检测到背景图片:', match[1])
        return {
          iconPath: match[1],
          iconType: 'background-image'
        }
      }
    }

    // 在子元素中查找图片
    const imgElement = element.querySelector('img')
    if (imgElement && imgElement.src) {
      console.log('🔍 在子元素中找到图片:', imgElement.src)
      return {
        iconPath: imgElement.src,
        iconType: 'child-image'
      }
    }

    return {}
  }

  return findImageInElement(elementWithDataFile)
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
  
  // 监听文件导入事件
  window.electronAPI.on('files:import', (filePaths: string[]) => {
    // 处理文件导入
    console.log('Import files:', filePaths)
    // 这里可以调用文件上传逻辑
  })

  // 监听 openTab 协议事件（来自 dashboard 等外部来源）
  window.electronAPI.on('protocol:open-tab', (data: any) => {
    console.log('Received openTab protocol:', data)
    if (!data || !data.tabType) return
    const tabs = useTabs()

    if (data.tabType === 'folder') {
      tabs.createTabFromFolder({ id: String(data.id), title: data.name }, data.libraryId)
    } else if (data.tabType === 'tag') {
      tabs.createTabFromTag({ id: String(data.id), title: data.name }, data.libraryId)
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
    globalLoading.title = options?.title || '加载中...'
    globalLoading.progress = options?.progress
    globalLoading.showProgress = options?.showProgress || false
    globalLoading.showCancel = options?.showCancel || false
    console.log('📋 Global loading shown:', message)
  })
  
  // 监听隐藏全局Loading事件
  window.electronAPI.on('hide-global-loading', () => {
    globalLoading.isVisible = false
    console.log('✅ Global loading hidden')
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
  window.electronAPI.removeAllListeners('files:import')
  window.electronAPI.removeAllListeners('protocol:open-tab')
  window.electronAPI.removeAllListeners('show-global-loading')
  window.electronAPI.removeAllListeners('hide-global-loading')

  // 清理更新监听
  cleanupUpdaters.forEach(fn => fn())
  cleanupUpdaters = []
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  setupElectronListeners()

  // 应用主题
  settingsStore.applyTheme()

  // 初始化拖拽横条状态 - 始终启用拖拽
  const dragBar = document.querySelector('.drag-handle-bar') as HTMLElement
  if (dragBar) {
    dragBar.style.webkitAppRegion = 'drag'
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
  background-color: var(--mira-bg-secondary);
  color: var(--mira-text-primary);
  transition: background-color var(--mira-transition-normal), color var(--mira-transition-normal);
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
  background-color: var(--mira-bg-primary);
  color: var(--mira-text-primary);
}

/* 高对比度主题 */
.high-contrast #app {
  /* 高对比度样式在 theme.css 中定义 */
  filter: contrast(1.5);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--mira-gray-400);
  border-radius: 4px;
  transition: background-color var(--mira-transition-fast);
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--mira-gray-500);
}

.dark ::-webkit-scrollbar-thumb {
  background-color: var(--mira-gray-600);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background-color: var(--mira-gray-500);
}

/* 焦点样式 */
:focus-visible {
  outline: 2px solid var(--mira-primary-500);
  outline-offset: 2px;
}

/* 选择样式 */
::selection {
  background-color: var(--mira-primary-200);
  color: var(--mira-primary-900);
}

.dark ::selection {
  background-color: var(--mira-primary-800);
  color: var(--mira-primary-100);
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
    var(--mira-gray-200) 25%, 
    var(--mira-gray-100) 50%, 
    var(--mira-gray-200) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.dark .shimmer {
  background: linear-gradient(90deg,
    var(--mira-gray-700) 25%,
    var(--mira-gray-600) 50%,
    var(--mira-gray-700) 75%);
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
