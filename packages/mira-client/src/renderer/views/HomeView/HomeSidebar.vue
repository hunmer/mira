<script setup lang="ts">
import { ref, computed, onActivated, onDeactivated, nextTick, reactive } from 'vue'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import SidebarHistoryModule from './SidebarHistoryModule.vue'
import SidebarLayoutDialog from './SidebarLayoutDialog.vue'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import { useLibraryStore } from '@/renderer/stores/library'
import { useSettingsStore } from '@/renderer/stores/settings'
import { useServerListStore } from '@/renderer/stores/serverList'
import { useAuthStore } from '@/renderer/stores/auth'
import { useHomeSidebarLayoutStore } from '@/renderer/stores/homeSidebarLayout'
import { useToast } from '@/renderer/composables/useToast'
import { getModuleDef, type SidebarModuleId } from './sidebarModules'
import type { LocalFsNode } from '../../../shared/types'
import miraLogo from '@/renderer/assets/mira-logo.png'

defineOptions({ name: 'HomeSidebar' })

defineProps<{
  homeController: {
    folderTree: { value: any[] }
    selectedFolder: { value: any }
    handleFolderExpand: (...args: any[]) => void
    toggleSearch: () => void
  }
  tags: any[]
  /** 当前素材库 id（history 模块需要） */
  libraryId: string
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
  /** 打开文件夹管理对话框 */
  manageFolders: []
  /** 打开标签管理对话框 */
  manageTags: []
  /** 打开关于对话框 */
  showAbout: []
  /** 导入本地文件夹：抛出根路径 + 递归目录树给父级 */
  importFolder: [payload: { rootPath: string; tree: LocalFsNode[] }]
  /** history 模块点击文件 → 路由跳转预览（与原 HistoryPanel 一致） */
  historyOpen: [file: any]
}>()

const toast = useToast()
const isImporting = ref(false)

// ============================================
// 自定义布局：模块顺序与启用状态
// ============================================
const layoutStore = useHomeSidebarLayoutStore()
layoutStore.load()

/** 按启用顺序排列的模块定义（仅已启用项） */
const enabledModules = computed(() =>
  layoutStore.enabledIds
    .map((id) => getModuleDef(id))
    .filter((d): d is NonNullable<typeof d> => !!d),
)

// 各模块的展开状态（id -> open），默认全部展开
// 用 reactive map 存，Collapsible 通过 :open + @update:open 双向绑定
const openStates = reactive<Record<string, boolean>>({})
const isModuleOpen = (id: SidebarModuleId) => openStates[id] !== false
/** Collapsible 状态回写 */
function onModuleOpenChange(id: SidebarModuleId, open: boolean) {
  openStates[id] = open
}
/** 定位时强制展开某模块 */
const ensureModuleOpen = (id: SidebarModuleId) => {
  openStates[id] = true
}

const layoutDialogOpen = ref(false)

// ============================================
// 快捷分类模块（原 FolderTreeComponent 的 baseCategories）
// ============================================
const baseCategories = computed(() => [
  { id: 'all', label: '全部', icon: 'folder_open', iconColor: 'text-muted-foreground' },
  { id: 'uncategorized', label: '未分类', icon: 'folder_special', iconColor: 'text-muted-foreground' },
  { id: 'untagged', label: '未标签', icon: 'label_off', iconColor: 'text-muted-foreground' },
  { id: 'trash', label: '回收站', icon: 'delete', iconColor: 'text-destructive' },
])

const handleBaseCategoryClick = (category: any) => {
  emit('folderSelect', {
    id: category.id,
    label: category.label,
    icon: category.icon || 'folder',
    iconColor: category.iconColor,
    count: category.count,
    active: true,
  })
}

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
      life: 3000,
    })
  } finally {
    isImporting.value = false
  }
}

// keep-alive 滚动位置保持
const sidebarScrollRef = ref<HTMLElement>()
const savedScrollTop = ref(0)

/** FolderTreeComponent（hideHeader 模式下）对外暴露的能力 */
interface TreeExposed {
  locateNode: (id: string) => Promise<boolean>
  showSearch?: { value: boolean }
  toggleSearch?: () => void
  handleAdd?: () => void
}
const folderTreeRef = ref<TreeExposed | null>(null)
const tagTreeRef = ref<TreeExposed | null>(null)
/**
 * v-for 内的静态 ref 字符串会被 Vue 收集成数组，导致 folderTreeRef.value 变成数组
 * 而非组件实例（取不到 toggleSearch/handleAdd）。改用函数 ref 直接赋值给单个 ref。
 */
