# src/renderer/components/tabs - Tab 视图组件

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [components](../) > **tabs**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |
| 2026-08-24 | 重构 | `LocalFolderTabView.vue` 按功能拆分到 `LocalFolderTabView/` 子目录（纯重构，逻辑不变） |
| 2026-08-26 | 重构 | `MediaTabListView.vue` 模板按功能拆分为 `MediaTabListView/` 子组件（纯重构，逻辑不变） |

## 概述

Tab 视图组件目录包含 Tab 系统的视图层实现。

## 组件列表

| 组件 | 行数 | 描述 |
|------|------|------|
| `HomeTabView.vue` | - | 首页 Tab 视图（基于 grid-layout-plus 的可自定义卡片仪表盘） |
| `MediaTabListView.vue` | ~560 | 媒体列表 Tab 视图（核心；模板与脚本均为装配层，功能拆分到 `MediaTabListView/` 子目录） |
| `LocalFolderTabView.vue` | ~430 | 本地文件夹 Tab 视图（Electron fs 浏览器；脚本为装配层，功能拆分到 `LocalFolderTabView/` 子目录） |

## MediaTabListView 功能拆分

`MediaTabListView/` 目录按功能存放从 `MediaTabListView.vue` 拆出的组合式函数与子组件（纯重构，逻辑不变）：

| 文件 | 职责 |
|------|------|
| `useMediaTabFetch.ts` | 数据加载：分页取数、排序、刷新、WebSocket 活跃 tab 刷新回调 |
| `useMediaTabSelection.ts` | 选中逻辑：全选/反选/取消、选中项与详情侧栏同步 |
| `useMediaTabFilters.ts` | 筛选逻辑：FilterRule 合并/清除、已保存过滤器应用、初始规则同步 |
| `useMediaTabGrouping.ts` | 素材分组：按标签/文件夹/文件类型 + 分组章节导航 |
| `useMediaTabBreadcrumb.ts` | 面包屑导航：文件夹/标签层级路径与点击替换 Tab |
| `useMediaTabFolders.ts` | 子文件夹区：卡片数据、封面加载、尺寸计算、新建文件夹对话框 |
| `useMediaTabUpload.ts` | 拖拽上传/导入：拖放处理、URL 拖入、直接导入模式、上传对话框 |
| `useMediaTabBatchOps.ts` | 批量操作：按库分组恢复/彻底删除/删除 + 确认弹窗 + Delete 键 |
| `useMediaTabPagination.ts` | 分页：页码列表计算、翻页与滚动回顶部 |
| `useMediaTabSections.ts` | 区块编排：内置/注册区块合并、排序与隐藏（mediaTabLayout 偏好）、排序对话框状态 |
| `useFloatingToolbar.ts` | 浮动操作栏：FLIP 宽度过渡动画（由 MediaTabFloatingToolbar 使用） |
| `useMediaTabItemFields.ts` | 展示字段开关：控制视图项展示哪些信息（由 MediaTabStatusBar 使用） |
| `tabSections.ts` | 外部区块注册表（registerMediaTabSection）与注册区块宿主组件 MediaTabSectionHost |
| `mediaTabRuntime.ts` | 缓存/控制器数据源解析（resolveMediaTabItems） |
| `MediaTabTopBar.vue` | 顶部工具栏：筛选栏 + 更多操作菜单（视图切换/刷新/区块自定义） |
| `MediaTabFoldersSection.vue` | 子文件夹区块：卡片网格、封面、新增入口、拖放目标、超两行折叠 |
| `MediaTabMediaSection.vue` | 媒体区块：分组下拉 + 章节导航 + 网格/列表/瀑布流三视图（expose `refreshWaterfalls`） |
| `MediaTabFloatingToolbar.vue` | 浮动操作栏：选中项批量操作 + 分页控件（内嵌 FLIP 动画） |
| `MediaTabStatusBar.vue` | 底部状态栏：面包屑/文件数/选中数/分页信息/列数滑块/展示字段开关 |

依赖注入约定：`homeController` / `mediaTabData` / `emit` / `fetchPageData` / `handleRefresh` / `selectedItems` 等跨功能状态由主组件创建后作为 deps 传入；Pinia store 在各组合式函数内部自建（单例）。子组件只接收 props + emits 透传，不直接引用全局状态（自包含的 useFloatingToolbar / useMediaTabItemFields 除外）；外壳持有对话框、生命周期与监听器。

## LocalFolderTabView 功能拆分

