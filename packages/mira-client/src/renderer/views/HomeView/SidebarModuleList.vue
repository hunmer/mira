<script setup lang="ts">
/**
 * SidebarModuleList —— HomeSidebar 模块化内容区组装层 + 底部搜索。
 *
 * 按 enabledModules（自定义布局 store 维护的启用顺序）渲染各模块：
 *   - shortcuts：快捷分类（SidebarShortcutsModule）
 *   - folders：文件夹树 / tags：标签树（FolderTreeComponent）
 *   - recent_added / recent_viewed：最新添加 / 历史查看（SidebarHistoryModule）
 *   - web_favorites：网页收藏夹（WebFavoritesPanel）
 *   - local_files：本地文件（SidebarLocalFilesModule）
 * 每个模块外包统一折叠外壳（SidebarModuleSection + SidebarHeaderActions）；
 * 顶部工具图标见 SidebarImportToolbar，树右键导入菜单见 useSidebarImportMenu。
 *
 * 对外暴露 locateItem(type, id)：定位文件夹/标签节点并滚动入视，供 Tab 右键「在侧边栏定位」调用。
 * 由原 HomeSidebar 拆出，逻辑零改动。
 */
import { ref, computed, onActivated, onDeactivated, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@vueuse/core'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import SidebarHistoryModule from './SidebarHistoryModule.vue'
import WebFavoritesPanel from './WebFavoritesPanel.vue'
import { useHomeSidebarLayoutStore } from '@/renderer/stores/homeSidebarLayout'
import { useMediaStore } from '@/renderer/stores/media'
import { getModuleDef, type SidebarModuleId } from './sidebarModules'
import { getSidebarModuleOpenStates, saveSidebarModuleOpenState } from '@/renderer/composables/LibraryPrefs'
import type { ImportFolderPayload, ImportTarget } from '@/renderer/composables/useImportHandler'
import SidebarModuleSection from './SidebarModuleSection.vue'
import SidebarHeaderActions from './SidebarHeaderActions.vue'
import SidebarImportToolbar from './SidebarImportToolbar.vue'
import SidebarShortcutsModule from './SidebarShortcutsModule.vue'
import SidebarLocalFilesModule from './SidebarLocalFilesModule.vue'
import SidebarLayoutDialog from './SidebarLayoutDialog.vue'
import { useSidebarImportMenu } from './useSidebarImportMenu'

defineOptions({ name: 'SidebarModuleList' })

const { t } = useI18n()

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

// ============================================
// 树右键导入菜单（原 SidebarModuleList 内联逻辑拆出）
// ============================================
const { importHandler, importMenuItems } = useSidebarImportMenu({
  t,
  getFolderTree: () => props.homeController.folderTree.value,
  onUpload: (target) => emit('upload', target),
  onImportFolder: (payload) => emit('importFolder', payload),
})

// ============================================
// 顶部工具图标（SidebarImportToolbar）
// ============================================
const mediaStore = useMediaStore()
const isMobile = useMediaQuery('(max-width: 767px)')

function closeDrawerIfMobile() {
  if (isMobile.value) mediaStore.showLeftSidebar = false
}

function handleToolbarUpload() {
  closeDrawerIfMobile()
  importHandler.handleUpload()
}

async function handleToolbarImportFolder() {
  closeDrawerIfMobile()
  await importHandler.handleImportFolder()
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
/** 本地文件模块：标题栏「添加」按钮调用其 expose 的 addCustomLocalFolder */
interface LocalFilesExposed {
  addCustomLocalFolder: () => Promise<void>
}
const localFilesRef = ref<LocalFilesExposed | null>(null)
const setLocalFilesRef = (el: any) => { localFilesRef.value = el }
/**
 * v-for 内的静态 ref 字符串会被 Vue 收集成数组，导致 folderTreeRef.value 变成数组
 * 而非组件实例（取不到 toggleSearch/handleAdd）。改用函数 ref 直接赋值给单个 ref。
 */
const setFolderTreeRef = (el: any) => { folderTreeRef.value = el }

function handleFolderTreeSelect(folder: any) {
  // 标记来源，供 HomeView 区分侧栏树的普通导航与 Ctrl/Cmd 新开 Tab。
  emit('folderSelect', { ...folder, source: 'sidebar-tree' })
}
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
  <!-- 模块化内容区：按 enabledModules 顺序渲染，每个模块外包统一折叠外壳 -->
  <div ref="sidebarScrollRef" class="flex-grow p-2 overflow-y-auto min-w-0 space-y-2">
    <SidebarImportToolbar
      :on-upload="handleToolbarUpload"
      :on-import-folder="handleToolbarImportFolder"
      :on-import-url="handleToolbarUrlImport"
      @customize="layoutDialogOpen = true"
    />
    <SidebarModuleSection
      v-for="mod in enabledModules"
      :key="mod.id"
      :icon="mod.icon"
      :title="t(mod.titleKey)"
      :open="isModuleOpen(mod.id)"
      @update:open="onModuleOpenChange(mod.id, $event)"
    >
      <!-- 标题栏操作按钮（调用各树组件暴露的方法） -->
      <template #headerActions>
        <SidebarHeaderActions
          v-if="mod.id === 'folders'"
          :buttons="[
            { icon: 'search', title: t('views.sidebarModuleList.searchFolders'), active: !!folderTreeRef?.showSearch, onClick: () => folderTreeRef?.toggleSearch?.() },
            { icon: 'add', title: t('views.sidebarModuleList.addFolder'), onClick: () => folderTreeRef?.handleAdd?.() },
            { icon: 'drive_file_move', title: t('views.sidebarToolbar.manageFolders'), onClick: handleManageFolders },
          ]"
        />
        <SidebarHeaderActions
          v-else-if="mod.id === 'tags'"
          :buttons="[
            { icon: 'search', title: t('views.sidebarModuleList.searchTags'), active: !!tagTreeRef?.showSearch, onClick: () => tagTreeRef?.toggleSearch?.() },
            { icon: 'add', title: t('views.sidebarModuleList.addTag'), onClick: () => tagTreeRef?.handleAdd?.() },
            { icon: 'sell', title: t('views.sidebarToolbar.manageTags'), onClick: handleManageTags },
          ]"
        />
        <!-- 网页收藏夹：新建网址 / 新建文件夹 分开两个入口 -->
        <SidebarHeaderActions
          v-else-if="mod.id === 'web_favorites'"
          :buttons="[
            { icon: 'search', title: t('views.webFavorites.search'), active: !!webFavoritesRef?.showSearch, onClick: () => webFavoritesRef?.toggleSearch?.() },
            { icon: 'link', title: t('views.webFavorites.addUrl'), onClick: () => webFavoritesRef?.handleAddUrl?.() },
            { icon: 'create_new_folder', title: t('views.webFavorites.addFolder'), onClick: () => webFavoritesRef?.handleAddFolder?.() },
          ]"
        />
        <SidebarHeaderActions
          v-else-if="mod.id === 'local_files'"
          :buttons="[
            { icon: 'add', title: t('views.localFolder.addCustomFolder'), onClick: () => localFilesRef?.addCustomLocalFolder?.() },
          ]"
        />
      </template>

      <!-- 快捷分类 -->
      <SidebarShortcutsModule
        v-if="mod.id === 'shortcuts'"
        :library-id="libraryId"
        :folder-tree="homeController.folderTree.value"
        :tags="tags"
        :selected-folder-id="homeController.selectedFolder.value"
        @select="emit('folderSelect', $event)"
        @empty-trash="emit('emptyTrash')"
      />

      <!-- 文件夹树 -->
      <FolderTreeComponent
        v-else-if="mod.id === 'folders'"
        :ref="setFolderTreeRef"
        item-type="folder"
        :draggable="true"
        hide-header
        :folders="homeController.folderTree.value"
        :selected-key="homeController.selectedFolder.value"
        :show-base-categories="false"
        persist-open-state
        indent-mode="icon"
        @select="handleFolderTreeSelect"
        @expand="homeController.handleFolderExpand"
        @refresh="emit('refreshFolders')"
        @empty-trash="emit('emptyTrash')"
        :extra-context-menu-items="importMenuItems"
      />

      <!-- 标签树 -->
      <FolderTreeComponent
        v-else-if="mod.id === 'tags'"
        :ref="setTagTreeRef"
        item-type="tag"
        :draggable="true"
        hide-header
        :tags="tags"
        @select="emit('tagSelect', $event)"
        @refresh="emit('refreshTags')"
        :extra-context-menu-items="importMenuItems"
      />

      <!-- 最新添加 -->
      <SidebarHistoryModule v-else-if="mod.id === 'recent_added'" :library-id="libraryId" mode="recent_added" @open="emit('historyOpen', $event)" />

      <!-- 历史查看 -->
      <SidebarHistoryModule v-else-if="mod.id === 'recent_viewed'" :library-id="libraryId" mode="recent_viewed" @open="emit('historyOpen', $event)" />

      <!-- 网页收藏夹 -->
      <WebFavoritesPanel v-else-if="mod.id === 'web_favorites'" :ref="setWebFavoritesRef" />

      <!-- 本地文件 -->
      <SidebarLocalFilesModule v-else-if="mod.id === 'local_files'" :ref="setLocalFilesRef" :library-id="libraryId" />
    </SidebarModuleSection>
  </div>

  <SidebarLayoutDialog v-model="layoutDialogOpen" />

  <!-- 底部搜索胶囊 -->
  <div class="shrink-0 px-2 pb-2 pt-1">
    <button
      class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors cursor-pointer text-xs font-medium"
      @click="homeController.toggleSearch"
    >
      <span class="material-icons text-sm">search</span>
      <span>{{ t('views.sidebarModuleList.search') }}</span>
    </button>
  </div>
</template>
