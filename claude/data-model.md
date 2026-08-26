# 数据模型(全仓聚合)

> 核心数据存储在服务端/core 层。客户端为运行时状态(Pinia),不入库。

## 存储后端

- SQLite3,每个素材库(Library)一个独立 `.sqlite` 文件
- 实现位于 `mira-app-core/src/storage/sqlite/`(ILibraryServerData / LibraryServerDataSQLite)
- 数据目录由 `DATA_PATH`(默认 `./data`)控制

## 核心实体(基于 SDK 模块与路由推断)

| 实体 | 说明 | 来源 |
|------|------|------|
| Library | 素材库,每个库独立 SQLite;`customFields.importType` 决定导入模式(copy/move/link) | core storage |
| File | 媒体文件;**v3.0 起 `path` 语义**:copy/move 模式为 `NULL`,link 模式存源文件绝对路径 | core storage |
| Folder | 文件夹层级 | core storage |
| Tag | 文件标签 | core storage |
| User | 用户账号(super/admin/user 权限);`user_data/{userId}/` 用户文本文件 | server(内置) |
| Settings | 应用/服务器设置;v3.0 新增 `pluginSources`/`pluginSourceActive`(插件商店源) | server SettingsManager |
| ShareTicket | 设备分享一次性票据(内存态,TTL 30 分钟/最多 20 次) | server DeviceRoutes |
| LibraryImport | Eagle/Billfish 跨库导入异步任务(状态 importing/completed/error/cancelled) | server LibraryImportService |
| UploadStatistics | 上传统计 | server(原 upload_statistics 插件已合并) |

> 表结构精确字段未在本次扫描中逐一读取,详见 `packages/mira-app-core/claude/data-model.md`(若已生成)或 `src/storage/sqlite/` 源码。

## 实时消息结构

WebSocket 消息(JSON):

```
{ action, requestId, libraryId, clientId, payload: { type, data } }
```

## 客户端运行时状态(mira-client)

Pinia Store(15 个,另有 index.ts),仅存在于渲染进程内存,持久化由各 Store 自行决定:

AppStateStore、AuthStore、DashboardStore、DashboardLayoutStore、FolderStore、HomeSidebarLayoutStore、LibraryStore、MediaStore、PluginStore、ServerListStore、SettingsStore、TagStore、UploadHistoryStore、UrlImportStore、ViewHistoryStore。详见 `packages/mira-client/claude/public-interfaces.md`。
