<script setup lang="ts">
import { ref, onActivated, onDeactivated, nextTick } from 'vue'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import { useLibraryStore } from '@/renderer/stores/library'
import { useSettingsStore } from '@/renderer/stores/settings'
import { useServerListStore } from '@/renderer/stores/serverList'
import { useAuthStore } from '@/renderer/stores/auth'
import { useToast } from '@/renderer/composables/useToast'
import type { LocalFsNode } from '../../../shared/types'

defineOptions({ name: 'HomeSidebar' })

defineProps<{
  homeController: {
    folderTree: { value: any[] }
    selectedFolder: { value: any }
    handleFolderExpand: (...args: any[]) => void
    toggleSearch: () => void
  }
  tags: any[]
}>()

const emit = defineEmits<{
  folderSelect: [folder: any]
  tagSelect: [tag: any]
  refreshFolders: []
  refreshTags: []
  emptyTrash: []
  selectCollection: [collection: any]
  accessDenied: []
  showLibraryManagement: []
  addServer: []
  /** 导入本地文件夹：抛出根路径 + 递归目录树给父级 */
  importFolder: [payload: { rootPath: string; tree: LocalFsNode[] }]
}>()

const toast = useToast()
const isImporting = ref(false)

// ============================================
// 素材库切换（从 HomeHeader 迁入）
// ============================================
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

/**
 * 导入本地文件夹：
 * 1. 选择目录 -> 2. 递归读取目录树 -> 3. 抛给父级打开上传对话框
 */
async function handleImportFolder() {
  if (isImporting.value) return
  isImporting.value = true
  try {
    const dirRes = await window.electronAPI.fs.selectDirectory('选择要导入的文件夹')
    if (!dirRes.success || !dirRes.path) return // 用户取消

    const treeRes = await window.electronAPI.fs.readDirTree(dirRes.path)
    if (!treeRes.success || !treeRes.data) {
      toast.add({ severity: 'error', summary: '导入失败', detail: treeRes.message || '读取文件夹结构失败', life: 3000 })
      return
    }

    emit('importFolder', { rootPath: dirRes.path, tree: treeRes.data })
  } catch (error) {
    console.error('导入文件夹失败:', error)
    toast.add({
      severity: 'error',
      summary: '导入失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 3000
    })
  } finally {
    isImporting.value = false
  }
}

// keep-alive 滚动位置保持
const sidebarScrollRef = ref<HTMLElement>()
const savedScrollTop = ref(0)
const folderTreeRef = ref<{ locateNode: (id: string) => Promise<boolean> }>()
const tagTreeRef = ref<{ locateNode: (id: string) => Promise<boolean> }>()

onDeactivated(() => {
  if (sidebarScrollRef.value) {
    savedScrollTop.value = sidebarScrollRef.value.scrollTop
  }
})

onActivated(() => {
  nextTick(() => {
    if (sidebarScrollRef.value) {
      sidebarScrollRef.value.scrollTop = savedScrollTop.value
    }
  })
})

