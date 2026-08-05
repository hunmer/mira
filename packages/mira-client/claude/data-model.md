# mira-client 数据模型

> 客户端不持有数据库,持久化数据在服务端/core 层 SQLite。这里记录运行时状态模型。

## 运行时状态(Pinia)

11 个 Store,存在于渲染进程内存,持久化策略各 Store 自定:

| Store | 核心状态 |
|-------|----------|
| AuthStore | 会话 token、当前用户、登录态 |
| LibraryStore | 当前库、库列表、库切换 |
| MediaStore | 媒体文件列表、筛选条件、选中项、分页 |
| SettingsStore | 应用配置、服务器地址、UI 偏好 |
| PluginStore | 已装插件、插件市场列表 |
| FolderStore | 文件夹树 |
| TagStore | 标签集、文件-标签关系 |
| ServerListStore | 多服务器连接配置 |
| UploadHistoryStore | 上传记录 |
| AppStateStore | 全局 UI 状态(加载、对话框等) |
| DashboardStore | Dashboard Web URL |

## Tab 系统状态

7 种 Tab 类型:HomeTabType、AllTabType、FolderTabType、TagTabType、TrashTabType、UncategorizedTabType、UntaggedTabType。

每个 Tab 实例持有:类型标识、视图参数、生命周期状态(onInit/onActive/onInactive/onClose)。

## IPC 消息(渲染 ↔ 主)

- 经 contextBridge 暴露的 API 调用,前缀见 public-interfaces.md
- 主进程 Handler 返回 Promise 风格结果

## 与服务端的数据契约

- REST:统一响应 `{ code, data, message?, timestamp }`
- WebSocket:`{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 媒体资源经 `mira://` 协议本地加载

## 跨进程共享类型

`src/shared/types.ts`、`src/types/` 定义跨进程共享的实体与消息类型。
