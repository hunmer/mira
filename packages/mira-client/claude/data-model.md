# mira-client 数据模型

> 客户端不持有数据库,持久化数据在服务端/core 层 SQLite。这里记录运行时状态模型。

## 运行时状态(Pinia)

15 个 Store,存在于渲染进程内存,持久化策略各 Store 自定:

| Store | 核心状态 |
|-------|----------|
| AuthStore | 会话 token、当前用户、登录态 |
| LibraryStore | 当前库、库列表、库切换 |
| MediaStore | 媒体文件列表、筛选条件、选中项、分页;v3.0.2:语义搜索结果(semanticFileIds→filters.ids + sort='ids' asc)、日期双模式筛选(dateMode imported/fileCreated)、recycled 字段归一化(Number(file.recycled)\|\|0) |
| SettingsStore | 应用配置、服务器地址、UI 偏好;v3.0.2 新增上传限额与通知:uploadMaxFilesPerBatch(0=不限)/uploadMaxConcurrentUploads(默认3)/uploadMaxTotalSize(默认1GB,0=不限)/maxVisibleNotifications(1-10) |
| PluginStore | 已装插件、插件市场列表 |
| FolderStore | 文件夹树 |
| TagStore | 标签集、文件-标签关系 |
| ServerListStore | 多服务器连接配置 |
| UploadHistoryStore | 上传记录 |
| AppStateStore | 全局 UI 状态(加载、对话框等) |
| DashboardStore | Dashboard Web URL |
| DashboardLayoutStore | Dashboard 布局(多 layout 版本)持久化 |
| HomeSidebarLayoutStore | Home 侧边栏已启用模块的有序列表 |
| UrlImportStore | 「从 URL 导入」全局对话框显隐与参数 |
| ViewHistoryStore | 预览路由浏览历史(详情面板「最近查看」) |

## Tab 系统状态

7 种 Tab 类型:HomeTabType、AllTabType、FolderTabType、TagTabType、TrashTabType、UncategorizedTabType、UntaggedTabType。

每个 Tab 实例持有:类型标识、视图参数、生命周期状态(onInit/onActive/onInactive/onClose)。

## 渲染进程事件总线(v3.0.2)

`miraEventBus`(`src/renderer/services/EventBus.ts`,event-emitter-adv)类型化事件 14 种(MiraEventMap,详见 public-interfaces.md);on/off/emit/emitAsync,emit 支持 weight。上传批次完成后由 WebSocketService 发 `scheduleTreeRefresh` 延迟刷新(file::created 可能早于统计落盘)。

## IPC 消息(渲染 ↔ 主)

- 经 contextBridge 暴露的 API 调用,前缀见 public-interfaces.md
- 主进程 Handler 返回 Promise 风格结果

## 与服务端的数据契约

- REST:统一响应 `{ code, data, message?, timestamp }`
- WebSocket:`{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 媒体资源经 `mira://` 协议本地加载

## 跨进程共享类型

`src/shared/types.ts`、`src/types/` 定义跨进程共享的实体与消息类型。v3.0.2:`FileInfo` 新增 `recycled?: number`;`ElectronAPI` 新增 `getPathForFile`(Electron 29+ 移除 File.path 后经 webUtils 取路径,`SystemInfo` 同名方法已删)。
