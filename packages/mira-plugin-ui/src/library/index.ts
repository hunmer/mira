/**
 * 素材库树(文件夹/标签)组件子入口。
 *
 * 独立于主入口(不引入 tailwind.css):宿主(mira-browser-extension 等)
 * 经 'mira-plugin-ui/library' 直接消费源码,不带入库的样式 token。
 * 组件样式为 scoped CSS,依赖宿主提供 --fg/--bg/--bg-elev/--border/--primary/
 * --muted/--danger/--radius 语义变量。
 */
export { default as LibraryTree } from './LibraryTree.vue'
export { default as LibraryTreeView } from './LibraryTreeView.vue'
export { default as ContextMenu } from './ContextMenu.vue'
export { default as Dropzone } from './Dropzone.vue'
export { useLibraryTreeData } from './useLibraryTreeData'
export { useLibraryTreeActions, type LibraryTreeMenuState, type UseLibraryTreeActionsOptions, type UseLibraryTreeActionsDeps } from './useLibraryTreeActions'
export { buildTree, filterTree, flattenTree, collectIds, ROOT_ID } from './tree'
export { parseDrop, canAcceptDrop, urlKind, type ParsedDrop } from './drag-data'
export { createLibraryTreeT } from './i18n'
export type {
  LibraryTreeNode,
  LibraryFlatItem,
  LibraryTreeKind,
  LibraryTreeServices,
  LibraryTreeDialog,
  LibraryTreeUpload,
  LibraryTreeUploadTarget,
  LibraryTreeT,
} from './types'
