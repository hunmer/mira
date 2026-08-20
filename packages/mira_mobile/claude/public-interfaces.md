# 对外接口 / 路由 / API 契约

> 更新：2026-08-09

## 1. App 内部路由（`lib/router/app_router.dart`）

`CupertinoApp` 命名路由 + `onGenerateRoute`（Navigator 1.0），共 **17 条**。初始路由 `/`。
跳转 API：`AppRouter.navigateTo` / `replaceWith` / `navigateAndClearStack` / `goBack`，
或单例 `RouterController`。

| 路由 | 中文名 | 目标 Widget | arguments |
|------|--------|-------------|-----------|
| `/` | 首页 | `MainShellScreen`（3-Tab 壳） | — |
| `/settings` | 设置 | `SettingsScreen` | — |
| `/server_list` | 服务器列表 | `ServerListScreen` | — |
| `/server_edit` | 编辑服务器 | `ServerEditScreen` | `ServerConfig?` |
| `/library_select` | 选择素材库 | `ServerListScreen(initialTab: 1)`（选库已并入服务器列表页 Tab） | — |
| `/library_item_list` | 画廊 | 画廊页（也嵌入 MainShell） | — |
| `/item_detail` | 文件信息 | `ItemDetailScreen`（**静态展示页**，编辑功能 TODO） | — |
| `/tree_view` | 文件夹 | `TreeViewScreen`（也嵌入 MainShell Tab2） | — |
| `/upload` | 上传文件 | `UploadScreen` | — |
| `/backup_settings` | 备份设置 | `BackupSettingsScreen` | — |
| `/download_settings` | 下载设置 | `DownloadSettingsScreen` | — |
| `/background_settings` | 背景设置 | `BackgroundSettingsScreen` | — |
| `/about_settings` | 关于 | `AboutSettingsScreen` | — |
| `/image_preview` | 图片预览 | `ImagePreviewScreen` | `PreviewArgs{files, initialIndex}` |
| `/video_preview` | 视频预览 | `VideoPreviewScreen` | `PreviewArgs{files, initialIndex}` |
| `/file_preview` | 通用文件预览 | `FilePreviewScreen` | — |
| `/dashboard` | 仪表盘 | `DashboardScreen` | — |

`PreviewArgs` 定义在 `app_router.dart`：`{List<FileData> files, int initialIndex}`。
default 分支 → `PlaceholderWidget(titleKey: 'route.notFound')`（404；原 `/profile` 占位路由已删除）。

## 2. Mira SDK 公共接口（`lib/mira_sdk/`）

### `MiraClient`（主客户端）
```dart
MiraClient(String baseUrl, {int? wsPort, ClientConfig? config})
// 资源域访问器（返回各 *Module）
auth() user() libraries() files() folders() tags()
plugins() database() devices() system()
// 链式
setToken(t) clearToken() login(u,p) logout()
// 探活
isConnected() waitForServer({timeout, interval})
websocket({options})  // 建 WS 客户端（默认端口 8018）
getHttpClient() dispose()
```

### 模块 → 后端 REST 端点（活跃 SDK，基于 `http`）

所有 `GET/POST/PUT/DELETE` 走 `MiraHttpClient`（自动注入 Bearer token + 剥壳 `data`）。

**AuthModule** (`/api/auth/*`)
| 方法 | 端点 | 返回 |
|------|------|------|
| `login(u,p)` | POST `/api/auth/login` | `LoginResponse`（自动 `setToken`） |
| `register(u,p)` | POST `/api/auth/register` | `RegisterResponse` |
| `logout()` | POST `/api/auth/logout` | void（`clearToken`） |
| `verify()` | GET `/api/auth/verify` | `VerifyResponse` |
| `getCodes()` | GET `/api/auth/codes` | `List<String>` |

**LibraryModule** (`/api/libraries`)
| 方法 | 端点 | 返回 |
|------|------|------|
| `getAll()` | GET `/api/libraries` | `List<Library>`（**裸数组，无包裹**） |
| `getById(id)` | GET `/api/libraries` | `Library`（客户端过滤） |
| `create/update/delete/stop/start` | POST/PUT/DELETE `/api/libraries[/$id[/start\|stop]]` | void |

**FileModule** (`/api/files/*`)
| 方法 | 端点 | 返回 |
|------|------|------|
| `getFiles(req)` | POST `/api/files/getFiles` | `FilesPage`（分页 result/limit/offset/total） |
| `getFile(libId, fileId)` | POST `/api/files/getFile` | `FileData` |
| `download(lib, fileId)` | GET `/api/files/download/$lib/$fileId` | `List<int>` |
| `delete(lib, fileId, {moveToRecycleBin})` | DELETE `/api/files/$lib/$fileId[?moveToRecycleBin]` | void |
| `restoreFile(lib, fileId)` | POST `/api/files/recover` | void |
| `emptyTrash(lib)` | DELETE `/api/files/$lib/trash` | void |
| `renameFile`/`updateFile` | POST `/api/files/rename` `/api/files/update` | `FileData` |
| `getExtraFileList/Url` | GET `/api/files/extra/$lib/$id[/$name]` | `List<String>`/`List<int>`/URL |
| `uploadFile/uploadFiles` | POST `/api/files/upload`（**multipart**） | `UploadResponse` |

**FolderModule** (`/api/folders/*`)：`getAll`(GET) / `query`(POST) / `create`(POST→int) /
`update`(PUT) / `delete`(DELETE **带 body**) / `setFileFolder`(POST) / `getFileFolder`(GET)。
根 `parentId = null`。

**TagModule** (`/api/tags/*`)：结构与 FolderModule 对称（`getAll/query/create/update/delete/setFileTags/getFileTags`）。
`delete` 同样带 body。

**其余模块**：`UserModule`、`PluginModule`、`DatabaseModule`、`DeviceModule`、`SystemModule`
（`isServerAvailable`/`waitForServer`/`getHealth`）。本 App 主要用前 5 个。

### 媒体直链（非 REST 模块，由 UI 直接拼 URL，经 `getUrl` 加 token）
- 缩略图：`GET /api/files/thumb/:libraryId/:id`（PNG）
- 原图/视频：`GET /api/files/file/:libraryId/:id`（支持 Range，mp4 直接放）
- HLS 转码：`GET /api/files/preview/:libraryId/:fileId/index.m3u8` + `/segment/:n.ts`（非 mp4 视频）

### WebSocket（`MiraWebSocketClient`）
- 连接：`ws[s]://<host>:<wsPort>/?token=&libraryId=&clientId=`（默认端口 8018）。
- 消息：`{eventName, data}`；`on(name, cb)` 订阅，`'*'` 通配；断线自动重连（`maxReconnectAttempts=5`）。

## 3. 本地存储接口（`ServerStorageService`）

单例 `ServerStorageService.instance`。SharedPreferences 键 `mira_servers`（`List<ServerConfig>` 的 JSON）。
方法：`init()` `addServer` `updateServer` `deleteServer` `setCurrentServer` `currentServer`
`getServerById` `serverIdExists` `refresh`。首台自动置 `isCurrent`。

## 4. 后端服务（外部，非本仓库）

Mira App Server（TypeScript）。App 只消费其 API。仓库 `https://github.com/hunmer/mira_mobile.git`。
