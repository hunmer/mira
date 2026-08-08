<script setup lang="ts">
/**
 * HomeSidebar —— 首页左侧栏编排壳（orchestrator）。
 *
 * 实际功能拆分到三个子组件：
 *   - SidebarLibrarySelector：顶部素材库选择 + 关于入口
 *   - SidebarToolbar：导入/文件夹管理/标签管理/自定义布局
 *   - SidebarModuleList：模块化 Collapsible 列表 + locateItem
 *
 * 本文件仅做 props/emits 透传与 locateItem expose 转发，对外契约
 * （props、15 个 emit、defineExpose({ locateItem })）与拆分前完全一致，
 * 父级 index.vue / useHomeTabManagement 无需改动。
 */
import { ref } from 'vue'
import SidebarLibrarySelector from './SidebarLibrarySelector.vue'
import SidebarToolbar from './SidebarToolbar.vue'
import SidebarModuleList from './SidebarModuleList.vue'
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
  /** 打开文件上传对话框 */
  upload: []
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

// 模块列表子组件实例，用于转发 locateItem
const moduleListRef = ref<{ locateItem: (type: 'folder' | 'tag', id: string) => Promise<void> } | null>(null)

/**
 * 转发 locateItem：父级（index.vue → useHomeTabManagement）调用
 * sidebarRef.locateItem(type, id) 时，实际定位逻辑在 SidebarModuleList 内执行。
 */
defineExpose({
  locateItem: (type: 'folder' | 'tag', id: string) => moduleListRef.value?.locateItem(type, id),
})
</script>

<template>
  <SidebarLibrarySelector
    @select-collection="emit('selectCollection', $event)"
    @access-denied="emit('accessDenied')"
    @show-library-management="emit('showLibraryManagement')"
    @add-server="emit('addServer')"
    @show-about="emit('showAbout')"
  />

  <SidebarToolbar
    @upload="emit('upload')"
    @import-folder="emit('importFolder', $event)"
    @manage-folders="emit('manageFolders')"
    @manage-tags="emit('manageTags')"
  />

  <SidebarModuleList
    ref="moduleListRef"
    :home-controller="homeController"
    :tags="tags"
    :library-id="libraryId"
    @folder-select="emit('folderSelect', $event)"
    @tag-select="emit('tagSelect', $event)"
    @refresh-folders="emit('refreshFolders')"
    @refresh-tags="emit('refreshTags')"
    @empty-trash="emit('emptyTrash')"
    @history-open="emit('historyOpen', $event)"
  />
</template>
