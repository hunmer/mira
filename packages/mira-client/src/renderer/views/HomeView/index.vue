<script setup lang="ts">
defineOptions({ name: 'Home' })
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaQuery, useEventListener } from '@vueuse/core'

// 布局组件
import TabViewRenderer from '@renderer/components/common/TabViewRenderer.vue'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import MediaDetailComponent from '@renderer/components/business/MediaDetailComponent.vue'

// 功能子组件
import HomeHeader from './HomeHeader.vue'
import HomeSidebar from './HomeSidebar.vue'
import HomeTabsBar from './HomeTabsBar.vue'
import HomeDialogs from './HomeDialogs.vue'
import ScreenshotDialog from '@renderer/components/business/ScreenshotDialog.vue'
import PluginContributionBar from './PluginContributionBar.vue'

// shadcn Tabs（右侧详情面板：保留 tabs 壳结构供未来扩展）
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// Store imports
import { useTagStore } from '@renderer/stores/tag'
import { useAuthStore } from '@renderer/stores/auth'
import { useMediaStore } from '@renderer/stores/media'
import { useLibraryStore } from '@renderer/stores/library'
import { useSettingsStore } from '@renderer/stores/settings'
import { useViewHistoryStore } from '@renderer/stores/viewHistory'

// Controller import
import { useHomeController } from '@renderer/controllers/HomeController'

// Window and Navigation composables
import { useWindowAndNavigation } from '@renderer/composables'

// HomeView模块
import { useHomeUIState } from './useHomeUIState'
import { useHomeTabManagement } from './useHomeTabManagement'
import { useHomeLibraryManagement } from './useHomeLibraryManagement'
import { useHomeEventHandlers } from './useHomeEventHandlers'
import { useHomeInit } from './useHomeInit'

// ============================================
// 初始化stores和controllers
// ============================================
const homeController = useHomeController()
const tagStore = useTagStore()
const authStore = useAuthStore()
const mediaStore = useMediaStore()
const libraryStore = useLibraryStore()
const settingsStore = useSettingsStore()
const viewHistoryStore = useViewHistoryStore()
const router = useRouter()

// ============================================
// 第三列：详情面板状态（数据由 MediaTabListView 同步到 mediaStore）
// ============================================
const showDetailSidebar = computed(() => mediaStore.showDetailSidebar)
const sidebarMediaItems = computed(() => mediaStore.detailSidebarFiles)
const detailSidebarItem = computed(() => sidebarMediaItems.value.length === 1 ? sidebarMediaItems.value[0] : undefined)
const detailSidebarItems = computed(() => sidebarMediaItems.value.length > 1 ? sidebarMediaItems.value : undefined)
const detailLibraryId = computed(() => libraryStore.currentLibrary?.id || 'default')

const handleDetailTagAdd = (tagName: string) => homeController.handleTagAdd(tagName)
const handleDetailTagRemove = (tagName: string) => homeController.handleTagRemove(tagName)
const handleDetailFolderChange = (folderId: string) => homeController.handleFolderChange(folderId)

// 右侧详情面板的底部双 tab（详情 / 历史）激活态；侧栏折叠重开时保持上次选择
const detailPanelTab = ref<'detail' | 'history'>('detail')

// 第三列详情面板：resizable 折叠态。与 mediaStore.showDetailSidebar 双向同步——
// 用户拖拽至 min 之下会触发 collapsible 折叠（emit collapse），HomeHeader 按钮则通过
// store 将面板调整为 0 / 默认宽度，二者共用同一个布尔事实来源。
const detailPanelRef = ref<InstanceType<typeof ResizablePanel>>()
const isDetailCollapsed = ref(false)
const detailPanelDefaultSize = 28

// showDetailSidebar（按钮切换）→ 驱动面板切换到 0 / 默认宽度
watch(showDetailSidebar, (show) => {
  const api = detailPanelRef.value as any
  if (!api) return
  api.resize(show ? detailPanelDefaultSize : 0)
}, { flush: 'post' })

// 拖拽折叠 / HomeHeader 按钮的最终落点：把折叠态回写 store，
// 让 HomeHeader 的 view_sidebar 图标高亮与实际状态一致。
// 直接写 store 内部 ref（showDetailSidebar 是 computed 只读，不可赋值）。
watch(isDetailCollapsed, (collapsed) => {
  if (collapsed && mediaStore.showDetailSidebar) mediaStore.showDetailSidebar = false
  else if (!collapsed && !mediaStore.showDetailSidebar) mediaStore.showDetailSidebar = true
})

