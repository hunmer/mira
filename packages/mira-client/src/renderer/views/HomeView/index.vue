<script setup lang="ts">
defineOptions({ name: 'Home' })
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// Component imports
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import ServerManagementDialog from '@renderer/components/business/ServerManagementDialog.vue'
import ServerEditDialog from '@renderer/components/business/ServerEditDialog.vue'
import ShortcutManagerDialog from '@renderer/components/business/ShortcutManagerDialog.vue'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import PluginsDialog from '@renderer/components/business/PluginsDialog.vue'
import SettingsDialog from '@renderer/components/business/SettingsDialog.vue'
import TabViewRenderer from '@renderer/components/common/TabViewRenderer.vue'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu'
import Dropdown from '@/components/ui/volt/Dropdown.vue'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction
} from '@/components/ui/alert-dialog'

// Store imports
import { useLibraryStore } from '@/renderer/stores/library'
import { useTagStore } from '@renderer/stores/tag'
import { useAuthStore } from '@renderer/stores/auth'
import { useDashboardStore } from '@renderer/stores/dashboard'
import { useServerListStore } from '@renderer/stores/serverList'
import { useSettingsStore } from '@renderer/stores/settings'
import { miraSDKService } from '@renderer/services/MiraSDKService'

// Controller import
import { useHomeController } from '@renderer/controllers/HomeController'

// Utils and Services
import { environment } from '@renderer/utils'
import { shortcutService } from '@renderer/services/ShortcutService'

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
const libraryStore = useLibraryStore()
const tagStore = useTagStore()

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
const showPluginsDialog = ref(false)
const showSettingsDialog = ref(false)

// ============================================
// Tab管理
// ============================================
const tabManagement = useHomeTabManagement()
const {
  tabsComposable,
  activeTabs,
  currentTab,
  currentTabViewConfig,
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
  handleCloseCurrentTab
} = tabManagement

const tabScrollContainer = ref<HTMLElement>()

watch(() => currentTab.value?.id, () => {
  nextTick(() => {
    const container = tabScrollContainer.value
    if (!container) return
    const active = container.querySelector('[data-active-tab="true"]') as HTMLElement
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  })
})

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

const authStore = useAuthStore()
const serverListStore = useServerListStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const dashboardStore = useDashboardStore()
const avatarLoadError = ref(false)

const userAvatarUrl = computed(() => {
  const userId = authStore.user?.id
  const baseUrl = dashboardStore.dashboardBaseUrl
  console.log('[AvatarDebug] userId:', userId, 'baseUrl:', baseUrl, 'user:', JSON.stringify(authStore.user))
  if (userId && baseUrl) {
    const url = dashboardStore.getUserAvatarUrl(userId)
    console.log('[AvatarDebug] resolved avatar URL:', url)
    return url
  }
  const avatar = (authStore.user as any)?.avatar
  console.log('[AvatarDebug] fallback, avatar field:', avatar)
  if (!avatar) return ''
  const base = (miraSDKService.getConnectionConfig()?.serverUrl || '').replace(/\/$/, '')
  return `${base}${avatar}`
})

watch(userAvatarUrl, (v) => { avatarLoadError.value = false; console.log('[AvatarDebug] userAvatarUrl changed:', v) })

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const showAccessDeniedDialog = ref(false)

const canAccessLibrary = (lib: { allowedRoles?: string[] }) => {
  const userRole = authStore.user?.role
  if (!userRole) return true
  if (!lib.allowedRoles || lib.allowedRoles.length === 0) return true
  return lib.allowedRoles.includes(userRole)
}

