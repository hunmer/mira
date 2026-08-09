<script setup lang="ts">
/**
 * SidebarLibrarySelector —— HomeSidebar 顶部素材库选择区。
 *
 * 包含：
 *   - Mira logo（点击 → 关于对话框）
 *   - 素材库下拉：列表展示 + 权限校验 + 定位本地目录 + 服务器设置 / 连接服务器入口
 *
 * 由原 HomeSidebar 拆出，逻辑零改动，仅上抛事件给父级（HomeSidebar 编排壳）。
 */
import { useLibraryStore } from '@/renderer/stores/library'
import { useSettingsStore } from '@/renderer/stores/settings'
import { useServerListStore } from '@/renderer/stores/serverList'
import { useAuthStore } from '@/renderer/stores/auth'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import miraLogo from '@/renderer/assets/mira-logo.png'

defineOptions({ name: 'SidebarLibrarySelector' })

const emit = defineEmits<{
  selectCollection: [collection: any]
  accessDenied: []
  showLibraryManagement: []
  addServer: []
  /** 打开关于对话框 */
  showAbout: []
}>()

const libraryStore = useLibraryStore()
const settingsStore = useSettingsStore()
const serverListStore = useServerListStore()
const authStore = useAuthStore()

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
  <!-- 素材库选择（从 HomeHeader 迁入，位于侧栏顶部） -->
  <div class="shrink-0 px-2 pt-2 pb-1 flex items-center gap-2">
    <button
      type="button"
      class="size-7 shrink-0 rounded-lg hover:opacity-80 active:scale-95 transition cursor-pointer"
      :title="$t('views.sidebarLibrarySelector.about')"
      @click="emit('showAbout')"
    >
      <img
        :src="miraLogo"
        alt="Mira"
        class="size-full rounded-lg"
        draggable="false"
      />
    </button>
    <Dropdown
      :offset="{ x: 0, y: 4 }"
      placement="bottom-start"
      min-width="280px"
      full-width
    >
      <template #trigger>
        <button
          class="w-full flex items-center space-x-2 text-sm font-medium rounded-xl bg-primary/10 text-primary hover:bg-primary/15 transition-colors px-3 py-2"
        >
          <span class="material-icons">folder</span>
          <span class="truncate flex-1 text-left">{{ libraryStore.currentLibrary?.name || $t('views.sidebarLibrarySelector.noLibrary') }}</span>
          <span class="material-symbols-outlined text-primary/60">keyboard_arrow_down</span>
        </button>
      </template>

      <template #content="{ close }">
        <div class="bg-popover rounded-2xl">
          <div class="p-2">
            <div class="text-xs text-muted-foreground mb-2">{{ $t('views.sidebarLibrarySelector.selectLibrary') }}</div>
            <!-- 素材库列表 -->
            <div v-if="libraryStore.libraries && libraryStore.libraries.length > 0">
              <div
                v-for="collection in libraryStore.libraries"
                :key="collection.id"
                class="flex items-center justify-between p-2 rounded-lg"
                :class="canAccessLibrary(collection)
                  ? 'hover:bg-primary/5 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed bg-muted dark:bg-muted'"
                @click="onSelectCollection(collection, close)"
              >
                <div class="flex items-center space-x-2">
                  <span class="material-icons text-primary">library_books</span>
                  <div>
                    <div class="font-medium text-sm">{{ collection.name }}</div>
                    <div class="text-xs text-muted-foreground">
                      {{ $t('views.sidebarLibrarySelector.fileCount', { count: collection.fileCount, type: collection.type }) }}
                      <span v-if="!canAccessLibrary(collection)" class="text-destructive"> · {{ $t('views.sidebarLibrarySelector.accessDenied') }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-1">
                  <button
                    v-if="getLibraryLocalPath(collection)"
                    class="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    :title="$t('views.sidebarLibrarySelector.locate')"
                    @click="openLibraryFolder(collection, $event)"
                  >
                    <span class="material-icons text-sm">folder_open</span>
                  </button>
                  <span
                    v-if="libraryStore.currentLibrary?.id === collection.id"
                    class="material-icons text-primary text-sm"
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
              <div class="text-sm">{{ $t('views.sidebarLibrarySelector.emptyTitle') }}</div>
              <div class="text-xs mt-1">{{ $t('views.sidebarLibrarySelector.emptyDesc') }}</div>
            </div>

            <div class="border-t border-border/60 mt-2 pt-2 space-y-1">
              <button
                class="w-full flex items-center space-x-2 p-2 text-muted-foreground hover:bg-primary/5 hover:text-foreground rounded-lg text-sm transition-colors"
                @click="emit('showLibraryManagement'); close()"
              >
                <span class="material-icons">settings</span>
                <span>{{ $t('views.sidebarLibrarySelector.serverSettings') }}</span>
              </button>
              <button
                class="w-full flex items-center space-x-2 p-2 text-primary hover:bg-primary/10 rounded-lg text-sm transition-colors"
                @click="emit('addServer'); close()"
              >
                <span class="material-icons">add</span>
                <span>{{ $t('views.sidebarLibrarySelector.connectServer') }}</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </Dropdown>
  </div>
</template>