// ============================================
// 左侧导航栏：与第三列详情面板对称的 collapsible 折叠态
// ============================================
const showLeftSidebar = computed(() => mediaStore.showLeftSidebar)
const leftPanelRef = ref<InstanceType<typeof ResizablePanel>>()
const isLeftCollapsed = ref(false)
const leftPanelDefaultSize = 18

// 按钮 / handle 点击切换 → 驱动左侧面板切换到 默认宽度 / 0
watch(showLeftSidebar, (show) => {
  const api = leftPanelRef.value as any
  if (!api) return
  api.resize(show ? leftPanelDefaultSize : 0)
}, { flush: 'post' })

// 拖拽折叠 → 回写 store，保持 HomeTabsBar 切换按钮高亮一致
watch(isLeftCollapsed, (collapsed) => {
  if (collapsed && mediaStore.showLeftSidebar) mediaStore.showLeftSidebar = false
  else if (!collapsed && !mediaStore.showLeftSidebar) mediaStore.showLeftSidebar = true
})

// ============================================
// 移动端响应式：< 768px 时左右侧栏改用 Sheet 抽屉展示，默认隐藏
// ============================================
const isMobile = useMediaQuery('(max-width: 767px)')

// 抽屉开关直接读写 store：桌面端 store 驱动 inline 面板，移动端驱动抽屉
const leftDrawerOpen = computed({
  get: () => mediaStore.showLeftSidebar,
  set: (v) => { mediaStore.showLeftSidebar = v },
})
const rightDrawerOpen = computed({
  get: () => mediaStore.showDetailSidebar,
  set: (v) => { mediaStore.showDetailSidebar = v },
})

// 进入移动端时自动隐藏侧栏（inline 面板不渲染，抽屉默认关闭）
watch(isMobile, (mobile) => {
  if (mobile) {
    mediaStore.showLeftSidebar = false
    mediaStore.showDetailSidebar = false
  }
}, { immediate: true })

// ============================================
// 分割描边点击切换：区分「拖拽」与「点击」——按下后位移超过阈值视为拖拽，忽略 click
// ============================================
// 拖拽分割线期间禁用 panel 的 flex-grow 过渡（保证跟手），
// 按钮/描边点击切换（api.resize）时过渡生效，形成两侧栏伸缩动画。
const isHandleDragging = ref(false)
useEventListener(window, 'pointerup', () => { isHandleDragging.value = false })
useEventListener(window, 'pointercancel', () => { isHandleDragging.value = false })
const panelGrowTransition = computed(() =>
  isHandleDragging.value ? '' : 'transition-[flex-grow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]'
)

function makeHandleToggle(toggle: () => void) {
  let downX = 0, downY = 0, moved = false
  return {
    pointerdown: (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; moved = false; isHandleDragging.value = true },
    pointermove: (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) moved = true
    },
    click: (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
      if (!moved && dist < 5) toggle()
    },
  }
}
const leftHandleToggle = makeHandleToggle(() => mediaStore.toggleLeftSidebar())
const rightHandleToggle = makeHandleToggle(() => mediaStore.toggleDetailSidebar())

// ============================================
// HomeSidebar / 详情面板的 props & 事件绑定对象：桌面 inline 与移动抽屉共用，避免重复
// ============================================
const sidebarBindings = computed(() => ({
  homeController: homeController,
  tags: tagStore.tags,
  libraryId: detailLibraryId.value,
  onFolderSelect: (...args: any[]) => { (handleFolderSelect as (...a: any[]) => void)(...args); if (isMobile.value) mediaStore.showLeftSidebar = false },
  onTagSelect: (...args: any[]) => { (handleTagSelect as (...a: any[]) => void)(...args); if (isMobile.value) mediaStore.showLeftSidebar = false },
  onRefreshFolders: handleRefreshFolders,
  onRefreshTags: handleRefreshTags,
  onEmptyTrash: handleEmptyTrash,
  onImportFolder: handleImportFolder,
  onUpload: (target?: { folderId?: string | number | null; tagIds?: Array<string | number> }) => {
    sidebarUploadTarget.value = target
    uploadInitialTree.value = undefined
    showFileUploadDialog.value = true
  },
  onSelectCollection: handleSelectCollectionAndRefresh,
  onAccessDenied: () => { showAccessDeniedDialog.value = true },
  onShowLibraryManagement: showLibraryManagement,
  onAddServer: handleAddServer,
  onManageFolders: () => { showFolderManageDialog.value = true },
  onManageTags: () => { showTagManageDialog.value = true },
  onShowAbout: () => { showAboutDialog.value = true },
  onHistoryOpen: (file: any) => { openFilePreview(file); if (isMobile.value) mediaStore.showLeftSidebar = false },
}))
const detailBindings = computed(() => ({
  item: detailSidebarItem.value,
  items: detailSidebarItems.value,
  libraryId: detailLibraryId.value,
  onTagAdd: handleDetailTagAdd,
  onTagRemove: handleDetailTagRemove,
  onFolderChange: handleDetailFolderChange,
}))

