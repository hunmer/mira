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
import { ref, computed, onMounted, onUnmounted, toRaw, watch } from 'vue'
import { useLibraryStore } from '@/renderer/stores/library'
import { useSettingsStore } from '@/renderer/stores/settings'
import { useServerListStore } from '@/renderer/stores/serverList'
import { useAuthStore } from '@/renderer/stores/auth'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { environment } from '@renderer/utils'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import { Badge } from '@/components/ui/badge'
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
const showCacheSettings = ref(false)
const isElectron = computed(() => Boolean(window.electronAPI))
const cacheLibrary = ref<any | null>(null)
interface BrowserViewState {
  enabled: boolean
  activeId: string
  activeLibraryId: string | null
  runningLibraryIds: string[]
  canCloseCurrent: boolean
}
const browserViewState = ref<BrowserViewState>({
  enabled: false,
  activeId: 'default',
  activeLibraryId: null,
  runningLibraryIds: [],
  canCloseCurrent: false,
})
const multiLibraryViewsEnabled = computed(() =>
  isElectron.value && browserViewState.value.enabled
)
const hasOtherBrowserViews = computed(() => browserViewState.value.runningLibraryIds.length > 1)

const updateBrowserViewState = (state?: BrowserViewState) => {
  if (!state) return
  browserViewState.value = state
  settingsStore.settings.multiLibraryViewsEnabled = state.enabled
}

const activateLibrary = (libraryId: string) => {
  const library = libraryStore.libraries.find(item => String(item.id) === String(libraryId))
  if (!library) return
  localStorage.setItem('mira-active-library-id', String(library.id))
  emit('selectCollection', library)
}

let removeStateListener: (() => void) | undefined
let removeActivateListener: (() => void) | undefined

onMounted(() => {
  removeStateListener = window.electronAPI?.on('browser-view:state-changed', updateBrowserViewState)
  removeActivateListener = window.electronAPI?.on('browser-view:activate-library', activateLibrary)
  if (window.electronAPI) {
    void (async () => {
      try {
        const state = await window.electronAPI.invoke('browser-view:get-state') as BrowserViewState
        const shouldEnableMultiViews =
          state.activeId === 'default' &&
          !state.enabled &&
          settingsStore.settings.multiLibraryViewsEnabled
        updateBrowserViewState(state)
        // 只有 default 主窗口负责首次绑定开关状态；子 BrowserView 不得因本地设置缓存过期而关闭多开。
        if (shouldEnableMultiViews) {
          const enabledState = await window.electronAPI.invoke(
            'browser-view:set-enabled',
            true,
            libraryStore.currentLibrary?.id ? String(libraryStore.currentLibrary.id) : null
          )
          updateBrowserViewState(enabledState)
        }
      } catch (error) {
        console.warn('[BrowserView][sidebar] failed to get initial state', error)
      }
    })()
  }
})

onUnmounted(() => {
  removeStateListener?.()
  removeActivateListener?.()
})

watch(() => libraryStore.currentLibrary?.id, id => {
  if (id) localStorage.setItem('mira-active-library-id', String(id))
}, { immediate: true })

async function toggleThumbnailCache(enabled: boolean) {
  const libraries = { ...settingsStore.settings.thumbnailCacheLibraries, [cacheLibrary.value.id]: enabled }
  await settingsStore.updateSetting('thumbnailCacheLibraries', libraries)
  // 已生成的素材对象仍持有旧直链，刷新后重新通过 toFileUrl() 生成缓存协议地址。
  window.location.reload()
}

async function clearThumbnailCache() {
  await window.electronAPI?.libraryCache?.clear(String(cacheLibrary.value.id))
}

/**
 * 跳转到 dashboard 的素材库设置面板，并带 lib 参数自动打开当前素材库的编辑对话框。
 * Electron 下在新 BrowserWindow 打开；Web 下回退到 window.open。
 */
