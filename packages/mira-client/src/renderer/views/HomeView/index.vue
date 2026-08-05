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
import MediaDetailComponent from '@renderer/components/business/MediaDetailComponent.vue'

// 功能子组件
import HomeHeader from './HomeHeader.vue'
import HomeSidebar from './HomeSidebar.vue'
import HomeTabsBar from './HomeTabsBar.vue'
import HomeDialogs from './HomeDialogs.vue'

// Store imports
import { useTagStore } from '@renderer/stores/tag'
import { useAuthStore } from '@renderer/stores/auth'
import { useMediaStore } from '@renderer/stores/media'
import { useLibraryStore } from '@renderer/stores/library'

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
  <div class="home-view h-screen flex flex-col text-[13px] relative" style="background: linear-gradient(to bottom right, var(--glass-tint-1), var(--glass-tint-2), var(--glass-tint-3))">
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
          />
        </ResizablePanel>

        <ResizableHandle class="w-3 bg-transparent hover:bg-transparent focus-visible:ring-0" />

        <!-- 中间列：Tabs 条 + 内容面板 -->
        <ResizablePanel :default-size="80" :min-size="50" class="flex flex-col min-w-0 !overflow-visible">
          <!-- Tabs 条（固定高度与右侧 HomeHeader 对齐，内容面板顶与详情面板顶对齐；隐藏滚动条） -->
          <!-- 侧栏隐藏时 HomeHeader 悬浮于右上角，为避免遮挡 tabs，右侧留出 header 宽度 -->
          <div
            class="shrink-0 h-[56px] px-2 flex items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[padding] duration-150"
            :class="showDetailSidebar ? 'pr-2' : 'pr-[220px]'"
          >
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

      <!-- 右侧列：详情侧栏可见时为常规列（Header 在上、侧栏在下，互不重叠）；
           侧栏隐藏时整体悬浮于右上角，仅留 Header，中间内容自动占满全宽 -->
      <div
        class="flex flex-col gap-3 transition-[position] duration-200"
        :class="showDetailSidebar
          ? 'shrink-0 min-w-0'
          : 'absolute top-3 right-3 z-20'"
      >
        <HomeHeader
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
