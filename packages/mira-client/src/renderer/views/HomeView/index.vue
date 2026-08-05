<script setup lang="ts">
defineOptions({ name: 'Home' })
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// 布局组件
import TabViewRenderer from '@renderer/components/common/TabViewRenderer.vue'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import MediaDetailComponent from '@renderer/components/business/MediaDetailComponent.vue'

// 功能子组件
import HomeHeader from './HomeHeader.vue'
import HomeSidebar from './HomeSidebar.vue'
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

// Tab 条滚动容器：切换 tab 时自动滚动到可见位置
const tabScrollContainer = ref<HTMLElement>()
watch(() => currentTab.value?.id, () => {
  nextTick(() => {
    const container = tabScrollContainer.value
    if (!container) return
    const active = container.querySelector('[data-active-tab="true"]') as HTMLElement
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  })
})

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
  <div class="home-view h-screen flex flex-col text-[13px] bg-gradient-to-br from-[#e3e7f7] via-[#eceefc] to-[#dde3f5] dark:from-muted dark:via-muted dark:to-muted">
    <!-- 主内容区域（左侧栏 + 中间内容 + 右侧列） -->
    <div class="flex flex-1 overflow-hidden p-3 gap-3">
      <ResizablePanelGroup direction="horizontal" auto-save-id="home-sidebar" class="flex-1">
        <!-- 左侧侧边栏（玻璃面板） -->
        <ResizablePanel :default-size="20" :min-size="15" class="rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] flex flex-col overflow-hidden">
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
        <ResizablePanel :default-size="80" :min-size="50" class="flex flex-col min-w-0 overflow-hidden">
          <!-- Tabs 条（固定高度与右侧 HomeHeader 对齐，内容面板顶与详情面板顶对齐；隐藏滚动条） -->
          <div class="shrink-0 h-[56px] px-2 flex items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <!-- 导航按钮（原 HomeHeader 迁入） -->
            <div class="flex items-center gap-0.5 shrink-0 mb-0.5 mr-1">
              <button
                class="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-white/50 hover:backdrop-blur-xl transition-colors"
                title="激活上一次的tab (Ctrl+Shift+Tab)"
                @click="handleActivateLastTab"
              >
                <span class="material-icons">arrow_back</span>
              </button>
              <button
                class="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-white/50 hover:backdrop-blur-xl transition-colors"
                title="打开最后关闭的tab (Ctrl+Shift+T)"
                @click="handleReopenClosedTab"
              >
                <span class="material-icons">redo</span>
              </button>
              <button
                v-if="currentTab && currentTab.type !== 'home'"
                class="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-white/50 hover:backdrop-blur-xl transition-colors"
                title="在侧边栏中定位当前项"
                @click="handleLocateInSidebar"
              >
                <span class="material-icons">my_location</span>
              </button>
            </div>
            <ContextMenu>
              <ContextMenuTrigger as-child>
                <div ref="tabScrollContainer" class="flex items-end gap-1 h-full">
                  <button
                    v-for="tab in activeTabs"
                    :key="tab.id"
                    :data-active-tab="tab.active"
                    :class="[
                      'flex items-center space-x-2 shrink-0 text-sm font-medium transition-colors',
                      tab.active
                        ? 'relative z-10 px-4 py-2 -mb-px rounded-t-2xl border border-b-0 border-white/60 dark:border-border bg-white/30 dark:bg-muted/50 backdrop-blur-xl text-primary shadow-[0_-4px_16px_rgba(99,102,241,0.06)]'
                        : 'px-3 py-1.5 mb-0.5 rounded-full text-muted-foreground hover:text-primary hover:bg-white/50 dark:hover:bg-muted/50 hover:backdrop-blur-xl hover:shadow-[0_-4px_16px_rgba(99,102,241,0.06)]'
                    ]"
                    @click="switchToTabWithCallback(tab.id)"
                    @contextmenu="tab.type === 'home' ? $event.preventDefault() : handleTabContextMenu(tab, $event)"
                  >
                    <span class="material-icons text-sm" :style="{ color: tab.iconColor }">
                      {{ tab.icon }}
                    </span>
                    <span class="truncate max-w-[140px]">{{ tab.label }}</span>
                    <button
                      v-if="activeTabs.length > 1 && tabsComposable.isTabClosable(tab.id)"
                      class="hover:bg-primary/10 rounded-full"
                      style="line-height: 0;"
                      @click.stop="closeTabWithCallback(tab.id)"
                    >
                      <span class="material-icons text-xs">close</span>
                    </button>
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  v-for="item in tabContextMenuItems"
                  :key="item.label"
                  @click="item.command?.()"
                >
                  {{ item.label }}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>

          <!-- 内容面板（玻璃磨砂） -->
          <div class="flex-1 rounded-2xl border border-white/60 dark:border-border bg-white/30 dark:bg-muted/50 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] overflow-hidden flex flex-col">
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
                  <div class="text-center rounded-2xl border border-white/60 dark:border-border bg-white/50 dark:bg-muted/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] px-10 py-8">
                    <span class="material-icons text-6xl text-primary/60 mb-4">home</span>
                    <h2 class="text-xl font-medium text-foreground mb-2">欢迎使用 Mira</h2>
                    <p class="text-muted-foreground">从左侧选择文件夹或标签来开始浏览您的媒体文件</p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <!-- 第三列：紧凑 Header（用户头像菜单 + 窗口控制，靠右） + 图片详情面板 -->
      <div class="shrink-0 flex flex-col gap-3 min-w-0">
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

        <!-- 图片简略信息面板（从中间区域迁出） -->
        <aside
          v-if="showDetailSidebar"
          class="w-72 flex-1 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] overflow-hidden flex flex-col"
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
