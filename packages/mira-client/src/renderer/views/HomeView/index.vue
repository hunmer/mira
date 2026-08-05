<script setup lang="ts">
defineOptions({ name: 'Home' })
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// 布局组件
import TabViewRenderer from '@renderer/components/common/TabViewRenderer.vue'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

// 功能子组件
import HomeHeader from './HomeHeader.vue'
import HomeSidebar from './HomeSidebar.vue'
import HomeToolbar from './HomeToolbar.vue'
import HomeDialogs from './HomeDialogs.vue'

// Store imports
import { useTagStore } from '@renderer/stores/tag'
import { useAuthStore } from '@renderer/stores/auth'

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
const router = useRouter()

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

// ============================================
// Tab管理
// ============================================
const tabManagement = useHomeTabManagement()
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

// 侧边栏定位
const sidebarRef = ref<{ locateItem: (type: 'folder' | 'tag', id: string) => void | Promise<void> }>()
const handleLocateInSidebar = () => {
  const tab = currentTab.value
  console.log('[DEBUG-locate-sidebar] home handleLocateInSidebar', {
    hasTab: Boolean(tab),
    tabId: tab?.id,
    tabType: tab?.type,
    hasSidebarRef: Boolean(sidebarRef.value),
  })
  if (!tab) return
  const type = tab.type === 'tag' ? 'tag' as const : 'folder' as const
  const targetId = String(tab.data?.id ?? tab.id)
  console.log('[DEBUG-locate-sidebar] home call sidebar.locateItem', {
    type,
    id: targetId,
  })
  sidebarRef.value?.locateItem(type, targetId)
}

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
})
</script>

<template>
  <div class="home-view h-screen flex flex-col text-[13px] bg-gradient-to-br from-[#edeffa] via-[#f3f4fb] to-[#e8ebf8] dark:from-muted dark:via-muted dark:to-muted">
    <!-- 顶部导航菜单（悬浮玻璃栏） -->
    <div class="shrink-0 px-3 pt-3">
      <HomeHeader
      :active-tabs="activeTabs"
      :current-tab="currentTab"
      :tab-context-menu-items="tabContextMenuItems"
      :is-tab-closable="tabsComposable.isTabClosable"
      :is-desktop="isDesktop"
      @select-collection="handleSelectCollectionAndRefresh"
      @access-denied="showAccessDeniedDialog = true"
      @show-library-management="showLibraryManagement"
      @add-server="handleAddServer"
      @activate-last-tab="handleActivateLastTab"
      @reopen-closed-tab="handleReopenClosedTab"
      @switch-tab="switchToTabWithCallback"
      @close-tab="closeTabWithCallback"
      @tab-context-menu="handleTabContextMenu"
      @window-minimize="handleWindowMinimize"
      @window-maximize="handleWindowMaximize"
      @window-close="handleWindowClose"
      @locate-in-sidebar="handleLocateInSidebar"
    />
    </div>

    <!-- 主内容区域（侧边栏 + 内容） -->
    <div class="flex flex-1 overflow-hidden p-3 gap-3">
      <ResizablePanelGroup direction="horizontal" auto-save-id="home-sidebar" class="flex-1">
        <!-- 左侧侧边栏（玻璃面板） -->
        <ResizablePanel :default-size="20" :min-size="15" class="rounded-2xl border border-white/60 dark:border-border bg-white/60 dark:bg-muted/60 backdrop-blur-xl shadow-[0_8px_30px_rgba(99,102,241,0.06)] flex flex-col overflow-hidden">
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
          />
        </ResizablePanel>

        <ResizableHandle class="w-3 bg-transparent hover:bg-transparent focus-visible:ring-0" />

        <!-- 右侧主内容区（玻璃面板） -->
        <ResizablePanel :default-size="80" :min-size="50" class="flex flex-col rounded-2xl border border-white/60 dark:border-border bg-white/50 dark:bg-muted/50 backdrop-blur-xl shadow-[0_8px_30px_rgba(99,102,241,0.06)] overflow-hidden">
          <main ref="mainContentRef" class="flex-1 flex overflow-hidden relative min-w-0 p-2 gap-2">
            <!-- Tab视图内容 -->
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
                <div class="text-center rounded-2xl border border-white/60 dark:border-border bg-white/70 dark:bg-muted/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(99,102,241,0.08)] px-10 py-8">
                  <span class="material-icons text-6xl text-primary/60 mb-4">home</span>
                  <h2 class="text-xl font-medium text-foreground mb-2">欢迎使用 Mira</h2>
                  <p class="text-muted-foreground">从左侧选择文件夹或标签来开始浏览您的媒体文件</p>
                </div>
              </div>
            </div>

            <!-- 右侧工具面板 -->
            <HomeToolbar
              @upload="showFileUploadDialog = true"
              @plugins="showPluginsDialog = true"
              @shortcuts="showShortcutDialog = true"
              @settings="showSettingsDialog = true"
              @logout="handleLogout"
            />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
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
      :editing-server="editingServer"
      :upload-initial-folder-id="uploadInitialFolderId"
      :upload-initial-tag-ids="uploadInitialTagIds"
      :upload-initial-tree="uploadInitialTree"
      @create-library="handleCreateLibrary"
      @edit-server="handleEditServer"
      @add-server="handleAddServer"
      @server-saved="handleServerSaved"
    />
  </div>
</template>

<style scoped>
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
