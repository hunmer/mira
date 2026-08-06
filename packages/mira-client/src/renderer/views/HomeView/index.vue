<script setup lang="ts">
defineOptions({ name: 'Home' })
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'

// 布局组件
import TabViewRenderer from '@renderer/components/common/TabViewRenderer.vue'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import MediaDetailComponent from '@renderer/components/business/MediaDetailComponent.vue'

// 功能子组件
import HomeHeader from './HomeHeader.vue'
import HomeSidebar from './HomeSidebar.vue'
import HomeTabsBar from './HomeTabsBar.vue'
import HomeDialogs from './HomeDialogs.vue'
import PluginContributionBar from './PluginContributionBar.vue'

// Store imports
import { useTagStore } from '@renderer/stores/tag'
import { useAuthStore } from '@renderer/stores/auth'
import { useMediaStore } from '@renderer/stores/media'
import { useLibraryStore } from '@renderer/stores/library'
import { useSettingsStore } from '@renderer/stores/settings'

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
  refreshCurrentTabAfterLibrarySwitch
} = tabManagement

// Tab 条的滚动逻辑已迁移到 HomeTabsBar 组件内

// 上传对话框的 tab 上下文
// 仅普通文件夹/标签 tab 提供真实 ID；未分类/未标签/all/trash/home 等特殊 tab 不提供，
// 避免把字面量 'uncategorized'/'untagged' 等误当作文件夹 ID 传给上传逻辑而在素材库里错误创建同名文件夹
const uploadInitialFolderId = computed<string | undefined>(() => {
  const tab = currentTab.value
  if (!tab || tab.type !== 'folder') return undefined
  const num = Number(tab.data?.id)
  return Number.isFinite(num) ? String(num) : undefined
})
const uploadInitialTagIds = computed<string[]>(() => {
  const tab = currentTab.value
  if (!tab || tab.type !== 'tag') return []
  const num = Number(tab.data?.id)
  return Number.isFinite(num) ? [String(num)] : []
})

// 从侧边栏导入本地文件夹：记录本地树并打开上传对话框
function handleImportFolder(payload: { rootPath: string; tree: any[] }) {
  uploadInitialTree.value = payload
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
  handleWindowMaximize
} = windowNavigation

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

// ============================================
// 初始化
// ============================================
const homeInit = useHomeInit()
const { performInitialization } = homeInit

let cleanupModules: (() => void) | null = null

onMounted(async () => {
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

  registerGlobalEvents(
    handleActivateLastTab,
    handleReopenClosedTab,
    handleCloseCurrentTab
  )

  // 悬浮球：监听主进程转发的消息（文件拖放 / 单击）
  window.electronAPI?.on('floating-ball-from-window', handleFloatingBallMessage)

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
  if (cleanupModules) {
    cleanupModules()
  }
  cleanupGlobalEvents(
    handleActivateLastTab,
    handleReopenClosedTab,
    handleCloseCurrentTab
  )
  // 悬浮球：移除监听
  window.electronAPI?.removeAllListeners('floating-ball-from-window')
})
</script>