// 顶部切换左侧栏：桌面 inline / 移动抽屉，统一走 store
function handleToggleLeftSidebar() {
  mediaStore.toggleLeftSidebar()
}

// 历史列表项点击 → 进入预览路由（与 SearchHandlers.openFile 跳转方式一致）
const openFilePreview = (file: any) => {
  if (!file) return
  router.push({
    path: '/file-preview',
    query: {
      id: file.id,
      libraryId: file.libraryId || detailLibraryId.value,
      title: file.title || file.name,
      path: file.path || file.url || '',
      mimeType: file.mimeType || 'application/octet-stream',
    },
  })
}

// 侧边栏定位（供 Tab 管理的右键菜单使用）
const sidebarRef = ref<{ locateItem: (type: 'folder' | 'tag', id: string) => void | Promise<void> }>()

// ============================================
// UI状态管理
// ============================================
const uiState = useHomeUIState()
const {
  showServerManagementDialog,
  showServerEditDialog,
  showShortcutDialog,
  editingServer,
  showLibraryManagement
} = uiState

// 额外的对话框状态
const showFileUploadDialog = ref(false)
const showScreenshotDialog = ref(false)
const screenshotFile = ref<File>()
const openScreenshot = () => { showScreenshotDialog.value = true }
const sidebarUploadTarget = ref<{ folderId?: string | number | null; tagIds?: Array<string | number> }>()
// 导入本地文件夹：传入上传对话框的本地目录树（rootPath + tree）
const uploadInitialTree = ref<{ rootPath: string; tree: any[] }>()
const showPluginsDialog = ref(false)
const showSettingsDialog = ref(false)
const showAccessDeniedDialog = ref(false)
const showFolderManageDialog = ref(false)
const showTagManageDialog = ref(false)
const showAboutDialog = ref(false)

// ============================================
// Tab管理
// ============================================
const tabManagement = useHomeTabManagement(sidebarRef)
const {
  tabsComposable,
  activeTabs,
  currentTab,
  visitedTabs,
  getTabViewConfigForTab,
  getCurrentTab,
  setTabNeedUpdate,
  createTabFromFolder,
  createTabFromTag,
  tabContextMenuItems,
  handleTabContextMenu,
  switchToTabWithCallback,
  closeTabWithCallback,
  handleActivateLastTab,
  handleReopenClosedTab,
  handleCloseCurrentTab,
  canActivateLastTab,
  refreshCurrentTabAfterLibrarySwitch,
  replaceCurrentTab
} = tabManagement

// 保持首页位置不变，仅调整其余标签顺序；useTabs 的深度监听会自动持久化结果。
const handleReorderTabs = (fromTabId: string, toTabId: string) => {
  const tabs = tabsComposable.tabs.value
  const fromIndex = tabs.findIndex(tab => tab.id === fromTabId)
  const toIndex = tabs.findIndex(tab => tab.id === toTabId)
  if (fromIndex < 0 || toIndex < 0 || tabs[fromIndex].type === 'home' || tabs[toIndex].type === 'home') return
  const [tab] = tabs.splice(fromIndex, 1)
  tabs.splice(tabs.findIndex(item => item.id === toTabId), 0, tab)
}

// Tab 条的滚动逻辑已迁移到 HomeTabsBar 组件内

