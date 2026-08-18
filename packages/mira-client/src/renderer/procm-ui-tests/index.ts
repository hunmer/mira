// 真实页面 UI 测试注册表：仅开发构建加载（见 main.ts），生产构建不暴露测试函数。
// 新增测试：在同目录新建独立文件并导出 async 函数，再在此惰性注册。
declare global {
  interface Window {
    __procmUiTests?: Record<string, (...args: any[]) => Promise<unknown>>
  }
}

type UiTest = (...args: any[]) => Promise<unknown>

function lazyUiTest(load: () => Promise<unknown>, exportName: string): UiTest {
  return async (...args) => {
    const module = await load() as Record<string, UiTest>
    const test = module[exportName]
    if (!test) throw new Error(`UI test export "${exportName}" was not found`)
    return test(...args)
  }
}

export const createFolder = lazyUiTest(() => import('./createFolder'), 'createFolder')
export const createTag = lazyUiTest(() => import('./createTag'), 'createTag')
export const deleteFolderDialog = lazyUiTest(() => import('./deleteFolderDialog'), 'deleteFolderDialog')
export const switchCategory = lazyUiTest(() => import('./switchCategory'), 'switchCategory')
export const tabOperations = lazyUiTest(() => import('./tabOperations'), 'tabOperations')
export const tabContextMenu = lazyUiTest(() => import('./tabContextMenu'), 'tabContextMenu')
export const toggleSidebarSection = lazyUiTest(() => import('./toggleSidebarSection'), 'toggleSidebarSection')
export const folderTreeSearch = lazyUiTest(() => import('./folderTreeSearch'), 'folderTreeSearch')
export const toggleDetailPanel = lazyUiTest(() => import('./toggleDetailPanel'), 'toggleDetailPanel')
export const switchTheme = lazyUiTest(() => import('./switchTheme'), 'switchTheme')
export const aboutDialog = lazyUiTest(() => import('./aboutDialog'), 'aboutDialog')
export const settingsNavigation = lazyUiTest(() => import('./settingsNavigation'), 'settingsNavigation')
export const switchViewMode = lazyUiTest(() => import('./switchViewMode'), 'switchViewMode')
export const switchSort = lazyUiTest(() => import('./switchSort'), 'switchSort')
export const sidebarLayoutDialog = lazyUiTest(() => import('./sidebarLayoutDialog'), 'sidebarLayoutDialog')
export const manageDialogs = lazyUiTest(() => import('./manageDialogs'), 'manageDialogs')
export const dashboardLayout = lazyUiTest(() => import('./dashboardLayout'), 'dashboardLayout')
export const urlImportValidation = lazyUiTest(() => import('./urlImportValidation'), 'urlImportValidation')
export const openFolderTabBreadcrumb = lazyUiTest(() => import('./openFolderTabBreadcrumb'), 'openFolderTabBreadcrumb')
export const renameFolder = lazyUiTest(() => import('./renameFolder'), 'renameFolder')
export const mediaSelection = lazyUiTest(() => import('./mediaSelection'), 'mediaSelection')
export const mediaSetFolderTag = lazyUiTest(() => import('./mediaSetFolderTag'), 'mediaSetFolderTag')
export const trashRestore = lazyUiTest(() => import('./trashRestore'), 'trashRestore')
export const imagePreviewNavigation = lazyUiTest(() => import('./imagePreviewNavigation'), 'imagePreviewNavigation')
export const titleFilterCount = lazyUiTest(() => import('./titleFilterCount'), 'titleFilterCount')
export const savedFilter = lazyUiTest(() => import('./savedFilter'), 'savedFilter')
export const sidebarRecentPreview = lazyUiTest(() => import('./sidebarRecentPreview'), 'sidebarRecentPreview')
export const detailPanelStarTag = lazyUiTest(() => import('./detailPanelStarTag'), 'detailPanelStarTag')

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
  void import('./panel-bridge')
    .then(({ setupUiTestPanelBridge }) => setupUiTestPanelBridge())
    .catch((error) => console.warn('[procm-ui-tests] Failed to register panel bridge:', error))
}