const locateItem = async (type: 'folder' | 'tag', id: string) => {
  await nextTick()
  const container = sidebarScrollRef.value
  console.log('[DEBUG-locate-sidebar] sidebar locateItem start', {
    type,
    id,
    hasContainer: Boolean(container),
    hasFolderTreeRef: Boolean(folderTreeRef.value),
    hasTagTreeRef: Boolean(tagTreeRef.value),
  })
  if (!container) return

  let nodeId = id
  if (type === 'tag' && !id.startsWith('tag-')) {
    nodeId = `tag-${id}`
  } else if (type === 'folder' && id.startsWith('folder-')) {
    nodeId = id.slice('folder-'.length)
  }

  const tree = type === 'tag' ? tagTreeRef.value : folderTreeRef.value
  console.log('[DEBUG-locate-sidebar] sidebar normalized target', {
    type,
    nodeId,
    hasTreeRef: Boolean(tree),
  })
  const locatedByTree = await tree?.locateNode(nodeId)
  console.log('[DEBUG-locate-sidebar] sidebar tree locate result', {
    nodeId,
    locatedByTree,
  })
  if (locatedByTree) return

  const el = container.querySelector(`[data-folder-tree-node-id="${nodeId}"]`) as HTMLElement
  console.log('[DEBUG-locate-sidebar] sidebar fallback query', {
    nodeId,
    found: Boolean(el),
  })
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({ locateItem })
</script>

<template>
  <!-- 素材库选择（从 HomeHeader 迁入，位于侧栏顶部） -->
  <div class="shrink-0 px-2 pt-2 pb-1">
    <Dropdown
      :offset="{ x: 0, y: 4 }"
      placement="bottom-start"
      min-width="280px"
    >
      <template #trigger>
        <button
          class="w-full flex items-center space-x-2 text-sm font-medium rounded-xl bg-primary/10 text-primary hover:bg-primary/15 transition-colors px-3 py-2"
        >
          <span class="material-icons">folder</span>
          <span class="truncate flex-1 text-left">{{ libraryStore.currentLibrary?.name || '未选择素材库' }}</span>
          <span class="material-symbols-outlined text-primary/60">keyboard_arrow_down</span>
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
                      {{ collection.fileCount }} 个文件 · {{ collection.type }}
                      <span v-if="!canAccessLibrary(collection)" class="text-destructive"> · 权限不足</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-1">
                  <button
                    v-if="getLibraryLocalPath(collection)"
                    class="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="定位到目录"
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
              <div class="text-sm">暂无可用素材库</div>
              <div class="text-xs mt-1">请先连接到服务器或添加素材库</div>
            </div>

            <div class="border-t border-border/60 mt-2 pt-2 space-y-1">
              <button
                class="w-full flex items-center space-x-2 p-2 text-muted-foreground hover:bg-primary/5 hover:text-foreground rounded-lg text-sm transition-colors"
                @click="emit('showLibraryManagement'); close()"
              >
                <span class="material-icons">settings</span>
                <span>服务器设置</span>
              </button>
              <button
                class="w-full flex items-center space-x-2 p-2 text-primary hover:bg-primary/10 rounded-lg text-sm transition-colors"
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

  <!-- 顶部横向图标按钮列表 -->
  <div class="shrink-0 flex items-center gap-1.5 px-2 py-2">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isImporting"
          title="导入"
        >
          <span class="material-icons leading-none" style="font-size: 18px">
            {{ isImporting ? 'hourglass_top' : 'drive_folder_upload' }}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-40">
        <DropdownMenuItem @click="handleImportFolder">
          <span class="material-icons text-base mr-2">folder_open</span>
          <span>导入文件夹</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  <!-- 文件夹树形导航 -->
  <div ref="sidebarScrollRef" class="flex-grow p-2 overflow-y-auto min-w-0 space-y-4">
    <FolderTreeComponent
      ref="folderTreeRef"
      item-type="folder"
      :draggable="true"
      :folders="homeController.folderTree.value"
      :selected-key="homeController.selectedFolder.value"
      :show-base-categories="true"
      @select="emit('folderSelect', $event)"
      @expand="homeController.handleFolderExpand"
      @refresh="emit('refreshFolders')"
      @empty-trash="emit('emptyTrash')"
    />
    <FolderTreeComponent
      ref="tagTreeRef"
      item-type="tag"
      :tags="tags"
      @select="emit('tagSelect', $event)"
      @refresh="emit('refreshTags')"
    />
  </div>
  <!-- 底部搜索胶囊 -->
  <div class="shrink-0 px-2 pb-2 pt-1">
    <button
      class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors cursor-pointer text-xs font-medium"
      @click="homeController.toggleSearch"
    >
      <span class="material-icons text-sm">search</span>
      <span>搜索</span>
    </button>
  </div>
</template>