// 上传对话框的 tab 上下文
// 仅普通文件夹/标签 tab 提供真实 ID；未分类/未标签/all/trash/home 等特殊 tab 不提供，
// 避免把字面量 'uncategorized'/'untagged' 等误当作文件夹 ID 传给上传逻辑而在素材库里错误创建同名文件夹
const uploadInitialFolderId = computed<string | undefined>(() => {
  if (sidebarUploadTarget.value?.folderId != null) return String(sidebarUploadTarget.value.folderId)
  const tab = currentTab.value
  if (!tab || tab.type !== 'folder') return undefined
  const num = Number(tab.data?.id)
  return Number.isFinite(num) ? String(num) : undefined
})
const uploadInitialTagIds = computed<string[]>(() => {
  if (sidebarUploadTarget.value?.tagIds?.length) return sidebarUploadTarget.value.tagIds.map(String)
  const tab = currentTab.value
  if (!tab || tab.type !== 'tag') return []
  const num = Number(tab.data?.id)
  return Number.isFinite(num) ? [String(num)] : []
})

// 从侧边栏导入本地文件夹：记录本地树并打开上传对话框
function handleImportFolder(payload: { rootPath: string; tree: any[] }) {
  uploadInitialTree.value = payload
  sidebarUploadTarget.value = payload as any
  showFileUploadDialog.value = true
}

// ============ 悬浮球：接收主进程转发的消息 ============
// file-drop：悬浮球拖入的文件（已是含 path 的 LocalFsNode[]），复用上传对话框的本地导入链路
async function handleFloatingBallMessage(data: any) {
  if (!data || typeof data !== 'object') return
  if (data.type === 'file-drop') {
    const files = Array.isArray(data.files) ? data.files : []
    if (files.length === 0) return
    uploadInitialTree.value = { rootPath: '', tree: files }
    showFileUploadDialog.value = true
  } else if (data.type === 'fb-click') {
    // 单击行为按设置决定
    const action = settingsStore.settings.floatingBallClickAction
    if (action === 'toggleMain') {
      // 主进程已负责恢复隐藏窗口；仅在原本可见时执行最小化切换。
      if (!data.mainWasHidden) {
        window.electronAPI?.floatingBall?.toggleMainWindow().catch((e) => console.error('切换主窗口失败:', e))
      }
    } else {
      // 默认：先恢复并聚焦主窗口，再打开文件上传对话框（空列表）
      window.electronAPI?.floatingBall?.showMainWindow().catch((e) => console.error('唤起主窗口失败:', e))
      uploadInitialTree.value = undefined
      showFileUploadDialog.value = true
    }
  } else if (data.type === 'fb-hide-always') {
    // 始终隐藏：关闭悬浮球开关并持久化（已有的 watch 会触发悬浮球 hide）
    try {
      await settingsStore.updateSettings({ floatingBallEnabled: false })
    } catch (e) {
      console.error('关闭悬浮球设置失败:', e)
    }
  } else if (data.type === 'fb-open-settings') {
    // 打开设置对话框（主进程已负责唤起主窗口）
    showSettingsDialog.value = true
  }
}

// 悬浮球开关响应：启用则显示，关闭则隐藏
function applyFloatingBallEnabled(enabled: boolean) {
  if (!window.electronAPI?.floatingBall) return
  if (enabled) {
    window.electronAPI.floatingBall.show().catch((e) => console.error('显示悬浮球失败:', e))
  } else {
    window.electronAPI.floatingBall.hide().catch((e) => console.error('隐藏悬浮球失败:', e))
  }
}

// ============================================
// 素材库管理
// ============================================
const libraryManagement = useHomeLibraryManagement(
  showServerManagementDialog,
  showServerEditDialog,
  editingServer
)
const {
  showNoLibraryDialog,
  handleSelectCollection,
  handleEditServer,
  handleAddServer,
  handleServerSaved,
  handleCreateLibrary,
  initializeDefaultLibrary
} = libraryManagement

const handleSelectCollectionAndRefresh = async (collection: any) => {
  const switched = await handleSelectCollection(collection)
  if (!switched) return

  await nextTick()
  await refreshCurrentTabAfterLibrarySwitch()
}

// ============================================
// 窗口和导航
// ============================================
const windowNavigation = useWindowAndNavigation()
const {
  isDesktop,
  handleWindowClose,
  handleWindowMinimize,
  handleWindowMaximize,
  handleWindowToggleSize
} = windowNavigation

// 双击 homebar（Tabs 条）切换窗口大小：已最大化/接近占满屏幕时恢复默认大小，否则最大化
const handleHomebarDblClick = (event: MouseEvent) => {
  // 双击 tab 或按钮不触发
  if (event.target instanceof Element && event.target.closest('button')) return
  handleWindowToggleSize()
}