`LocalFolderTabView/` 目录按功能存放从 `LocalFolderTabView.vue` 拆出的组合式函数与子组件（纯重构，逻辑不变）：

| 文件 | 职责 |
|------|------|
| `localFolderUtils.ts` | 纯工具：entryType/formatSize/mimeType/路径规整、toFileSystemEntry、`LocalFolderEntryActions` 接口 |
| `useLocalEntryFilters.ts` | 筛选/排序状态：searchQuery、type/dateFilter、sortKey/sortDirection + filterAndSortEntries |
| `useLocalPagination.ts` | 分页：pageLimits、滚动触底加载更多、按路径清除分页 |
| `useLocalThumbnails.ts` | 网格缩略图：native 缩略图请求去重、缓存与重置 |
| `useLocalGallery.ts` | 画廊预览：galleryEntry 图片预览 Blob URL 生命周期 |
| `useLocalFileActions.ts` | 文件操作：导入/上传对话框、copy/move picker、删除、定位、拖拽 |
| `LocalFolderHeader.vue` | 头部：返回上级、面包屑（每级下拉展示同级文件夹快速切换）、路径编辑、刷新 |
| `LocalFolderToolbar.vue` | 工具栏：搜索、类型/日期筛选、排序、视图切换、网格尺寸 |
| `LocalFolderEntryMenu.vue` | 条目右键菜单（list/grid、columns、gallery 三处复用） |
| `LocalFolderListGridView.vue` | 列表/网格视图 |
| `LocalFolderColumnsView.vue` | 分栏视图 + 选中文件信息面板 |
| `LocalFolderGalleryView.vue` | 画廊视图 + 预览 + 信息侧栏（expose `galleryScrollRef`） |
| `LocalFolderSelectionBar.vue` | 底部批量操作栏 |

依赖注入约定：目录导航/选中/tab 持久化等跨功能状态由主组件创建，文件操作通过 deps getter 传入 `useLocalFileActions`；各视图子组件只接收 props + 统一的 `actions: LocalFolderEntryActions` 回调对象（由主组件组装），不直接引用全局状态。

## Tab 视图架构

```
TabViewRenderer.vue (在 common/ 目录, 通用渲染器)
  ├── HomeTabView.vue (首页仪表盘)
  │   ├── 基于 grid-layout-plus 的可拖拽 / 缩放卡片网格
  │   ├── 右上角「添加卡片」菜单 + 「编辑模式」开关
  │   └── dashboard/ 子目录：
  │       ├── CardRegistry.ts        # 卡片类型注册管理器（单例）
  │       ├── DashboardCardShell.vue # 卡片外壳（标题栏 + 拖拽/删除按钮）
  │       └── cards/                 # 内置卡片（如 HitokotoCard.vue）
  └── MediaTabListView.vue (媒体列表)
      ├── 网格/列表视图切换
      ├── 筛选工具栏
      └── 分页/无限滚动
```

### Dashboard 卡片扩展机制

- 新增卡片：调用 `cardRegistry.register({ type, title, component, size, ... })`，
  component 可为异步组件（`defineAsyncComponent`）。第三方插件可运行时注册。
- 布局持久化：`stores/dashboardLayout.ts` 负责保存 LayoutItem[] 与 instance→type 映射到 ConfigStorage。
- 编辑模式：HomeTabView 右上角「编辑」开关，开启后卡片展示拖拽 handle 与删除按钮。
- 卡片配置（声明式表单）：卡片可声明 `configFields: SchemaField[]` + `configSchema: z.ZodType`
  （复用 `@/renderer/components/business/SchemaForm`），「添加卡片」菜单的「小组件配置」区
  或卡片编辑态齿轮按钮会打开 `CardConfigDialog`，由 SchemaForm 自动渲染并校验。
- 内置卡片：`dashboard/cards/` 下有 `HitokotoCard.vue`（一言）与 `AlbumCard.vue`
  （相册，shadcn-vue Carousel，数据源参考 HistoryPanel）。

## Tab 类型对应关系

| TabType | 视图组件 |
|---------|----------|
| `HomeTabType` | `HomeTabView.vue` |
| `AllTabType` | `MediaTabListView.vue` |
| `FolderTabType` | `MediaTabListView.vue` |
| `TagTabType` | `MediaTabListView.vue` |
| `TrashTabType` | `MediaTabListView.vue` |
| `UncategorizedTabType` | `MediaTabListView.vue` |
| `UntaggedTabType` | `MediaTabListView.vue` |
