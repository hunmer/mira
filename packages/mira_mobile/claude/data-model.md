# 数据模型 / 状态管理

> 更新：2026-08-09

> SDK 后端 DTO 在 `lib/mira_sdk/models/`；应用本地态在 `lib/src/providers/` 与 `lib/src/models/`。
> 序列化全部**手写** `toJson`/`fromJson`，无 `freezed`，无 codegen。

## SDK 模型（后端 DTO）

### 公共（`models/common.dart`）
- **`ClientConfig`** — `baseUrl`, `timeout`(默认 60s), `headers?`, `token?`(可变), `getToken` 回调。
  取 token 优先级：`getToken?.call() ?? token`。
- **`BaseResponse<T>`** — 外层包裹 `{code?, success?, message, data, timestamp?}`（被 HttpClient 自动剥去）。
- **`ErrorResponse`** / **`MiraApiException`** — 错误载体，`implements Exception`。

### 认证（`models/auth.dart`，依赖 `user.dart`）
`LoginRequest{username,password}` / `LoginResponse{accessToken, user?}` /
`RegisterRequest/Response` / `VerifyResponse{user: UserInfo}`。

### 文件（`models/file.dart`）
- **`FileData`** ⭐ — `id, name, path, size, extension, folderId, folderName, filePath, thumbPath,
  recycled, tags`(JSON **字符串**), `uploader, createdAt, importedAt`；`parsedTags()` 把 tags 解成 List。
  **注意：无 width/height 字段**（画廊靠运行时测图）。
- **`FilesPage`** — 分页 `{result: List<FileData>, limit, offset, total}`。
- `FileFilters` — 查询过滤；`toJson` 把 `folderId`/`tags` 的 null 语义映射为后端 `uncategorized`/`untagged` 键。
- `GetFilesRequest{libraryId, filters?, isUrlFile?, clientId?}`。
- `UploadResult{success, file, error?}` / `UploadResponse{results}`。

### 素材库（`models/library.dart`）
`Library{id(String), name, path, status("active|inactive|error"), fileCount, size, description,
createdAt, updatedAt, icon?, customFields?, pluginsDir?, allowedRoles?}`。
`/api/libraries` 返回**裸数组**（无 BaseResponse 包裹）。

### 文件夹（`models/folder.dart`）& 标签（`models/tag.dart`）
对称结构：`Folder{id, title, parentId?(null=根), path?, color?, icon?, description?, createdAt?, updatedAt?, fileCount?}`；
`Tag` 同形（无 path）。各自含 `Query`/`Create`/`Update`/`Delete`/`SetFile*/GetFile*` 请求 DTO。
后端键为 snake_case（`parent_id`/`file_count`）。

### 其余
`models/user.dart`(`UserInfo`)、`plugin.dart`、`database.dart`、`device.dart`、`system.dart`。
`models/models.dart` 是 barrel。

## 应用本地模型

### `lib/src/models/server_config.dart` — `ServerConfig`（**本地**，非后端 DTO）
不可变。字段：`id, name, serverUrl, wsUrl, authMethod`(0=用户名密码 / 1=Token), `username?,
password?, token?, smbEnabled, mountPath?, smbPath?, createdAt, isCurrent, lastLibraryId?`。
`fromJson/toJson/copyWith`；`generateId()`（ms 时间戳）；`generateWsUrl(serverUrl)`（http→ws/https→wss，端口=服务端口+1，默认 8018）。

## Riverpod 状态管理

`ProviderScope` 在 `main()`，**无 overrides**。核心约定：`MiraClient` 不是 Provider，
挂在 `SessionState.client`，各 provider 经 `ref.read(sessionProvider).client` 取。

| Provider | 类型 | 状态 | 关键行为 / 依赖 |
|----------|------|------|-----------------|
| `sessionProvider` | `StateNotifierProvider<SessionNotifier, SessionState>` | `{status, client: MiraClient?, library, user, connectedServerId?, error?}` | **唯一持有 client**。`connectToServer` 单一认证入口（按 `authMethod==1 && token` 选 token vs 账密）；`restoreLastSession(server)` 连接后自动选 `lastLibraryId`，返回是否完整恢复。非 autoDispose（跨页共享）。 |
| `serverListProvider` | `StateNotifierProvider<ServerListNotifier, List<ServerConfig>>` | 服务器列表 | 透传 `ServerStorageService` 单例 |
| `librariesProvider` | `FutureProvider<List<Library>>` | 异步库列表 | watch `sessionProvider`；未连接返回 `[]`，否则 `client.libraries().getAll()` |
| `filesViewProvider` | `StateNotifierProvider<FilesViewNotifier, FilesViewState>` | `{items, total, loadedOffset, loading, hasMore, error?}`，页大小 `kFilesPageSize=30` | `reload()`/`loadMore()`；listen `fileFilterProvider` + `session.select(library?.id)` 自动重载；**多文件夹选择并发请求后合并去重**（后端 folderId 单值） |
| `fileFilterProvider` | `StateNotifierProvider<FileFilterNotifier, FileFilterState>` | `{selectedFolderIds: Set<int>, selectedTags: Set<String>, special: SpecialFilter}`；`enum SpecialFilter{all,uncategorized,untagged}` | `toggleFolder/toggleTag`(清 special)、`setSpecial`(清 folder/tag)、`clear` |
| `foldersProvider` | `FutureProvider<List<Folder>>` | 异步全量文件夹 | `client.folders().getAll(libId)`（不用 query，因 parent_id 过滤不可靠） |
| `tagsProvider` | `FutureProvider<List<Tag>>` | 异步全量标签 | `client.tags().getAll(libId)` |

### 状态流转要点
- 切库 → `sessionProvider.select(library?.id)` 变 → `filesViewProvider`/`folders`/`tags` 自动重载。
- 过滤变化 → `fileFilterProvider` → `filesViewProvider.reload()`。
- 会话恢复契约：`restoreLastSession` 返回 `true` 仅当连接成功且保存的库仍存在。

## 持久化

仅 `ServerStorageService`（SharedPreferences，键 `mira_servers`，JSON 数组）。无 DB / 无缓存层
（图片缓存由 `cached_network_image` 自管）。

## 消息结构（WebSocket）

`WebSocketMessage{eventName: String, data: Map}`；订阅 `on(name, cb)`，`'*'` 通配；断线重连
`reconnectInterval=3s`、`maxReconnectAttempts=5`。当前 App 主要消费 REST，WS 为 SDK 能力储备。