// ============================================
// 事件处理
// ============================================
const eventHandlers = useHomeEventHandlers(
  createTabFromFolder,
  createTabFromTag,
  switchToTabWithCallback,
  tabsComposable.setAllTabsNeedUpdate,
  getCurrentTab
)
const {
  handleFolderSelect,
  handleTagSelect,
  handleRefreshFolders,
  handleRefreshTags,
  handleEmptyTrash,
  registerGlobalEvents,
  cleanupGlobalEvents
} = eventHandlers

// 面包屑点击：原地替换当前 Tab 的内容（不新开 Tab）
const handleTabReplace = async (e: Event) => {
  const { kind, payload } = (e as CustomEvent).detail || {}
  if (!kind) return
  await replaceCurrentTab(kind, payload || {})
}

// ============================================
// 初始化
// ============================================
const homeInit = useHomeInit()
const { performInitialization } = homeInit

let cleanupModules: (() => void) | null = null

onMounted(async () => {
  document.addEventListener('show-screenshot-dialog', openScreenshot)
  try {
    cleanupModules = await performInitialization(
      homeController,
      getCurrentTab,
      setTabNeedUpdate,
      switchToTabWithCallback,
      initializeDefaultLibrary
    )
  } catch (e) {
    console.error('[HomeView] performInitialization failed:', e)
  }

  // 浏览历史：恢复当前激活素材库的最近查看记录（异常静默）
  viewHistoryStore.restoreFromStorage().catch((e) => console.warn('[HomeView] 恢复浏览历史失败:', e))

  registerGlobalEvents(
    handleActivateLastTab,
    handleReopenClosedTab,
    handleCloseCurrentTab
  )

  // 面包屑点击替换当前 Tab
  window.addEventListener('home-tab-replace', handleTabReplace)

  // 悬浮球：监听主进程转发的消息（文件拖放 / 单击）
  window.electronAPI?.on('floating-ball-from-window', handleFloatingBallMessage)

  // 菜单「本地插件」：打开插件管理对话框
  window.electronAPI?.on('menu:show-plugins-dialog', () => { showPluginsDialog.value = true })

  // 悬浮球：应用当前启用设置（设置已由 settingsStore.initialize() 加载完成）
  try {
    if (settingsStore.settings.floatingBallEnabled) {
      applyFloatingBallEnabled(true)
    }
  } catch (e) {
    console.error('[HomeView] 应用悬浮球初始状态失败:', e)
  }

  // 悬浮球：响应设置中开关变化
  watch(
    () => settingsStore.settings.floatingBallEnabled,
    (enabled) => applyFloatingBallEnabled(enabled)
  )
})

// ============================================
// keep-alive 主内容滚动位置保持
// ============================================
const mainContentRef = ref<HTMLElement>()
const savedScrollPositions = new Map<string, number>()

onDeactivated(() => {
  if (mainContentRef.value) {
    mainContentRef.value.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach((el, i) => {
      savedScrollPositions.set(`main-${i}`, (el as HTMLElement).scrollTop)
    })
  }
})

onActivated(() => {
  nextTick(() => {
    if (mainContentRef.value) {
      mainContentRef.value.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach((el, i) => {
        const key = `main-${i}`
        if (savedScrollPositions.has(key)) {
          (el as HTMLElement).scrollTop = savedScrollPositions.get(key)!
        }
      })
    }
  })
})

// ============================================
// 其他事件处理
// ============================================
const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

// ============================================
// 组件卸载清理
// ============================================
onUnmounted(() => {
  document.removeEventListener('show-screenshot-dialog', openScreenshot)
  if (cleanupModules) {
    cleanupModules()
  }
  cleanupGlobalEvents(
    handleActivateLastTab,
    handleReopenClosedTab,
    handleCloseCurrentTab
  )
  window.removeEventListener('home-tab-replace', handleTabReplace)
  // 悬浮球：移除监听
  window.electronAPI?.removeAllListeners('floating-ball-from-window')
  window.electronAPI?.removeAllListeners('menu:show-plugins-dialog')
})
</script>

