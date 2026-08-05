<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLibraryStore } from '@/renderer/stores/library'
import { useSettingsStore } from '@/renderer/stores/settings'
import { useServerListStore } from '@/renderer/stores/serverList'
import { useAuthStore } from '@/renderer/stores/auth'

defineOptions({ name: 'HomeHeader' })

const props = defineProps<{
  activeTabs: any[]
  currentTab: any
  tabContextMenuItems: any[]
  isTabClosable: (id: string) => boolean
  isDesktop: boolean
}>()

const emit = defineEmits<{
  selectCollection: [collection: any]
  accessDenied: []
  showLibraryManagement: []
  addServer: []
  activateLastTab: []
  reopenClosedTab: []
  locateInSidebar: []
  switchTab: [id: string]
  closeTab: [id: string]
  tabContextMenu: [tab: any, event: MouseEvent]
  windowMinimize: []
  windowMaximize: []
  windowClose: []
}>()

const handleLocateInSidebarClick = () => {
  console.log('[DEBUG-locate-sidebar] header click', {
    currentTabId: props.currentTab?.id,
    currentTabType: props.currentTab?.type,
  })
  emit('locateInSidebar')
}

const libraryStore = useLibraryStore()
const settingsStore = useSettingsStore()
const serverListStore = useServerListStore()
const authStore = useAuthStore()

const tabScrollContainer = ref<HTMLElement>()

watch(() => props.currentTab?.id, () => {
  nextTick(() => {
    const container = tabScrollContainer.value
    if (!container) return
    const active = container.querySelector('[data-active-tab="true"]') as HTMLElement
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  })
})

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
    emit('accessDenied')
    close()
    return
  }
  emit('selectCollection', collection)
  close()
}
</script>

<template>
  <header class="w-full flex items-center justify-between p-2 border-b border-border dark:border-border bg-white dark:bg-muted">
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
                class="flex items-center space-x-2 text-sm font-medium hover:bg-muted rounded px-3 py-2 max-w-[200px]"
              >
                <span class="material-icons text-primary">folder</span>
                <span class="truncate">{{ libraryStore.currentLibrary?.name || '未选择素材库' }}</span>
                <span class="material-symbols-outlined text-muted-foreground">keyboard_arrow_down</span>
              </button>
            </template>

            <template #content="{ close }">
              <div>
                <div class="p-2">
                  <div class="text-xs text-muted-foreground mb-2">选择素材库</div>
                  <!-- 素材库列表 -->
                  <div v-if="libraryStore.libraries && libraryStore.libraries.length > 0">
                    <div
                      v-for="collection in libraryStore.libraries"
                      :key="collection.id"
                      class="flex items-center justify-between p-2 rounded"
                      :class="canAccessLibrary(collection)
                        ? 'hover:bg-muted dark:hover:bg-muted cursor-pointer'
                        : 'opacity-50 cursor-not-allowed bg-muted dark:bg-muted'"
                      @click="onSelectCollection(collection, close)"
                    >
                      <div class="flex items-center space-x-2">
                        <span class="material-icons text-primary">library_books</span>
                        <div>
                          <div class="font-medium text-sm">{{ collection.name }}</div>
                          <div class="text-xs text-muted-foreground">
                            {{ collection.fileCount }} 个文件 · {{ collection.type }}
                            <span v-if="!canAccessLibrary(collection)" class="text-destructive"> · 权限不足</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-1">
                        <button
                          v-if="getLibraryLocalPath(collection)"
                          class="p-1 rounded hover:bg-accent dark:hover:bg-muted text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
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
                  <div v-else class="p-3 text-center text-muted-foreground">
                    <div class="mb-2">
                      <span class="material-icons text-muted-foreground text-2xl">library_books</span>
                    </div>
                    <div class="text-sm">暂无可用素材库</div>
                    <div class="text-xs mt-1">请先连接到服务器或添加素材库</div>
                  </div>

                  <div class="border-t border-border dark:border-border mt-2 pt-2 space-y-1">
                    <button
                      class="w-full flex items-center space-x-2 p-2 text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted rounded text-sm"
                      @click="emit('showLibraryManagement'); close()"
                    >
                      <span class="material-icons">settings</span>
                      <span>服务器设置</span>
                    </button>
                    <button
                      class="w-full flex items-center space-x-2 p-2 text-primary hover:bg-primary rounded text-sm"
                      @click="emit('addServer'); close()"
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
                class="p-2 rounded-md hover:bg-muted"
                @click="emit('activateLastTab')"
              >
                <span class="material-icons text-muted-foreground">arrow_back</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">激活上一次的tab (Ctrl+Shift+Tab)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="p-2 rounded-md hover:bg-muted"
                @click="emit('reopenClosedTab')"
              >
                <span class="material-icons text-muted-foreground">redo</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">打开最后关闭的tab (Ctrl+Shift+T)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider v-if="currentTab && currentTab.type !== 'home'">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="p-2 rounded-md hover:bg-muted"
                @click="handleLocateInSidebarClick"
              >
                <span class="material-icons text-muted-foreground">my_location</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">在侧边栏中定位当前项</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <!-- Tabs 导航 -->
      <div class="flex items-center flex-1 min-w-0 mt-2">
        <ContextMenu>
          <ContextMenuTrigger as-child>
            <div ref="tabScrollContainer" class="flex bg-muted dark:bg-muted rounded-lg p-1 overflow-x-auto max-w-full scrollbar-thin">
              <button
                v-for="tab in activeTabs"
                :key="tab.id"
                :data-active-tab="tab.active"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-md flex items-center space-x-2 shrink-0',
                  tab.active
                    ? 'text-primary dark:text-primary bg-white dark:bg-muted shadow-sm'
                    : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/50'
                ]"
                @click="emit('switchTab', tab.id)"
                @contextmenu="tab.type === 'home' ? $event.preventDefault() : emit('tabContextMenu', tab, $event)"
              >
                <span class="material-icons text-sm" :style="{ color: tab.iconColor }">
                  {{ tab.icon }}
                </span>
                <span class="truncate">{{ tab.label }}</span>
                <button
                  v-if="activeTabs.length > 1 && isTabClosable(tab.id)"
                  class="hover:bg-accent rounded-full"
                  style="line-height: 0;"
                  @click.stop="emit('closeTab', tab.id)"
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
      <div class="h-5 border-l border-border"></div>
      <!-- 窗口控制按钮 - 仅桌面端显示 -->
      <div v-if="isDesktop" class="flex items-center space-x-1 ml-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                @click="emit('windowMinimize')"
                class="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <span class="material-icons text-muted-foreground" style="font-size: 16px;">remove</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">最小化</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                @click="emit('windowMaximize')"
                class="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <span class="material-icons text-muted-foreground" style="font-size: 16px;">crop_square</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">最大化</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                @click="emit('windowClose')"
                class="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <span class="material-icons text-muted-foreground" style="font-size: 16px;">close</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">关闭</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  </header>
</template>