const setFolderTreeRef = (el: any) => { folderTreeRef.value = el }
const setTagTreeRef = (el: any) => { tagTreeRef.value = el }

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
  if (!container) return

  let nodeId = id
  if (type === 'tag' && !id.startsWith('tag-')) {
    nodeId = `tag-${id}`
  } else if (type === 'folder' && id.startsWith('folder-')) {
    nodeId = id.slice('folder-'.length)
  }

  // 定位时自动展开对应模块（外层 Collapsible 控制折叠态）
  ensureModuleOpen(type === 'tag' ? 'tags' : 'folders')

  const tree = type === 'tag' ? tagTreeRef.value : folderTreeRef.value
  const locatedByTree = await tree?.locateNode(nodeId)
  if (locatedByTree) return

  const el = container.querySelector(`[data-folder-tree-node-id="${nodeId}"]`) as HTMLElement
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({ locateItem })
</script>

<template>
  <!-- 素材库选择（从 HomeHeader 迁入，位于侧栏顶部） -->
  <div class="shrink-0 px-2 pt-2 pb-1 flex items-center gap-2">
    <button
      type="button"
      class="size-7 shrink-0 rounded-lg hover:opacity-80 active:scale-95 transition cursor-pointer"
      title="关于 Mira"
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

    <!-- 文件夹管理 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="文件夹管理"
      @click="emit('manageFolders')"
    >
      <span class="material-icons leading-none" style="font-size: 18px">drive_file_move</span>
    </button>

    <!-- 标签管理 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="标签管理"
      @click="emit('manageTags')"
    >
      <span class="material-icons leading-none" style="font-size: 18px">sell</span>
    </button>

    <!-- 自定义布局 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="自定义布局"
      @click="layoutDialogOpen = true"
    >
      <span class="material-icons leading-none" style="font-size: 18px">dashboard_customize</span>
    </button>
  </div>

  <!-- 模块化内容区：按 enabledModules 顺序渲染，每个模块外层包 Collapsible -->
  <div ref="sidebarScrollRef" class="flex-grow p-2 overflow-y-auto min-w-0 space-y-2">
    <Collapsible
      v-for="mod in enabledModules"
      :key="mod.id"
      :open="isModuleOpen(mod.id)"
      @update:open="onModuleOpenChange(mod.id, $event)"
      class="sidebar-section"
    >
      <!-- 统一标题栏（模块图标 + 标题 + 操作按钮 + 折叠手柄） -->
      <CollapsibleTrigger as-child>
        <header class="section-header">
          <span class="material-icons title-icon">{{ mod.icon }}</span>
          <h2 class="section-title">{{ mod.title }}</h2>
          <span
            class="material-icons chevron"
            :class="{ 'chevron--open': isModuleOpen(mod.id) }"
          >expand_more</span>

          <!-- 文件夹树操作按钮（调用 FolderTreeComponent 暴露的方法） -->
          <template v-if="mod.id === 'folders'">
            <div class="header-actions" @click.stop>
              <button
                class="header-action-btn"
                :class="{ 'text-primary': folderTreeRef?.showSearch }"
                title="搜索文件夹..."
                @click="folderTreeRef?.toggleSearch?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">search</span>
              </button>
              <button
                class="header-action-btn"
                title="添加文件夹"
                @click="folderTreeRef?.handleAdd?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">add</span>
              </button>
            </div>
          </template>

          <!-- 标签树操作按钮 -->
          <template v-else-if="mod.id === 'tags'">
            <div class="header-actions" @click.stop>
              <button
                class="header-action-btn"
                :class="{ 'text-primary': tagTreeRef?.showSearch }"
                title="搜索标签..."
                @click="tagTreeRef?.toggleSearch?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">search</span>
              </button>
              <button
                class="header-action-btn"
                title="添加标签"
                @click="tagTreeRef?.handleAdd?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">add</span>
              </button>
            </div>
          </template>
        </header>
      </CollapsibleTrigger>

      <!-- 快捷分类 -->
      <CollapsibleContent v-if="mod.id === 'shortcuts'" class="section-body">
        <ul class="space-y-0.5">
          <li v-for="folder in baseCategories" :key="folder.id">
            <ContextMenu v-if="folder.id === 'trash'">
              <ContextMenuTrigger as-child>
                <a
                  :data-folder-tree-node-id="folder.id"
                  :class="[
                    'cat-item',
                    homeController.selectedFolder.value === folder.id ? 'cat-item--active' : '',
                  ]"
                  @click.prevent="handleBaseCategoryClick(folder)"
                >
                  <span class="flex items-center">
                    <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
                      {{ folder.icon }}
                    </span>
                    {{ folder.label }}
                  </span>
                </a>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-48">
                <ContextMenuItem @click="emit('emptyTrash')">
                  <span>清空回收站</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <a
              v-else
              :data-folder-tree-node-id="folder.id"
              :class="[
                'cat-item',
                homeController.selectedFolder.value === folder.id ? 'cat-item--active' : '',
              ]"
              @click.prevent="handleBaseCategoryClick(folder)"
            >
              <span class="flex items-center">
                <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
                  {{ folder.icon }}
                </span>
                {{ folder.label }}
              </span>
            </a>
          </li>
        </ul>
      </CollapsibleContent>

      <!-- 文件夹树 -->
      <CollapsibleContent v-else-if="mod.id === 'folders'" class="section-body">
        <FolderTreeComponent
          :ref="setFolderTreeRef"
          item-type="folder"
          :draggable="true"
          hide-header
          :folders="homeController.folderTree.value"
          :selected-key="homeController.selectedFolder.value"
          :show-base-categories="false"
          @select="emit('folderSelect', $event)"
          @expand="homeController.handleFolderExpand"
          @refresh="emit('refreshFolders')"
          @empty-trash="emit('emptyTrash')"
        />
      </CollapsibleContent>

      <!-- 标签树 -->
      <CollapsibleContent v-else-if="mod.id === 'tags'" class="section-body">
        <FolderTreeComponent
          :ref="setTagTreeRef"
          item-type="tag"
          hide-header
          :tags="tags"
          @select="emit('tagSelect', $event)"
          @refresh="emit('refreshTags')"
        />
      </CollapsibleContent>

      <!-- 最新添加 / 历史查看 -->
      <!-- 最新添加 -->
      <CollapsibleContent v-else-if="mod.id === 'recent_added'" class="section-body">
        <SidebarHistoryModule :library-id="libraryId" mode="recent_added" @open="emit('historyOpen', $event)" />
      </CollapsibleContent>

      <!-- 历史查看 -->
      <CollapsibleContent v-else-if="mod.id === 'recent_viewed'" class="section-body">
        <SidebarHistoryModule :library-id="libraryId" mode="recent_viewed" @open="emit('historyOpen', $event)" />
      </CollapsibleContent>
    </Collapsible>
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

  <!-- 自定义布局对话框 -->
  <SidebarLayoutDialog v-model="layoutDialogOpen" />