const getLibraryLocalPath = (collection: { path: string }): string | null => {
  const isDocker = settingsStore.systemHealth?.isDocker ?? false
  const smb = serverListStore.activeServer?.smb
  if (!isDocker) return collection.path
  if (!smb?.enabled || !smb.smbPath) return null
  const smbPath = smb.smbPath
  const sep = smbPath.includes('/') ? '/' : '\\'
  const normalizedSmbPath = smbPath.endsWith(sep) ? smbPath : smbPath + sep
  if (smb.mountPath && collection.path) {
    const mountPrefix = smb.mountPath.endsWith('/') ? smb.mountPath : smb.mountPath + '/'
    return collection.path.replace(mountPrefix, normalizedSmbPath).replace(/\//g, sep)
  }
  return normalizedSmbPath + collection.path.replace(/^\//, '').replace(/\//g, sep)
}

const openLibraryFolder = (collection: any, event: Event) => {
  event.stopPropagation()
  const localPath = getLibraryLocalPath(collection)
  if (!localPath) return
  const api = (window as any).electronAPI
  api?.fs?.showItemInFolder(localPath)
}

const onSelectCollection = (collection: any, close: () => void) => {
  if (!canAccessLibrary(collection)) {
    showAccessDeniedDialog.value = true
    close()
    return
  }
  handleSelectCollection(collection)
  close()
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

  // 注册全局事件（无论初始化是否成功都要注册）
  registerGlobalEvents(
    handleActivateLastTab,
    handleReopenClosedTab,
    handleCloseCurrentTab
  )
})

// ============================================
// keep-alive 滚动位置保持
// ============================================
const sidebarScrollRef = ref<HTMLElement>()
const mainContentRef = ref<HTMLElement>()
const savedScrollPositions = new Map<string, number>()

onDeactivated(() => {
  if (sidebarScrollRef.value) {
    savedScrollPositions.set('sidebar', sidebarScrollRef.value.scrollTop)
  }
  if (mainContentRef.value) {
    mainContentRef.value.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach((el, i) => {
      savedScrollPositions.set(`main-${i}`, (el as HTMLElement).scrollTop)
    })
  }
})

onActivated(() => {
  nextTick(() => {
    if (sidebarScrollRef.value && savedScrollPositions.has('sidebar')) {
      sidebarScrollRef.value.scrollTop = savedScrollPositions.get('sidebar')!
    }
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
  <div class="home-view h-screen flex flex-col bg-white dark:bg-gray-900 text-sm">
    <!-- 顶部导航菜单 -->
    <header class="w-full flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex items-center flex-1 min-w-0">
        <!-- 素材库选择 -->
        <div class="flex items-center space-x-2 mr-6 shrink-0">
          <div class="relative">
            <Dropdown
              :offset="{ x: 0, y: 4 }"
              placement="bottom-start"
              min-width="280px"
            >
              <template #trigger>
                <button
                  class="flex items-center space-x-2 text-sm font-medium hover:bg-gray-100 rounded px-3 py-2 max-w-[200px]"
                >
                  <span class="material-icons text-blue-500">folder</span>
                  <span class="truncate">{{ libraryStore.currentLibrary?.name || '未选择素材库' }}</span>
                  <span class="material-symbols-outlined text-gray-500">keyboard_arrow_down</span>
                </button>
              </template>

              <template #content="{ close }">
                <div>
                  <div class="p-2">
                    <div class="text-xs text-gray-500 mb-2">选择素材库</div>
                    <!-- 素材库列表 -->
                    <div v-if="libraryStore.libraries && libraryStore.libraries.length > 0">
                      <div
                        v-for="collection in libraryStore.libraries"
                        :key="collection.id"
                        class="flex items-center justify-between p-2 rounded"
                        :class="canAccessLibrary(collection)
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900'"
                        @click="onSelectCollection(collection, close)"
                      >
                        <div class="flex items-center space-x-2">
                          <span class="material-icons text-blue-500">library_books</span>
                          <div>
                            <div class="font-medium text-sm">{{ collection.name }}</div>
                            <div class="text-xs text-gray-500">
                              {{ collection.fileCount }} 个文件 · {{ collection.type }}
                              <span v-if="!canAccessLibrary(collection)" class="text-red-400"> · 权限不足</span>
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center space-x-1">
                          <button
                            v-if="getLibraryLocalPath(collection)"
                            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="定位到目录"
                            @click="openLibraryFolder(collection, $event)"
                          >
                            <span class="material-icons text-sm">folder_open</span>
                          </button>
                          <span
                            v-if="libraryStore.currentLibrary?.id === collection.id"
                            class="material-icons text-green-500 text-sm"
                          >
                            check
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- 无素材库提示 -->
                    <div v-else class="p-3 text-center text-gray-500">
                      <div class="mb-2">
                        <span class="material-icons text-gray-400 text-2xl">library_books</span>
                      </div>
                      <div class="text-sm">暂无可用素材库</div>
                      <div class="text-xs mt-1">请先连接到服务器或添加素材库</div>
                    </div>

                    <div class="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 space-y-1">
                      <button
                        class="w-full flex items-center space-x-2 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm"
                        @click="showLibraryManagement(); close()"
                      >
                        <span class="material-icons">settings</span>
                        <span>服务器设置</span>
                      </button>
                      <button
                        class="w-full flex items-center space-x-2 p-2 text-blue-600 hover:bg-blue-50 rounded text-sm"
                        @click="handleAddServer(); close()"
                      >
                        <span class="material-icons">add</span>
                        <span>连接服务器</span>
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </Dropdown>
          </div>
        </div>

        <!-- 导航按钮 -->
        <div class="flex items-center space-x-1 mr-4 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="p-2 rounded-md hover:bg-gray-100"
                  @click="handleActivateLastTab"
                >
                  <span class="material-icons text-gray-600">arrow_back</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">激活上一次的tab (Ctrl+Shift+Tab)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="p-2 rounded-md hover:bg-gray-100"
                  @click="handleReopenClosedTab"
                >
                  <span class="material-icons text-gray-600">redo</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">打开最后关闭的tab (Ctrl+Shift+T)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <!-- Tabs 导航 -->
        <div class="flex items-center flex-1 min-w-0 mt-2">
          <ContextMenu>
            <ContextMenuTrigger as-child>
              <div ref="tabScrollContainer" class="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto max-w-full scrollbar-thin">
                <button
                  v-for="tab in activeTabs"
                  :key="tab.id"
                  :data-active-tab="tab.active"
                  :class="[
                    'px-3 py-1.5 text-sm font-medium rounded-md flex items-center space-x-2 shrink-0',
                    tab.active
                      ? 'text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-700 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  ]"
                  @click="switchToTabWithCallback(tab.id)"
                  @contextmenu="tab.type === 'home' ? $event.preventDefault() : handleTabContextMenu(tab, $event)"
                >
                  <span class="material-icons text-sm" :style="{ color: tab.iconColor }">
                    {{ tab.icon }}
                  </span>
                  <span class="truncate">{{ tab.label }}</span>
                  <button
                    v-if="activeTabs.length > 1 && tabsComposable.isTabClosable(tab.id)"
                    class="hover:bg-gray-200 rounded-full "
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
      </div>

      <!-- 右侧工具栏 -->
      <div class="flex items-center space-x-4 shrink-0">
        <!-- 分隔符 -->
        <div class="h-5 border-l border-gray-300"></div>

        <!-- 窗口控制按钮 - 仅桌面端显示 -->
        <div v-if="isDesktop" class="flex items-center space-x-1 ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  @click="handleWindowMinimize"
                  class="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <span class="material-icons text-gray-500" style="font-size: 16px;">remove</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">最小化</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  @click="handleWindowMaximize"
                  class="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <span class="material-icons text-gray-500" style="font-size: 16px;">crop_square</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">最大化</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  @click="handleWindowClose"
                  class="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <span class="material-icons text-gray-500" style="font-size: 16px;">close</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">关闭</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>

    <!-- 主内容区域（侧边栏 + 内容） -->
    <div class="flex flex-1 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" auto-save-id="home-sidebar" class="flex-1">
        <!-- 左侧侧边栏 -->
        <ResizablePanel :default-size="20" :min-size="15" class="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <!-- 文件夹树形导航 -->
          <div ref="sidebarScrollRef" class="flex-grow p-2 overflow-y-auto min-w-0 space-y-4">
            <FolderTreeComponent
              item-type="folder"
              :draggable="true"
              :folders="homeController.folderTree.value"
              :selected-key="homeController.selectedFolder.value"
              :show-base-categories="true"
              @select="handleFolderSelect"
              @expand="homeController.handleFolderExpand"
              @refresh="handleRefreshFolders"
              @empty-trash="handleEmptyTrash"
            />
            <FolderTreeComponent
              item-type="tag"
              :tags="tagStore.tags"
              @select="handleTagSelect"
              @refresh="handleRefreshTags"
            />
          </div>
          <!-- 底部搜索胶囊 -->
          <div class="shrink-0 px-2 pb-2 pt-1">
            <button
              class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-400 text-xs"
              @click="homeController.toggleSearch"
            >
              <span class="material-icons text-sm">search</span>
              <span>搜索</span>
            </button>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <!-- 右侧主内容区 -->
        <ResizablePanel :default-size="80" :min-size="50" class="flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <!-- 主内容区域 -->
        <main ref="mainContentRef" class="flex-1 flex p-2 overflow-hidden relative min-w-0">
          <!-- Tab视图内容 -->
          <div class="flex-1 mr-2 min-w-0 overflow-hidden">
            <TabViewRenderer
              v-if="currentTab"
              :tab-id="currentTab.id"
              :view-config="currentTabViewConfig"
              :cacheable="true"
              class="w-full h-full"
            />
            <!-- 默认状态 - 没有活跃的Tab时显示 -->
            <div v-else class="flex items-center justify-center h-full">
              <div class="text-center">
                <span class="material-icons text-6xl text-gray-400 mb-4">home</span>
                <h2 class="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">欢迎使用 Mira</h2>
                <p class="text-gray-500">从左侧选择文件夹或标签来开始浏览您的媒体文件</p>
              </div>
            </div>
          </div>

          <!-- 右侧工具面板 - 始终显示 -->
          <div class="w-12 shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center py-2 space-y-2">
            <!-- 文件上传按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    @click="showFileUploadDialog = true"
                  >
                    <span class="material-icons text-gray-600 text-base">upload_file</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">上传文件</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <!-- 分隔线 -->
            <div class="w-6 border-t border-gray-200 dark:border-gray-700"></div>

            <!-- 插件管理按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    @click="showPluginsDialog = true"
                  >
                    <span class="material-icons text-gray-600 text-base">extension</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">插件管理</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <!-- 快捷键设置按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    @click="showShortcutDialog = true"
                  >
                    <span class="material-icons text-gray-600 text-base">keyboard</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">快捷键设置</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <!-- 设置按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    @click="showSettingsDialog = true"
                  >
                    <span class="material-icons text-gray-600 text-base">settings</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">应用设置</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <!-- 弹性占位 -->
            <div class="flex-1"></div>

            <!-- 用户信息 -->
            <Dropdown
              placement="bottom-end"
              min-width="180px"
            >
              <template #trigger>
                <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <img
                    v-if="userAvatarUrl && !avatarLoadError"
                    :src="userAvatarUrl"
                    alt="avatar"
                    class="w-6 h-6 rounded-full object-cover"
                    @error="avatarLoadError = true"
                  />
                  <div v-else class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {{ authStore.userDisplayName?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                </button>
              </template>
              <template #content="{ close }">
                <div class="p-3">
                  <div class="text-sm font-medium truncate">{{ authStore.userDisplayName }}</div>
                  <div v-if="authStore.user?.role" class="px-2 pb-2 text-xs text-gray-500">{{ authStore.user.role }}</div>
                  <div class="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      class="w-full flex items-center space-x-2 p-2 text-red-600 hover:bg-red-50 rounded text-sm"
                      @click="handleLogout(); close()"
                    >
                      <span class="material-icons text-base">logout</span>
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              </template>
            </Dropdown>

            <!-- 开发者工具按钮（仅在Electron环境中显示） -->
            <TooltipProvider v-if="environment.isElectron">
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    @click="shortcutService.executeAction('dev.devtools')"
                  >
                    <span class="material-icons text-gray-600 text-base">code</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">开发者工具</TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </div>
        </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>

    <!-- 无素材库提示对话框 -->
    <div
      v-if="showNoLibraryDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
        <div class="flex items-center mb-4">
          <span class="material-icons text-yellow-500 mr-3">warning</span>
          <h3 class="text-lg font-semibold">没有可用的素材库</h3>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          系统检测到您还没有创建任何素材库。素材库是用来管理和组织您的媒体文件的。
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="showNoLibraryDialog = false"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            稍后创建
          </button>
          <button
            @click="handleCreateLibrary"
            class="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md"
          >
            创建素材库
          </button>
        </div>
      </div>
    </div>

    <!-- 素材库管理对话框 -->
    <ServerManagementDialog
      v-model:visible="showServerManagementDialog"
      @edit-server="handleEditServer"
      @add-server="handleAddServer"
    />

    <!-- 素材库编辑对话框 -->
    <ServerEditDialog
      v-model:visible="showServerEditDialog"
      :library="editingServer"
      @saved="handleServerSaved"
    />

    <!-- 快捷键管理对话框 -->
    <ShortcutManagerDialog
      v-model:visible="showShortcutDialog"
    />

    <!-- 文件上传对话框 -->
    <FileUploadDialog
      v-model:visible="showFileUploadDialog"
    />

    <!-- 插件管理对话框 -->
    <PluginsDialog
      v-model:visible="showPluginsDialog"
    />

    <!-- 设置对话框 -->
    <SettingsDialog
      v-model:visible="showSettingsDialog"
    />

    <!-- 权限不足对话框 -->
    <AlertDialog v-model:open="showAccessDeniedDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>权限不足</AlertDialogTitle>
          <AlertDialogDescription>
            您的角色没有访问该素材库的权限，请选择其他素材库。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction @click="showAccessDeniedDialog = false">确定</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  </div>
</template>

<style scoped>
.home-view {
  font-size: 13px;
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

/* 悬停效果 */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

.group:hover .group-hover\:bg-black\/20 {
  background-color: rgba(0, 0, 0, 0.2);
}

/* 过渡动画 */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
