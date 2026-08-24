<script setup lang="ts">
/**
 * SidebarModuleList —— HomeSidebar 模块化内容区 + 顶部工具图标 + 底部搜索。
 *
 * 顶部 headerActions 图标（原 SidebarToolbar 迁入）：
 *   - dot dropdown（导入子菜单：上传文件 / 导入文件夹 / 从 URL 导入 + 自定义布局）
 * 文件夹管理 / 标签管理图标分别位于 folders / tags 模块的 header actions。
 *
 * 按 enabledModules（自定义布局 store 维护的启用顺序）渲染若干 Collapsible 模块：
 *   - shortcuts：快捷分类（全部/未分类/未标签/回收站）
 *   - folders：文件夹树（FolderTreeComponent）
 *   - tags：标签树（FolderTreeComponent）
 *   - recent_added / recent_viewed：最新添加 / 历史查看（SidebarHistoryModule）
 *
 * 对外暴露 locateItem(type, id)：定位文件夹/标签节点并滚动入视，供 Tab 右键「在侧边栏定位」调用。
 * 由原 HomeSidebar 拆出，逻辑零改动。
 */
import { ref, computed, onActivated, onDeactivated, onBeforeUnmount, onMounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@vueuse/core'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import SidebarHistoryModule from './SidebarHistoryModule.vue'
import WebFavoritesPanel from './WebFavoritesPanel.vue'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import { useHomeSidebarLayoutStore } from '@/renderer/stores/homeSidebarLayout'
import { useLibraryStore } from '@/renderer/stores/library'
import { useMediaStore } from '@/renderer/stores/media'
import { useSettingsStore } from '@/renderer/stores/settings'
import { useServerListStore } from '@/renderer/stores/serverList'
import { miraSDKService } from '@/renderer/services/MiraSDKService'
import { getModuleDef, type SidebarModuleId } from './sidebarModules'
import { useTabs } from '@/renderer/composables/useTabs'
import { getSidebarModuleOpenStates, saveSidebarModuleOpenState } from '@/renderer/composables/LibraryPrefs'
import type { LocalFsRoot } from '@/shared/types'
import { useImportHandler, type ImportFolderPayload, type ImportTarget } from '@/renderer/composables/useImportHandler'
import type { MenuItem } from '@/renderer/types/menu'
import OrderedSectionList from '@/renderer/components/common/OrderedSectionList.vue'
import SidebarLayoutDialog from './SidebarLayoutDialog.vue'

defineOptions({ name: 'SidebarModuleList' })

const { t } = useI18n()
const { createTabFromRegisteredType } = useTabs()
const libraryStore = useLibraryStore()
const settingsStore = useSettingsStore()
const serverListStore = useServerListStore()

const props = defineProps<{
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
  /** history 模块点击文件 → 路由跳转预览（与原 HistoryPanel 一致） */
  historyOpen: [file: any]
  upload: [target?: ImportTarget]
  importFolder: [payload: ImportFolderPayload]
  /** 打开文件夹管理对话框 */
  manageFolders: []
  /** 打开标签管理对话框 */
  manageTags: []
}>()

const importTarget = ref<ImportTarget>()
const importHandler = useImportHandler({
  t,
  target: importTarget,
  onUpload: () => emit('upload', importTarget.value),
  onImportFolder: (payload) => emit('importFolder', payload),
})

// ============================================
// 顶部工具图标（原 SidebarToolbar 迁入）
// ============================================
const mediaStore = useMediaStore()
const isMobile = useMediaQuery('(max-width: 767px)')
const isImporting = ref(false)

function closeDrawerIfMobile() {
  if (isMobile.value) mediaStore.showLeftSidebar = false
}

function handleToolbarUpload() {
  closeDrawerIfMobile()
  importHandler.handleUpload()
}

async function handleToolbarImportFolder() {
  if (isImporting.value) return
  closeDrawerIfMobile()
  isImporting.value = true
  try {
    await importHandler.handleImportFolder()
  } finally {
    isImporting.value = false
  }
}

function handleToolbarUrlImport() {
  closeDrawerIfMobile()
  importHandler.handleUrlImport()
}

/** 文件夹管理：关闭抽屉后抛事件给父级 */
function handleManageFolders() {
  closeDrawerIfMobile()
  emit('manageFolders')
}

/** 标签管理：关闭抽屉后抛事件给父级 */
function handleManageTags() {
  closeDrawerIfMobile()
  emit('manageTags')
}

function targetForNode(type: 'folder' | 'tag', item: any): ImportTarget {
  if (!item) return {}
  if (type === 'tag') {
    const id = String(item.id).replace(/^tag-/, '')
    return { tagIds: [id] }
  }
  return { folderId: String(item.id).replace(/^folder-/, '') }
}

function importMenuItems(type: 'folder' | 'tag', item: any | null): MenuItem[] {
  const target = targetForNode(type, item)
  return [
    {
      label: t('views.sidebarToolbar.import'), icon: 'drive_folder_upload', items: [
        { label: t('views.sidebarToolbar.import'), icon: 'upload_file', command: () => { importTarget.value = target; importHandler.handleUpload() } },
        { label: t('views.sidebarToolbar.importFolder'), icon: 'folder_open', command: () => { importTarget.value = target; void importHandler.handleImportFolder() } },
        { label: t('business.homeHeader.importFromUrl'), icon: 'cloud_download', command: () => { importTarget.value = target; importHandler.handleUrlImport() } },
      ],
    },
    // 定位到文件夹（仅文件夹树）：在系统资源管理器中显示该文件夹的物理目录
    ...(type === 'folder' && item && libraryLocalPath() ? [{
      label: t('views.sidebarModuleList.locateFolder'),
      icon: 'my_location',
      command: () => {
        const root = libraryLocalPath()
        const rel = folderTreePath(String(item.id))
        if (!root || !rel) return
        const sep = root.includes('\\') ? '\\' : '/'
        ;(window as any).electronAPI?.fs?.showItemInFolder(root.replace(/[\\/]+$/, '') + sep + rel.replace(/\//g, sep))
      },
    }] : []),
  ]
}

/**
 * 从侧边栏文件夹树回溯目标文件夹的嵌套相对路径（与服务端 getFolderPath 同规则：
 * 沿 parent 链拼各级 title），找不到返回 null。
 */
function folderTreePath(targetId: string): string | null {
  const walk = (nodes: any[], trail: string[]): string | null => {
    for (const node of nodes || []) {
      const title = node.originalData?.title ?? node.label
      if (String(node.id) === String(targetId)) return [...trail, title].join('/')
      const found = walk(node.children, [...trail, title])
      if (found) return found
    }
    return null
  }
  return walk(props.homeController.folderTree.value, [])
}

/**
 * 当前素材库根目录映射为本机可访问路径（与 SidebarLibrarySelector.getLibraryLocalPath 同规则：
 * Docker 环境经 SMB 配置换算），无法映射（如 Docker 未配 SMB）时返回 null。
 */
function libraryLocalPath(): string | null {
  const collection = libraryStore.currentLibrary
  if (!collection?.path) return null
  const isDocker = settingsStore.systemHealth?.isDocker ?? false
  const smb = serverListStore.activeServer?.smb
  if (!isDocker) return collection.path
  if (!smb?.enabled || !smb.smbPath) return null
  const smbPath = smb.smbPath
  const sep = smbPath.includes('/') ? '/' : '\\'
  const normalizedSmbPath = smbPath.endsWith(sep) ? smbPath : smbPath + sep
  if (smb.mountPath) {
    const mountPrefix = smb.mountPath.endsWith('/') ? smb.mountPath + '/' : smb.mountPath
    return collection.path.replace(mountPrefix, normalizedSmbPath).replace(/\//g, sep)
  }
  return normalizedSmbPath + collection.path.replace(/^\//, '').replace(/\//g, sep)
}

// ============================================
// 自定义布局：模块顺序与启用状态
// ============================================
const layoutStore = useHomeSidebarLayoutStore()
layoutStore.load()
const layoutDialogOpen = ref(false)

/** 按启用顺序排列的模块定义（仅已启用项） */
const enabledModules = computed(() =>
  layoutStore.enabledIds
    .map((id) => getModuleDef(id))
    .filter((d): d is NonNullable<typeof d> => !!d),
)

// 各模块的展开状态按当前素材库持久化；未记录的模块默认展开。
const isModuleOpen = (id: SidebarModuleId) => getSidebarModuleOpenStates()[id] !== false
/** Collapsible 状态回写 */
function onModuleOpenChange(id: SidebarModuleId, open: boolean) {
  void saveSidebarModuleOpenState(id, open)
}
/** 定位时强制展开某模块 */
const ensureModuleOpen = (id: SidebarModuleId) => {
  void saveSidebarModuleOpenState(id, true)
}

// ============================================
// 快捷分类模块（原 FolderTreeComponent 的 baseCategories）
// ============================================
const shortcutCountState = ref({ all: 0, uncategorized: 0, untagged: 0, trash: 0 })
const shortcutCounts = computed(() => shortcutCountState.value)
let shortcutCountRequestId = 0

/** 从服务端按当前素材库统计快捷分类，避免受当前激活 tab 和本地分页数据影响。 */
async function loadShortcutCounts(libraryId: string) {
  const requestId = ++shortcutCountRequestId
  try {
    const stats = await miraSDKService.getLibraryStats(libraryId)
    const counts = stats.shortcutCounts || {}

    if (requestId !== shortcutCountRequestId) return
    shortcutCountState.value = {
      all: Number(counts.all || 0),
      uncategorized: Number(counts.uncategorized || 0),
      untagged: Number(counts.untagged || 0),
      trash: Number(counts.trash || 0),
    }
  } catch (error) {
    if (requestId === shortcutCountRequestId) {
      console.warn('加载快捷分类数量失败:', error)
      shortcutCountState.value = { all: 0, uncategorized: 0, untagged: 0, trash: 0 }
    }
  }
}

watch([
  () => props.libraryId,
  () => props.homeController.folderTree.value,
  () => props.tags,
], ([libraryId]) => {
  if (libraryId) loadShortcutCounts(libraryId)
  else shortcutCountState.value = { all: 0, uncategorized: 0, untagged: 0, trash: 0 }
}, { immediate: true, deep: true })

const onLibraryFileChanged = (event: Event) => {
  const libraryId = (event as CustomEvent<{ libraryId?: string }>).detail?.libraryId
  if (libraryId && libraryId === props.libraryId) loadShortcutCounts(libraryId)
}
window.addEventListener('library-file-changed', onLibraryFileChanged)
onBeforeUnmount(() => window.removeEventListener('library-file-changed', onLibraryFileChanged))

const baseCategories = computed(() => [
  { id: 'all', label: t('views.sidebarModuleList.all'), icon: 'folder_open', iconColor: 'text-muted-foreground', count: shortcutCounts.value.all },
  { id: 'uncategorized', label: t('views.sidebarModuleList.uncategorized'), icon: 'folder_special', iconColor: 'text-muted-foreground', count: shortcutCounts.value.uncategorized },
  { id: 'untagged', label: t('views.sidebarModuleList.untagged'), icon: 'label_off', iconColor: 'text-muted-foreground', count: shortcutCounts.value.untagged },
  { id: 'trash', label: t('views.sidebarModuleList.trash'), icon: 'delete', iconColor: 'text-destructive', count: shortcutCounts.value.trash },
])

const localRoots = ref<LocalFsRoot[]>([])
const localRootsError = ref('')
const customLocalFolders = ref<LocalFsRoot[]>([])
const CUSTOM_LOCAL_FOLDERS_KEY = 'mira-custom-local-folders'

function localPathKey(value: string) {
  return value.replace(/[\\/]+$/, '').toLowerCase()
}

function localFolderName(targetPath: string) {
  const trimmed = targetPath.replace(/[\\/]+$/, '')
  return trimmed.split(/[\\/]/).filter(Boolean).pop() || targetPath
}

function loadCustomLocalFolders() {
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_LOCAL_FOLDERS_KEY) || '[]')
    if (!Array.isArray(stored)) return
    customLocalFolders.value = stored.filter((item): item is LocalFsRoot => (
      typeof item?.path === 'string' && typeof item?.name === 'string'
    ))
  } catch (error) {
    console.warn('加载自定义本地文件夹失败:', error)
  }
}

function saveCustomLocalFolders() {
  localStorage.setItem(CUSTOM_LOCAL_FOLDERS_KEY, JSON.stringify(customLocalFolders.value))
}

async function loadLocalRoots() {
  const api = window.electronAPI?.fs
  if (!api?.listRoots) {
    localRootsError.value = t('views.localFolder.electronOnly')
    return
  }
  const result = await api.listRoots()
  localRoots.value = result.data || []
  localRootsError.value = result.success ? '' : (result.message || t('views.localFolder.loadFailed'))
}

function openLocalRoot(root: LocalFsRoot) {
  createTabFromRegisteredType('local-folder', {
    id: `local-folder:${encodeURIComponent(root.path)}`,
    label: root.name,
    icon: 'storage',
    data: { rootPath: root.path },
    libraryId: props.libraryId,
  })
}

async function addCustomLocalFolder() {
  const result = await window.electronAPI?.fs?.selectDirectory(t('views.localFolder.addCustomFolder'))
  if (!result?.success || !result.path) return
  const key = localPathKey(result.path)
  if (customLocalFolders.value.some((folder) => localPathKey(folder.path) === key)) return
  customLocalFolders.value.push({ path: result.path, name: localFolderName(result.path) })
  saveCustomLocalFolders()
}

function removeCustomLocalFolder(targetPath: string) {
  const key = localPathKey(targetPath)
  customLocalFolders.value = customLocalFolders.value.filter((folder) => localPathKey(folder.path) !== key)
  saveCustomLocalFolders()
}

onMounted(() => {
  loadCustomLocalFolders()
  loadLocalRoots()
})

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
/** 网页收藏夹面板（hideHeader 模式下能力由面板 expose） */
interface WebFavExposed {
  handleAddUrl: () => void
  handleAddFolder: () => void
  showSearch?: boolean
  toggleSearch?: () => void
}
const webFavoritesRef = ref<WebFavExposed | null>(null)
const setWebFavoritesRef = (el: any) => { webFavoritesRef.value = el }
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
  <!-- 模块化内容区：按 enabledModules 顺序渲染，每个模块外层包 Collapsible -->
  <div ref="sidebarScrollRef" class="flex-grow p-2 overflow-y-auto min-w-0 space-y-2">
    <OrderedSectionList
      :title="$t('views.sidebarLayoutDialog.title')"
      :customize-label="''"
      @customize="layoutDialogOpen = true"
    >
      <template #headerActions>
        <!-- 更多操作（dot dropdown）：导入 / 自定义布局 -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="header-action-btn pointer-events-auto relative z-10 cursor-pointer text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              :title="$t('views.sidebarToolbar.moreActions')"
              :disabled="isImporting"
              @mousedown.stop
            >
              <span class="material-icons pointer-events-none leading-none text-primary" style="font-size: 18px">{{ isImporting ? 'hourglass_top' : 'more_vert' }}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-44">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span class="material-icons text-base mr-2">drive_folder_upload</span>
                <span>{{ $t('views.sidebarToolbar.import') }}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="w-40">
                <DropdownMenuItem @click="handleToolbarUpload"><span class="material-icons text-base mr-2">upload_file</span><span>{{ $t('views.sidebarToolbar.uploadFile') }}</span></DropdownMenuItem>
                <DropdownMenuItem @click="handleToolbarImportFolder"><span class="material-icons text-base mr-2">folder_open</span><span>{{ $t('views.sidebarToolbar.importFolder') }}</span></DropdownMenuItem>
                <DropdownMenuItem @click="handleToolbarUrlImport"><span class="material-icons text-base mr-2">cloud_download</span><span>{{ $t('business.homeHeader.importFromUrl') }}</span></DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem @click="layoutDialogOpen = true">
              <span class="material-icons text-base mr-2">dashboard_customize</span>
              <span>{{ $t('views.sidebarToolbar.customizeLayout') }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </OrderedSectionList>
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
          <h2 class="section-title">{{ t(mod.titleKey) }}</h2>
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
                :title="$t('views.sidebarModuleList.searchFolders')"
                @click="folderTreeRef?.toggleSearch?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">search</span>
              </button>
              <button
                class="header-action-btn"
                :title="$t('views.sidebarModuleList.addFolder')"
                @click="folderTreeRef?.handleAdd?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">add</span>
              </button>
              <button
                class="header-action-btn"
                :title="$t('views.sidebarToolbar.manageFolders')"
                @click="handleManageFolders"
              >
                <span class="material-icons leading-none" style="font-size: 18px">drive_file_move</span>
              </button>
            </div>
          </template>

          <!-- 标签树操作按钮 -->
          <template v-else-if="mod.id === 'tags'">
            <div class="header-actions" @click.stop>
              <button
                class="header-action-btn"
                :class="{ 'text-primary': tagTreeRef?.showSearch }"
                :title="$t('views.sidebarModuleList.searchTags')"
                @click="tagTreeRef?.toggleSearch?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">search</span>
              </button>
              <button
                class="header-action-btn"
                :title="$t('views.sidebarModuleList.addTag')"
                @click="tagTreeRef?.handleAdd?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">add</span>
              </button>
              <button
                class="header-action-btn"
                :title="$t('views.sidebarToolbar.manageTags')"
                @click="handleManageTags"
              >
                <span class="material-icons leading-none" style="font-size: 18px">sell</span>
              </button>
            </div>
          </template>

          <!-- 网页收藏夹操作按钮：新建网址 / 新建文件夹 分开两个入口 -->
          <template v-else-if="mod.id === 'web_favorites'">
            <div class="header-actions" @click.stop>
              <button
                class="header-action-btn"
                :class="{ 'text-primary': webFavoritesRef?.showSearch }"
                :title="$t('views.webFavorites.search')"
                @click="webFavoritesRef?.toggleSearch?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">search</span>
              </button>
              <button
                class="header-action-btn"
                :title="$t('views.webFavorites.addUrl')"
                @click="webFavoritesRef?.handleAddUrl?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">link</span>
              </button>
              <button
                class="header-action-btn"
                :title="$t('views.webFavorites.addFolder')"
                @click="webFavoritesRef?.handleAddFolder?.()"
              >
                <span class="material-icons leading-none" style="font-size: 18px">create_new_folder</span>
              </button>
            </div>
          </template>

          <!-- 本地文件操作按钮 -->
          <template v-else-if="mod.id === 'local_files'">
            <div class="header-actions" @click.stop>
              <button
                class="header-action-btn"
                :title="$t('views.localFolder.addCustomFolder')"
                @click="addCustomLocalFolder"
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
                  <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
                    {{ folder.count }}
                  </span>
                </a>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-48">
                <ContextMenuItem @click="emit('emptyTrash')">
                  <span>{{ $t('views.sidebarModuleList.emptyTrash') }}</span>
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
              <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
                {{ folder.count }}
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
          indent-mode="icon"
          @select="emit('folderSelect', $event)"
          @expand="homeController.handleFolderExpand"
          @refresh="emit('refreshFolders')"
          @empty-trash="emit('emptyTrash')"
          :extra-context-menu-items="importMenuItems"
        />
      </CollapsibleContent>

      <!-- 标签树 -->
      <CollapsibleContent v-else-if="mod.id === 'tags'" class="section-body">
        <FolderTreeComponent
          :ref="setTagTreeRef"
          item-type="tag"
          :draggable="true"
          hide-header
          :tags="tags"
          @select="emit('tagSelect', $event)"
          @refresh="emit('refreshTags')"
          :extra-context-menu-items="importMenuItems"
        />
      </CollapsibleContent>

      <!-- 最新添加 -->
      <CollapsibleContent v-else-if="mod.id === 'recent_added'" class="section-body">
        <SidebarHistoryModule :library-id="libraryId" mode="recent_added" @open="emit('historyOpen', $event)" />
      </CollapsibleContent>

      <!-- 历史查看 -->
      <CollapsibleContent v-else-if="mod.id === 'recent_viewed'" class="section-body">
        <SidebarHistoryModule :library-id="libraryId" mode="recent_viewed" @open="emit('historyOpen', $event)" />
      </CollapsibleContent>

      <!-- 网页收藏夹 -->
      <CollapsibleContent v-else-if="mod.id === 'web_favorites'" class="section-body">
        <WebFavoritesPanel :ref="setWebFavoritesRef" />
      </CollapsibleContent>

      <!-- 本地文件 -->
      <CollapsibleContent v-else-if="mod.id === 'local_files'" class="section-body text-foreground">
        <h3 class="flex items-center gap-1 px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
          <span class="material-icons text-sm">storage</span>
          {{ $t('views.localFolder.systemDrives') }}
          <span v-if="localRoots.length" class="ml-auto text-xs">{{ localRoots.length }}</span>
        </h3>
        <ul v-if="localRoots.length" class="ml-[15px] space-y-0.5 border-l border-border/60 pl-3">
          <li v-for="root in localRoots" :key="root.path" class="local-tree-leaf relative">
            <button class="cat-item w-full text-foreground" type="button" @click="openLocalRoot(root)">
              <span class="flex min-w-0 items-center">
                <span class="material-icons mr-2 text-lg text-foreground/70">storage</span>
                <span class="truncate text-foreground">{{ root.name }}</span>
              </span>
            </button>
          </li>
        </ul>
        <p v-else class="px-2 py-3 text-xs text-foreground/70">{{ localRootsError || $t('views.localFolder.loading') }}</p>

        <h3 class="flex items-center gap-1 px-2 pb-1 pt-3 text-[11px] font-medium text-muted-foreground">
          <span class="material-icons text-sm">folder</span>
          {{ $t('views.localFolder.customFolders') }}
          <span v-if="customLocalFolders.length" class="ml-auto text-xs">{{ customLocalFolders.length }}</span>
        </h3>
        <ul v-if="customLocalFolders.length" class="ml-[15px] space-y-0.5 border-l border-border/60 pl-3">
          <li v-for="folder in customLocalFolders" :key="folder.path" class="group/local-folder local-tree-leaf relative">
            <button class="cat-item w-full pr-8 text-foreground" type="button" @click="openLocalRoot(folder)">
              <span class="flex min-w-0 items-center">
                <span class="material-icons mr-2 text-lg text-foreground/70">folder</span>
                <span class="truncate text-foreground">{{ folder.name }}</span>
              </span>
            </button>
            <button
              type="button"
              class="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover/local-folder:opacity-100"
              :title="$t('views.localFolder.removeCustomFolder')"
              @click.stop="removeCustomLocalFolder(folder.path)"
            >
              <span class="material-icons leading-none" style="font-size: 16px">delete</span>
            </button>
          </li>
        </ul>
        <p v-else class="px-2 pb-2 pt-1 text-xs text-muted-foreground">{{ $t('views.localFolder.noCustomFolders') }}</p>
      </CollapsibleContent>
    </Collapsible>
  </div>

  <SidebarLayoutDialog v-model="layoutDialogOpen" />

  <!-- 底部搜索胶囊 -->
  <div class="shrink-0 px-2 pb-2 pt-1">
    <button
      class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors cursor-pointer text-xs font-medium"
      @click="homeController.toggleSearch"
    >
      <span class="material-icons text-sm">search</span>
      <span>{{ $t('views.sidebarModuleList.search') }}</span>
    </button>
  </div>
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
  cursor: pointer;
  user-select: none;
  border-radius: 0.5rem 0.5rem 0 0;
  background: var(--primary);
  color: var(--primary-foreground);
  transition: filter 0.15s ease;
}

.section-header:hover {
  filter: brightness(0.95);
}

/* 折叠态：四角圆角（无内容衔接，恢复完整圆角） */
.section-header[data-state="closed"] {
  border-radius: 0.5rem;
}

.section-header .chevron {
  order: 99;
  margin-left: auto;
  font-size: 18px;
  color: var(--primary-foreground);
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center center;
  transform: rotate(-90deg);
}

.section-header .chevron--open {
  transform: rotate(0deg);
}

.section-header .title-icon {
  font-size: 16px;
  color: var(--primary-foreground);
}

.section-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-foreground);
  line-height: 1.25rem;
}