<template>
  <div class="home-view h-screen flex flex-col text-[13px] relative" style="background: linear-gradient(to bottom right, var(--glass-tint-1), var(--glass-tint-2), var(--glass-tint-3))">
    <!-- HomeHeader 始终悬浮于右上角，与详情侧栏开关无关（不再参与第三列布局） -->
    <HomeHeader
      class="absolute top-3 right-3 z-30"
      :is-desktop="isDesktop"
      @upload="showFileUploadDialog = true"
      @plugins="showPluginsDialog = true"
      @shortcuts="showShortcutDialog = true"
      @settings="showSettingsDialog = true"
      @logout="handleLogout"
      @window-minimize="handleWindowMinimize"
      @window-maximize="handleWindowMaximize"
      @window-close="handleWindowClose"
    />

    <!-- 主内容区域（左侧栏 + 中间内容 + 右侧列） -->
    <div class="flex flex-1 min-h-0 p-3 gap-3">
      <ResizablePanelGroup direction="horizontal" auto-save-id="home-sidebar" class="flex-1 min-w-0 !overflow-visible">
        <!-- 左侧侧边栏（玻璃面板） -->
        <ResizablePanel :default-size="20" :min-size="15" class="rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] flex flex-col overflow-hidden">
          <HomeSidebar
            ref="sidebarRef"
            :home-controller="homeController"
            :tags="tagStore.tags"
            @folder-select="handleFolderSelect"
            @tag-select="handleTagSelect"
            @refresh-folders="handleRefreshFolders"
            @refresh-tags="handleRefreshTags"
            @empty-trash="handleEmptyTrash"
            @import-folder="handleImportFolder"
            @select-collection="handleSelectCollectionAndRefresh"
            @access-denied="showAccessDeniedDialog = true"
            @show-library-management="showLibraryManagement"
            @add-server="handleAddServer"
            @manage-folders="showFolderManageDialog = true"
            @manage-tags="showTagManageDialog = true"
            @show-about="showAboutDialog = true"
          />
        </ResizablePanel>

        <ResizableHandle class="w-3 bg-transparent hover:bg-transparent focus-visible:ring-0" />

        <!-- 中间列：Tabs 条 + 内容面板 -->
        <ResizablePanel :default-size="80" :min-size="50" class="flex flex-col min-w-0 !overflow-visible">
          <!-- Tabs 条（固定高度与右侧悬浮 HomeHeader 对齐，隐藏滚动条）。
               HomeHeader 始终悬浮于右上角，右侧固定留出 header 宽度避免遮挡 tabs -->
          <div class="shrink-0 h-[56px] px-2 pr-[220px] flex items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <HomeTabsBar
              :active-tabs="activeTabs"
              :tab-context-menu-items="tabContextMenuItems"
              :is-tab-closable="tabsComposable.isTabClosable"
              :on-activate-last-tab="handleActivateLastTab"
              :on-switch-tab="switchToTabWithCallback"
              :on-close-tab="closeTabWithCallback"
              :on-context-menu="handleTabContextMenu"
            />
          </div>

          <!-- 内容面板（玻璃磨砂） -->
          <div class="flex-1 rounded-2xl border border-white/60 dark:border-border bg-white/30 dark:bg-muted/50 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] overflow-hidden flex flex-col">
            <main ref="mainContentRef" class="flex-1 flex overflow-hidden relative min-w-0 p-2 gap-2">
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
                    <h2 class="text-xl font-medium text-foreground mb-2 animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_60ms_both]">欢迎使用 Mira</h2>
                    <p class="text-muted-foreground animate-[fadeUp_300ms_cubic-bezier(0.23,1,0.32,1)_120ms_both]">从左侧选择文件夹或标签来开始浏览您的媒体文件</p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <!-- 右侧列：始终保持常规列布局（不随侧栏开关切换 display）。
           HomeHeader 已抽离为始终悬浮于右上角，这里顶部留出 Header 高度避免被遮挡。
           折叠时只剩纵向 PluginContributionBar 竖条；展开时纵向竖条 + 详情面板。 -->
      <div class="shrink-0 min-w-0 flex flex-col gap-3 pt-14">

        <!-- 插件贡献栏：始终纵向展示在第三列（Header 下方） -->
        <PluginContributionBar vertical />

        <!-- 图片详情面板 -->
        <Transition
          enter-active-class="transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
          leave-active-class="transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.4,0,1,1)]"
          enter-from-class="opacity-0 translate-x-4"
          leave-to-class="opacity-0 translate-x-4"
        >
          <aside
            v-if="showDetailSidebar"
            class="w-72 flex-1 min-w-0 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] overflow-hidden flex flex-col"
          >
            <div class="p-4 flex-1 overflow-y-auto">
              <MediaDetailComponent
                :item="detailSidebarItem"
                :items="detailSidebarItems"
                :library-id="detailLibraryId"
                @tag-add="handleDetailTagAdd"
                @tag-remove="handleDetailTagRemove"
                @folder-change="handleDetailFolderChange"
              />
            </div>
          </aside>
        </Transition>
      </div>
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
      @create-library="handleCreateLibrary"
      @edit-server="handleEditServer"
      @add-server="handleAddServer"
      @server-saved="handleServerSaved"
      @select-folder="handleFolderSelect"
      @select-tag="handleTagSelect"
    />
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
