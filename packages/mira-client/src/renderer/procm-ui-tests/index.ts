// 真实页面 UI 测试注册表：仅开发构建加载（见 main.ts），生产构建不暴露测试函数。
// 新增测试：在同目录新建独立文件并导出 async 函数，再在此导入注册。
declare global {
  interface Window {
    __procmUiTests?: Record<string, (...args: any[]) => Promise<unknown>>
  }
}

export { createFolder } from './createFolder'
export { createTag } from './createTag'
export { deleteFolderDialog } from './deleteFolderDialog'
export { switchCategory } from './switchCategory'
export { tabOperations } from './tabOperations'
export { tabContextMenu } from './tabContextMenu'
export { toggleSidebarSection } from './toggleSidebarSection'
export { folderTreeSearch } from './folderTreeSearch'
export { toggleDetailPanel } from './toggleDetailPanel'
export { switchTheme } from './switchTheme'
export { aboutDialog } from './aboutDialog'
export { settingsNavigation } from './settingsNavigation'
export { switchViewMode } from './switchViewMode'
export { switchSort } from './switchSort'
export { sidebarLayoutDialog } from './sidebarLayoutDialog'
export { manageDialogs } from './manageDialogs'
export { dashboardLayout } from './dashboardLayout'
export { urlImportValidation } from './urlImportValidation'
export { openFolderTabBreadcrumb } from './openFolderTabBreadcrumb'
export { renameFolder } from './renameFolder'
export { mediaSelection } from './mediaSelection'
export { mediaSetFolderTag } from './mediaSetFolderTag'
export { trashRestore } from './trashRestore'
export { imagePreviewNavigation } from './imagePreviewNavigation'
export { titleFilterCount } from './titleFilterCount'
export { savedFilter } from './savedFilter'
export { sidebarRecentPreview } from './sidebarRecentPreview'
export { detailPanelStarTag } from './detailPanelStarTag'

import { createFolder } from './createFolder'
import { createTag } from './createTag'
import { deleteFolderDialog } from './deleteFolderDialog'
import { switchCategory } from './switchCategory'
import { tabOperations } from './tabOperations'
import { tabContextMenu } from './tabContextMenu'
import { toggleSidebarSection } from './toggleSidebarSection'
import { folderTreeSearch } from './folderTreeSearch'
import { toggleDetailPanel } from './toggleDetailPanel'
import { switchTheme } from './switchTheme'
import { aboutDialog } from './aboutDialog'
import { settingsNavigation } from './settingsNavigation'
import { switchViewMode } from './switchViewMode'
import { switchSort } from './switchSort'
import { sidebarLayoutDialog } from './sidebarLayoutDialog'
import { manageDialogs } from './manageDialogs'
import { dashboardLayout } from './dashboardLayout'
import { urlImportValidation } from './urlImportValidation'
import { openFolderTabBreadcrumb } from './openFolderTabBreadcrumb'
import { renameFolder } from './renameFolder'
import { mediaSelection } from './mediaSelection'
import { mediaSetFolderTag } from './mediaSetFolderTag'
import { trashRestore } from './trashRestore'
import { imagePreviewNavigation } from './imagePreviewNavigation'
import { titleFilterCount } from './titleFilterCount'
import { savedFilter } from './savedFilter'
import { sidebarRecentPreview } from './sidebarRecentPreview'
import { detailPanelStarTag } from './detailPanelStarTag'

const uiTests: Record<string, (...args: any[]) => Promise<unknown>> = {
  createFolder,
  createTag,
  deleteFolderDialog,
  switchCategory,
  tabOperations,
  tabContextMenu,
  toggleSidebarSection,
  folderTreeSearch,
  toggleDetailPanel,
  switchTheme,
  aboutDialog,
  settingsNavigation,
  switchViewMode,
  switchSort,
  sidebarLayoutDialog,
  manageDialogs,
  dashboardLayout,
  urlImportValidation,
  openFolderTabBreadcrumb,
  renameFolder,
  mediaSelection,
  mediaSetFolderTag,
  trashRestore,
  imagePreviewNavigation,
  titleFilterCount,
  savedFilter,
  sidebarRecentPreview,
  detailPanelStarTag,
}

if (import.meta.env.DEV) {
  window.__procmUiTests = uiTests
  // UI 测试面板窗口经 BroadcastChannel 调用上述测试，见 public/ui-test-panel.html
  import('./panel-bridge').then(({ setupUiTestPanelBridge }) => setupUiTestPanelBridge())
}
