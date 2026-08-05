# mira-client 对外/对内接口

## Pinia Store(11 个)

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

## IPC 通道(经 contextBridge 暴露)

| 通道前缀 | 描述 |
|----------|------|
| `protocol:*` | `mira://` 协议注册/注销/查询 |
| `tray:*` | 托盘设置/闪烁/提示 |
| `search-window:*` | 搜索窗口显示/隐藏/切换 |
| `shortcut:*` | 快捷键注册/注销 |
| `plugin:*` | 插件发现/安装/执行/卸载 |
| `drag-drop:*` | 拖拽启动 |
| `fs:*` | 文件系统读写/目录选择 |
| `hot-update:*` | 热更新 |
| `app:*` | 应用信息/版本/路径 |
| `window:*` | 窗口操作 |
| `system:*` | 系统信息/剪贴板 |
| `menu:*` | 菜单事件 |
| `auto-update:*` | 自动更新 |
| `notification:*` | 通知 |

对应 Handler 实现:`src/main/ipc/*Handlers.ts`,注册中心 `src/main/ipc/handlers.ts`。

## Views(页面视图)

| 视图 | 文件 | 说明 |
|------|------|------|
| HomeView | `views/HomeView/index.vue` | 主页(工具栏/侧边栏/对话框) |
| SettingsView | `views/SettingsView.vue` | 设置页 |
| LoginView | `views/LoginView.vue` | 登录页 |
| FileUploadView | `views/FileUploadView.vue` | 文件上传 |
| FilePreviewView | `views/FilePreviewView.vue` | 文件预览 |
| NotFoundView | `views/NotFoundView.vue` | 404 |
| MenuTestView | `views/MenuTestView.vue` | 菜单测试 |

## Tab 系统

基于视图的标签页系统,内置 7 种 Tab 类型:HomeTabType、AllTabType、FolderTabType、TagTabType、TrashTabType、UncategorizedTabType、UntaggedTabType。

生命周期钩子:`onInit` / `onActive` / `onInactive` / `onClose`。

## 自定义协议

`mira://`(主进程 ProtocolService 注册)—— 本地资源/缩略图安全加载。

## UI 组件库公共接口

`@/components/ui/<name>` 导出各 shadcn-vue 组件(Button、Dialog、Popover、Select、Table 等 34 类)。完整清单见 [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)。