<template>
  <div class="home-view h-screen flex flex-col text-[13px] relative" style="background: linear-gradient(to bottom right, var(--glass-tint-1), var(--glass-tint-2), var(--glass-tint-3))">
    <!-- HomeHeader 始终悬浮于右上角，与详情侧栏开关无关（不再参与第三列布局） -->
    <HomeHeader
      class="absolute top-3 right-3 z-30"
      :is-desktop="isDesktop"
      @plugins="showPluginsDialog = true"
      @shortcuts="showShortcutDialog = true"
      @settings="showSettingsDialog = true"
      @logout="handleLogout"
      @window-minimize="handleWindowMinimize"
      @window-maximize="handleWindowMaximize"
      @window-close="handleWindowClose"
    />

    <!-- 主内容区域（左侧栏 + 中间内容 + 右侧信息栏，三列均可拖拽调整宽度） -->
    <div class="flex flex-1 min-h-0 p-3 gap-3">
      <!-- 桌面端：三列可拖拽布局 -->
      <ResizablePanelGroup v-if="!isMobile" direction="horizontal" auto-save-id="home-layout" class="flex-1 min-w-0 !overflow-visible">
        <!-- 左侧侧边栏（玻璃面板）：collapsible，点击描边/按钮切换显隐 -->
        <ResizablePanel
          ref="leftPanelRef"
          :default-size="leftPanelDefaultSize"
          :min-size="14"
          :max-size="30"
          :collapsed-size="0"
          collapsible
          @collapse="isLeftCollapsed = true"
          @expand="isLeftCollapsed = false"
          :class="panelGrowTransition"
          class="rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] flex flex-col overflow-hidden">
          <HomeSidebar ref="sidebarRef" v-bind="sidebarBindings" />
        </ResizablePanel>

        <!-- 分隔描边：12px 命中区 + 居中 2px 细线，hover 高亮；点击（非拖拽）切换左侧栏 -->
        <ResizableHandle v-on="leftHandleToggle" class="group/handle w-3 cursor-pointer bg-transparent hover:bg-primary/5 focus-visible:ring-0 transition-colors after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:w-0.5 after:bg-transparent hover:after:bg-primary/40" />

        <!-- 中间列：Tabs 条 + 内容面板 -->
        <ResizablePanel :default-size="54" :min-size="30" class="flex flex-col min-w-0 !overflow-visible">
          <!-- Tabs 条（固定高度与右侧悬浮 HomeHeader 对齐，隐藏滚动条）。
               HomeHeader 始终悬浮于右上角，右侧固定留出 header 宽度避免遮挡 tabs -->
          <div class="shrink-0 h-[56px] px-2 pr-[220px] flex items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" @dblclick="handleHomebarDblClick">
            <HomeTabsBar
              :active-tabs="activeTabs"
              :tab-context-menu-items="tabContextMenuItems"
              :is-tab-closable="tabsComposable.isTabClosable"
              :can-activate-last-tab="canActivateLastTab"
              :on-activate-last-tab="handleActivateLastTab"
              :on-switch-tab="switchToTabWithCallback"
              :on-close-tab="closeTabWithCallback"
              :on-context-menu="handleTabContextMenu"
              :on-reorder-tabs="handleReorderTabs"
              :on-toggle-left-sidebar="handleToggleLeftSidebar"
              :left-sidebar-open="mediaStore.showLeftSidebar"
            />
          </div>

          <!-- 内容面板（玻璃磨砂） -->
          <div class="flex-1 rounded-2xl border border-white/60 dark:border-border bg-white/30 dark:bg-muted/50 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] overflow-hidden flex flex-col p-1">
            <main ref="mainContentRef" class="flex-1 flex overflow-hidden relative min-w-0 p-2 gap-2 border border-primary/40 rounded-xl">
              <!-- Tab视图内容（占满） -->
              <div class="flex-1 min-w-0 overflow-hidden rounded-xl">
                <TabViewRenderer
                  v-for="tab in visitedTabs"
                  :key="tab.id"
                  v-show="currentTab?.id === tab.id"
                  :tab-id="tab.id"
                  :view-config="getTabViewConfigForTab(tab.id)"
                  :cacheable="true"
                  class="w-full h-full"
                />
                <!-- 默认状态 - 没有活跃的Tab时显示 -->
                <div v-if="!currentTab" class="flex items-center justify-center h-full">
                  <div class="text-center rounded-2xl border border-white/60 dark:border-border bg-white/50 dark:bg-muted/70 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] px-10 py-8">
                    <span class="material-icons text-6xl text-primary/60 mb-4 animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_both]">home</span>
                    <h2 class="text-xl font-medium text-foreground mb-2 animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_60ms_both]">{{ $t('views.homeView.welcomeTitle') }}</h2>
                    <p class="text-muted-foreground animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_120ms_both]">{{ $t('views.homeView.welcomeSubtitle') }}</p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </ResizablePanel>

        <!-- 分隔描边：中间列 ↔ 右侧信息栏；点击（非拖拽）切换右侧详情栏 -->
        <ResizableHandle v-on="rightHandleToggle" class="group/handle w-3 cursor-pointer bg-transparent hover:bg-primary/5 focus-visible:ring-0 transition-colors after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:w-0.5 after:bg-transparent hover:after:bg-primary/40" />

        <!-- 右侧信息栏：可拖拽调整宽度，并通过 showDetailSidebar 切换为 0 / 默认宽度。
             HomeHeader 始终悬浮于右上角，顶部留出 pt-14 避免被遮挡。 -->
        <ResizablePanel
          ref="detailPanelRef"
          :default-size="detailPanelDefaultSize"
          :min-size="20"
          :max-size="40"
          :collapsed-size="0"
          collapsible
          @collapse="isDetailCollapsed = true"
          @expand="isDetailCollapsed = false"
          :class="panelGrowTransition"
          class="flex flex-col min-w-0 gap-3 pt-14 overflow-hidden"
        >
          <!-- 插件贡献栏：横向展示在第三列（Header 下方） -->
          <PluginContributionBar @manage="showPluginsDialog = true" />

          <!-- 图片详情面板 -->
          <aside
            v-if="!isDetailCollapsed"
            class="flex-1 min-h-0 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] overflow-hidden flex flex-col"
          >
            <!-- 底部双 tab：内容在上，tab 条在底部 -->
            <Tabs v-model="detailPanelTab" class="flex-1 min-h-0 flex flex-col gap-0">
              <!-- 内容区（在上）：详情 -->
              <TabsContent value="detail" class="flex-1 min-h-0 overflow-y-auto p-4">
                <MediaDetailComponent v-bind="detailBindings" />
              </TabsContent>

              <!-- tab 条（底部）：详情 -->
              <TabsList class="shrink-0 h-9 w-full grid grid-cols-1 rounded-none border-t border-border/60 bg-transparent p-0">
                <TabsTrigger
                  value="detail"
                  class="flex items-center justify-center gap-1 rounded-md border-0 text-xs text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <span class="material-icons text-sm">info_outline</span>
                  <span>{{ $t('views.homeView.detail') }}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>

      <!-- 移动端：仅中间列（Tabs 条 + 内容），侧栏改用抽屉 -->
      <div v-else class="flex flex-col flex-1 min-w-0 gap-3">
        <!-- Tabs 条 -->
        <div class="shrink-0 h-[56px] pl-2 pr-20 flex items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <HomeTabsBar
            :active-tabs="activeTabs"
            :tab-context-menu-items="tabContextMenuItems"
            :is-tab-closable="tabsComposable.isTabClosable"
            :can-activate-last-tab="canActivateLastTab"
            :on-activate-last-tab="handleActivateLastTab"
            :on-switch-tab="switchToTabWithCallback"
            :on-close-tab="closeTabWithCallback"
            :on-context-menu="handleTabContextMenu"
            :on-reorder-tabs="handleReorderTabs"
            :on-toggle-left-sidebar="handleToggleLeftSidebar"
            :left-sidebar-open="mediaStore.showLeftSidebar"
          />
        </div>

        <!-- 内容面板 -->
        <div class="flex-1 rounded-2xl border border-white/60 dark:border-border bg-white/30 dark:bg-muted/50 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] overflow-hidden flex flex-col">
          <main class="flex-1 flex overflow-hidden relative min-w-0 p-2 gap-2 border border-primary/40 rounded-xl">
            <div class="flex-1 min-w-0 overflow-hidden rounded-xl">
              <TabViewRenderer
                v-for="tab in visitedTabs"
                :key="tab.id"
                v-show="currentTab?.id === tab.id"
                :tab-id="tab.id"
                :view-config="getTabViewConfigForTab(tab.id)"
                :cacheable="true"
                class="w-full h-full"
              />
              <div v-if="!currentTab" class="flex items-center justify-center h-full">
                <div class="text-center rounded-2xl border border-white/60 dark:border-border bg-white/50 dark:bg-muted/70 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] px-10 py-8">
                  <span class="material-icons text-6xl text-primary/60 mb-4 animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_both]">home</span>
                  <h2 class="text-xl font-medium text-foreground mb-2 animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_60ms_both]">{{ $t('views.homeView.welcomeTitle') }}</h2>
                  <p class="text-muted-foreground animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_120ms_both]">{{ $t('views.homeView.welcomeSubtitle') }}</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <!-- 移动端：左侧栏抽屉 -->
      <Sheet v-if="isMobile" v-model:open="leftDrawerOpen">
        <SheetContent side="left" class="w-[85%] max-w-[320px] p-0 gap-0">
          <SheetTitle class="sr-only">{{ $t('views.homeTabsBar.toggleLeftSidebar') }}</SheetTitle>
          <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
            <HomeSidebar ref="sidebarRef" v-bind="sidebarBindings" />
          </div>
        </SheetContent>
      </Sheet>

      <!-- 移动端：右侧详情抽屉 -->
      <Sheet v-if="isMobile" v-model:open="rightDrawerOpen">
        <SheetContent side="right" class="w-[90%] max-w-[380px] p-0 gap-0">
          <SheetTitle class="sr-only">{{ $t('views.homeView.detail') }}</SheetTitle>
          <PluginContributionBar @manage="showPluginsDialog = true" />
          <div class="flex-1 min-h-0 overflow-y-auto p-4">
            <MediaDetailComponent v-bind="detailBindings" />
          </div>
        </SheetContent>
      </Sheet>
    </div>

    <!-- 所有对话框 -->
    <HomeDialogs
      v-model:show-no-library-dialog="showNoLibraryDialog"
      v-model:show-server-management-dialog="showServerManagementDialog"
      v-model:show-server-edit-dialog="showServerEditDialog"
      v-model:show-shortcut-dialog="showShortcutDialog"
      v-model:show-file-upload-dialog="showFileUploadDialog"
      v-model:show-plugins-dialog="showPluginsDialog"
      v-model:show-settings-dialog="showSettingsDialog"
      v-model:show-access-denied-dialog="showAccessDeniedDialog"
      v-model:show-folder-manage-dialog="showFolderManageDialog"
      v-model:show-tag-manage-dialog="showTagManageDialog"
      v-model:show-about-dialog="showAboutDialog"
      :editing-server="editingServer"
      :upload-initial-folder-id="uploadInitialFolderId"
      :upload-initial-tag-ids="uploadInitialTagIds"
      :upload-initial-tree="uploadInitialTree"
      :screenshot-file="screenshotFile"
      @create-library="handleCreateLibrary"
      @edit-server="handleEditServer"
      @add-server="handleAddServer"
      @server-saved="handleServerSaved"
      @select-folder="handleFolderSelect"
      @select-tag="handleTagSelect"
    />
    <ScreenshotDialog v-model:visible="showScreenshotDialog" @captured="file => { screenshotFile = file; if (settingsStore.settings.screenshotAutoImport && settingsStore.settings.screenshotOpenUploadDialog) showFileUploadDialog = true }" />
  </div>
