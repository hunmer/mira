/**
 * 素材库树(文件夹/标签)组件子入口。
 *
 * 独立于主入口(不引入 tailwind.css),但组件样式已全部 tailwind 化
 * (shadcn 原子类,见仓库 ui_rule.md):宿主需自行提供 tailwind 环境
 * 与 shadcn 设计 token,再经 'mira-plugin-ui/library' 消费源码。
 */
export { default as LibraryTree } from './LibraryTree.vue'
export { default as LibraryTreeView } from './LibraryTreeView.vue'
export { default as CreateNodeDialog } from './CreateNodeDialog.vue'
export { default as LibrarySelect } from './LibrarySelect.vue'
export { default as ContextMenu } from './ContextMenu.vue'
export { default as Dropzone } from './Dropzone.vue'
export { default as MediaBrowser } from './MediaBrowser.vue'
export { default as MediaDetail } from './MediaDetail.vue'
export { default as MediaLibraryView } from './MediaLibraryView.vue'
export { default as FilterBar } from './FilterBar.vue'
export { default as SavedFilterDialog } from './SavedFilterDialog.vue'
export { default as ServerManagerView } from './ServerManagerView.vue'
export { default as ServerManagerDialog } from './ServerManagerDialog.vue'
export { useLibraryTreeData } from './useLibraryTreeData'
export { useLibraryTreeActions, type LibraryTreeMenuState, type UseLibraryTreeActionsOptions, type UseLibraryTreeActionsDeps } from './useLibraryTreeActions'
export { buildTree, filterTree, flattenTree, collectIds, ROOT_ID } from './tree'
export { parseDrop, canAcceptDrop, urlKind, type ParsedDrop } from './drag-data'
export { createLibraryTreeT } from './i18n'
export {
  createDefaultFilterRules,
  resetFilterRule,
  applySnapshotToRule,
  rulesToFilters,
  hasActiveFilterConditions,
  toApiFilters,
  filterIconOf,
} from './filterBar'
export type {
  LibraryTreeNode,
  LibraryFlatItem,
  LibrarySelectOption,
  LibrarySelectServer,
  LibraryTreeKind,
  LibraryTreeCreatePayload,
  LibraryTreeUpdatePayload,
  LibraryTreeServices,
  LibraryTreeDialog,
  LibraryTreeUpload,
  LibraryTreeUploadTarget,
  LibraryTreeT,
  MediaBrowserItem,
  MediaBrowserFilters,
  MediaBrowserServices,
  MediaBrowserListResult,
  MediaBrowserSortField,
  MediaDetailItem,
  MediaDetailServices,
  MediaLibraryServices,
  FilterRule,
  SavedFilter,
  FilterBarSortOption,
  ManagedServer,
  ServerManagerServices,
} from './types'