</template>

<style scoped>
.sidebar-section {
  /* 与原 FolderTreeComponent 间距保持一致 */
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
  user-select: none;
  border-radius: 0.5rem;
  transition: background-color 0.15s ease;
}

.section-header:hover {
  background-color: color-mix(in oklch, var(--primary) 5%, transparent);
}

.section-header .chevron {
  order: 99;
  margin-left: auto;
  font-size: 18px;
  color: var(--muted-foreground);
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center center;
  transform: rotate(-90deg);
}

.section-header .chevron--open {
  transform: rotate(0deg);
}

.section-header .title-icon {
  font-size: 16px;
  color: var(--muted-foreground);
}

.section-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-foreground);
  line-height: 1.25rem;
}

/* 操作按钮组（搜索 / 添加）—— 与 FolderTreeComponent 自带标题栏风格一致 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  margin-left: auto;
}

.header-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--muted-foreground);
  border-radius: 0.25rem;
  transition: transform 160ms ease-out;
}

.header-action-btn:hover {
  color: var(--muted-foreground);
}

.header-action-btn:active {
  transform: scale(0.9);
}

.section-body {
  padding-left: 0.125rem;
}

.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.cat-item:hover {
  background-color: color-mix(in oklch, var(--primary) 5%, transparent);
}

.cat-item--active {
  background-color: color-mix(in oklch, var(--primary) 10%, transparent);
  color: var(--primary);
  font-weight: 500;
}
</style>