</template>

<style scoped>
/* 玻璃态中性背景与阴影：使用语义变量，不被主色调染。
   切换主色调色板时背景不变（保持中性），
   切换主题风格(Mira/Lyra/Luma/Rhea)时 --background/--muted 改变才联动。 */
.home-view {
  /* 中性背景渐变：background → muted 过渡，营造轻微层次感。 */
  --glass-tint-1: var(--background);
  --glass-tint-2: color-mix(in oklch, var(--background) 50%, var(--muted));
  --glass-tint-3: var(--muted);
  /* 中性阴影：基于 foreground 的低透明色（浅色偏黑、深色偏白），不偏色。 */
  --shadow-primary-sm: color-mix(in oklch, var(--foreground) 6%, transparent);
  --shadow-primary-md: color-mix(in oklch, var(--foreground) 10%, transparent);
  /* 自定义缓动曲线：内置 ease 太弱，缺 punch。 */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}

/* 空状态欢迎卡 stagger 入场 */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}

.material-symbols-outlined.text-sm {
  font-size: 16px;
}

/* 自定义滚动条 */
:deep(.overflow-y-auto::-webkit-scrollbar) {
  width: 6px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-track) {
  background: #f1f1f1;
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb) {
  background: #c1c1c1;
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
  background: #a8a8a8;
}

:deep(.dark .overflow-y-auto::-webkit-scrollbar-track) {
  background: #374151;
}

:deep(.dark .overflow-y-auto::-webkit-scrollbar-thumb) {
  background: #6b7280;
}

:deep(.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover) {
  background: #9ca3af;
}
</style>