/* 操作按钮组（搜索 / 添加）—— 与 FolderTreeComponent 自带标题栏风格一致 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  margin-left: auto;
}

/* 桌面端：hover 模块标题时才显示操作按钮（搜索激活 / 键盘聚焦时保持可见）；移动端始终显示 */
@media (min-width: 768px) {
  .header-actions {
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
  }

  .section-header:hover .header-actions,
  .section-header:focus-within .header-actions,
  .header-actions:has(.text-primary) {
    opacity: 1;
    pointer-events: auto;
  }
}

.header-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--primary-foreground);
  border-radius: 0.25rem;
  transition: transform 160ms ease-out;
}

.header-action-btn:hover {
  color: var(--primary-foreground);
  background: color-mix(in oklch, var(--primary-foreground) 15%, transparent);
}

/* 搜索激活态：在 primary 背景上用亮色高亮（覆盖全局 .text-primary） */
.header-action-btn.text-primary {
  color: var(--primary-foreground);
  background: color-mix(in oklch, var(--primary-foreground) 25%, transparent);
}

.header-action-btn:active {
  transform: scale(0.9);
}

.section-body {
  padding-left: 0.125rem;
}

/* 本地文件模块：列表项横向连线，左端接 ul 的垂直引导线（pl-3 + 1px 边框） */
.local-tree-leaf::before {
  content: '';
  position: absolute;
  left: -13px;
  top: 50%;
  width: 13px;
  height: 1px;
  background: color-mix(in oklch, var(--border) 60%, transparent);
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