async function openDashboardLibrarySettings() {
  const base = (miraSDKService.getConnectionConfig()?.serverUrl || '').replace(/\/$/, '')
  if (!base || !cacheLibrary.value) return
  const url = `${base}/dashboard/#/library?lib=${encodeURIComponent(String(cacheLibrary.value.id))}`
  if (environment.isElectron) {
    await window.electronAPI.invoke('window:open-url', url, {
      width: 1280,
      height: 800,
      title: 'Mira Dashboard',
      // 标记为 dashboard 窗口：注入 dashboard-preload，
      // 暴露 openLoginWindow / onLoginCookies 供设置页-下载 tab 使用
      dashboard: true,
    })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

function openCacheSettings(collection: any, event: Event) {
  event.stopPropagation()
  cacheLibrary.value = collection
  localStorage.setItem('mira-active-library-id', String(collection.id))
  showCacheSettings.value = true
}

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

// IPC 使用结构化克隆；Pinia 暴露的对象可能仍是 reactive Proxy，必须先转成普通 JSON。
const buildAuthBootstrap = () =>
  authStore.isLoggedIn
    ? {
        user: authStore.user ? JSON.parse(JSON.stringify(toRaw(authStore.user))) : null,
        token: authStore.token ? String(authStore.token) : null,
        refreshToken: authStore.refreshToken ? String(authStore.refreshToken) : null,
        tokenExpiration: authStore.tokenExpiration?.toISOString() || null,
      }
    : undefined

const onSelectCollection = async (collection: any, close: () => void) => {
  if (!canAccessLibrary(collection)) {
    emit('accessDenied')
    close()
    return
  }
  if (multiLibraryViewsEnabled.value) {
    try {
      const authBootstrap = buildAuthBootstrap()
      const state = await window.electronAPI.invoke('browser-view:switch', String(collection.id), authBootstrap)
      updateBrowserViewState(state)
      close()
      return
    } catch (error) {
      console.error('Failed to switch library BrowserView:', error)
    }
  }

  emit('selectCollection', collection)
  localStorage.setItem('mira-active-library-id', String(collection.id))
  close()
}

const openLibraryInNewWindow = async (collection: any, close: () => void) => {
  close()
  try {
    await window.electronAPI.invoke(
      'browser-view:open-window',
      String(collection.id),
      collection.name ?? null,
      buildAuthBootstrap()
    )
  } catch (error) {
    console.error('Failed to open library in new window:', error)
  }
}

const closeCurrentBrowserView = () => {
  if (!browserViewState.value.canCloseCurrent) return
  void window.electronAPI.invoke('browser-view:close-current').catch(error => {
    console.error('Failed to close current library BrowserView:', error)
  })
}

const closeOtherBrowserViews = async () => {
  if (!hasOtherBrowserViews.value) return
  updateBrowserViewState(await window.electronAPI.invoke('browser-view:close-others'))
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
    <div class="min-w-0 flex-1">
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
                    <div class="flex items-center gap-1.5 font-medium text-sm">
                      {{ collection.name }}
                      <Badge
                        v-if="libraryStore.currentLibrary?.id === collection.id"
                        class="h-auto px-1.5 py-0 text-[10px]"
                      >
                        {{ $t('views.sidebarLibrarySelector.active') }}
                      </Badge>
                      <Badge
                        v-else-if="browserViewState.runningLibraryIds.includes(String(collection.id))"
                        class="h-auto bg-green-600 px-1.5 py-0 text-[10px] text-white hover:bg-green-600"
                      >
                        {{ $t('views.sidebarLibrarySelector.runningInBackground') }}
                      </Badge>
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ $t('views.sidebarLibrarySelector.fileCount', { count: collection.fileCount, type: collection.type }) }}
                      <span v-if="!canAccessLibrary(collection)" class="text-destructive"> · {{ $t('views.sidebarLibrarySelector.accessDenied') }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center" @click.stop>
                  <Dropdown
                    :offset="{ x: 0, y: 4 }"
                    placement="bottom-end"
                    min-width="180px"
                  >
                    <template #trigger>
                      <button
                        class="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        :title="$t('views.sidebarLibrarySelector.moreActions')"
                      >
                        <span class="material-icons text-base">more_vert</span>
                      </button>
                    </template>
                    <template #content="{ close }">
                      <div class="bg-popover rounded-xl p-1 text-sm">
                        <button
                          v-if="isElectron"
                          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors text-left"
                          @click.stop="openLibraryInNewWindow(collection, close)"
                        >
                          <span class="material-icons text-base">open_in_new</span>
                          <span>{{ $t('views.sidebarLibrarySelector.openInNewWindow') }}</span>
                        </button>
                        <button
                          v-if="isElectron"
                          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors text-left"
                          @click.stop="openCacheSettings(collection, $event); close()"
                        >
                          <span class="material-icons text-base">settings</span>
                          <span>{{ $t('views.sidebarLibrarySelector.librarySettings') }}</span>
                        </button>
                        <button
                          v-if="getLibraryLocalPath(collection)"
                          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors text-left"
                          @click.stop="openLibraryFolder(collection, $event); close()"
                        >
                          <span class="material-icons text-base">folder_open</span>
                          <span>{{ $t('views.sidebarLibrarySelector.locate') }}</span>
                        </button>
                      </div>
                    </template>
                  </Dropdown>
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
    <template v-if="multiLibraryViewsEnabled && hasOtherBrowserViews">
      <button
        type="button"
        class="size-7 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="!browserViewState.canCloseCurrent"
        :title="$t('views.sidebarLibrarySelector.closeCurrentView')"
        @click="closeCurrentBrowserView"
      >
        <span class="material-symbols-outlined text-base">logout</span>
      </button>
      <button
        type="button"
        class="size-7 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="!hasOtherBrowserViews"
        :title="$t('views.sidebarLibrarySelector.closeOtherViews')"
        @click="closeOtherBrowserViews"
      >
        <span class="material-symbols-outlined text-base">filter_none</span>
      </button>
    </template>
  </div>
  <Teleport to="body">
    <div v-if="showCacheSettings && cacheLibrary" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" @click.self="showCacheSettings = false">
      <div class="w-80 rounded-xl bg-popover p-4 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-medium">{{ cacheLibrary.name }} · {{ $t('views.sidebarLibrarySelector.librarySettings') }}</h3>
        <button class="text-muted-foreground hover:text-foreground" @click="showCacheSettings = false">
          <span class="material-icons text-base">close</span>
        </button>
      </div>
      <label class="flex items-center justify-between gap-3 text-sm">
        <span>{{ $t('views.sidebarLibrarySelector.thumbnailCache') }}</span>
        <input
          type="checkbox"
          :checked="Boolean(settingsStore.settings.thumbnailCacheLibraries[cacheLibrary.id])"
          @change="toggleThumbnailCache(($event.target as HTMLInputElement).checked)"
        />
      </label>
      <p class="mt-2 text-xs text-muted-foreground">{{ $t('views.sidebarLibrarySelector.thumbnailCacheDesc') }}</p>
      <button class="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted" @click="clearThumbnailCache">
        {{ $t('views.sidebarLibrarySelector.clearThumbnailCache') }}
      </button>
      <button class="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/15 transition-colors" @click="openDashboardLibrarySettings">
        <span class="material-icons text-base">dashboard</span>
        {{ $t('views.sidebarLibrarySelector.openInDashboard') }}
      </button>
      </div>
    </div>
  </Teleport>
</template>
