# mira-client 对外/对内接口

## Pinia Store(15 个)

| Store | 文件 | 说明 |
|-------|------|------|
| AuthStore | `stores/auth.ts` | 用户认证、会话 |
| LibraryStore | `stores/library.ts` | 媒体库管理 |
| MediaStore | `stores/media.ts` | 媒体文件核心状态 |
| SettingsStore | `stores/settings.ts` | 应用配置、服务器设置 |
| PluginStore | `stores/plugin.ts` | 插件市场与管理 |
| FolderStore | `stores/folder.ts` | 文件夹管理 |
| TagStore | `stores/tag.ts` | 标签管理 |
| ServerListStore | `stores/serverList.ts` | 多服务器列表 |
| UploadHistoryStore | `stores/uploadHistory.ts` | 上传历史 |
| AppStateStore | `stores/appState.ts` | 应用全局状态 |
| DashboardStore | `stores/dashboard.ts` | Dashboard Web URL 管理 |
| DashboardLayoutStore | `stores/dashboardLayout.ts` | Dashboard 布局持久化(多 layout 版本,v2.x 新增) |
| HomeSidebarLayoutStore | `stores/homeSidebarLayout.ts` | Home 侧边栏已启用模块持久化(v2.x 新增) |
| UrlImportStore | `stores/urlImport.ts` | 「从 URL 导入」全局对话框状态(v2.x 新增) |
| ViewHistoryStore | `stores/viewHistory.ts` | 预览浏览历史(详情面板「最近查看」)(v2.x 新增) |

## IPC 通道(经 contextBridge 暴露)

以 `src/preload/preload.ts` 实际暴露的前缀为准:

| 通道前缀 | 描述 |
|----------|------|
| `protocol:*` | `mira://` 协议注册/注销/查询 |
| `tray:*` | 托盘设置/闪烁/提示(含 `tray:set-locale`) |
| `search-window:*` | 搜索窗口显示/隐藏/切换 |
| `shortcut:*` | 快捷键注册/注销 |
| `plugin:*` | 插件发现/安装/执行/卸载 |
| `plugin-window:*` | 插件窗口(v2.x 新增) |
| `drag-drop:*` | 拖拽启动 |
| `fs:*` | 文件系统读写/目录选择 |
| `app:*` | 应用信息/版本/路径 |
| `network:*` | 网络状态(v2.x 新增) |
| `server-control:*` / `server-deploy:*` / `server-autostart:*` | 内置服务端控制/部署/自启动(v2.x 新增) |
| `floating-ball:*` | 悬浮球窗口(v2.x 新增) |
| `library-cache:*` | 渲染层库缓存(v2.x 新增) |
| `notification:*` | 通知 |
| `update:*` / `updater:*` | 自动更新 |

对应 Handler 实现:`src/main/ipc/*Handlers.ts`(20 个,+PluginExec/Screenshot),注册中心 `src/main/ipc/handlers.ts`。

## Views(页面视图)

| 视图 | 文件 | 说明 |
|------|------|------|
| HomeView | `views/HomeView/index.vue` | 主页(工具栏/侧边栏/对话框) |
| SettingsView | `views/SettingsView.vue` | 设置页(子面板在 `views/settings/`,含 playground/ 组件演练场) |
| LoginView | `views/LoginView/` | 登录页 |
| FileUploadView | `views/FileUploadView.vue` | 文件上传 |
| FilePreviewView | `views/FilePreviewView.vue` | 文件预览 |
| PlaygroundView | `views/PlaygroundView.vue` | UI Playground(/playground) |
| MenuTestView | `views/MenuTestView.vue` | 菜单测试 |
| NotFoundView | `views/NotFoundView.vue` | 404 |

路由(`router/index.ts`)另含 `/image-preview/:id`、`/video-preview/:id` 预览路由与 `/local-plugins`。

## Tab 系统

基于视图的标签页系统,内置 7 种 Tab 类型:HomeTabType、AllTabType、FolderTabType、TagTabType、TrashTabType、UncategorizedTabType、UntaggedTabType。

生命周期钩子:`onInit` / `onActive` / `onInactive` / `onClose`。

## 自定义协议

`mira://`(主进程 ProtocolService 注册)—— 本地资源/缩略图安全加载。

## UI 组件库公共接口

`@/components/ui/<name>` 导出各 shadcn-vue 组件(Button、Dialog、Popover、Select、Table、Chart 等 53 类)。完整清单见 [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)。
