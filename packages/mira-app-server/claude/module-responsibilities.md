# module-responsibilities

按文件/模块分解职责（基于实际扫描；`src/cli/`、`src/mcp/`、`src/sync/` 为 2026-08 新增目录）。

## 顶层核心 (`src/`)

| 文件 | 行数(估) | 职责 |
|------|----------|------|
| `src/MiraServer.ts` | ~104 | 顶层编排类 `MiraServer`：构造默认端口（8081/8018）、`start()` 依次初始化 SettingsManager → ThumbnailService → MiraHttpServer → MiraWebsocketServer → 接入缩略图广播 → 加载 LibraryStorage；提供 `stop()`、`createAndStart()`、各类 getter；定义 `ServerConfig`。 |
| `src/HttpServer.ts` | ~15K | `MiraHttpServer`：创建 Express app、注册全部路由、HTTP 日志中间件、CORS、permission 中间件、`/health` 端点。 |
| `src/WebSocketServer.ts` | ~11K | `MiraWebsocketServer`：基于 `ws`，`libraryClients` 按 `libraryId` 分组管理连接、query 鉴权、`WebSocketRouter` 分发；定义 `ConnectedClient` / `WSUserInfo`。 |
| `src/LibraryStorage.ts` | ~11K | 多素材库加载/卸载/启用/禁用，读取 `data/librarys.json`。 |
| `src/LibraryWatcher.ts` | ~11K | chokidar 监视库目录变更。 |
| `src/ServerPluginManager.ts` | 660 行 | **双协议插件管理器**(per-library):协议 A `extends ServerPlugin`(HTTP Hook / 路由 / cleanup)、协议 B `registerFileFormat(ServerFileFormatHandler)`(联动 ThumbnailService + MetadataService + Web viewer iframe 解析);含生命周期(load/unload/reload/addPlugin)、Web plugin manifest 校验、插件列表元数据。详见 [plugin-system.md](plugin-system.md)。定义 `PluginConfig`、`HttpHookDefinition`、`HttpHookContext`、`ServerFileFormatHandler`、`ServerPreviewViewerDefinition`、`ResolvedPreviewViewer`。 |
| `src/ServerPlugin.ts` | ~4K | 协议 A 插件基类 `ServerPlugin`(配置读写、路由注册)、`PluginRouteDefinition`。 |
| `src/UserStorage.ts` | ~15K | 用户管理、认证、会话（SQLite `users.db`）。 |
| `src/SettingsManager.ts` | ~52 行 | 全局设置：`ServerSettings`（`authRequired`、`allowRegistration`、`dashboardPort`）读写 `data/settings.json`，含默认值合并。 |
| `src/types.ts` | ~32 行 | 共享类型：`User`、`Session`、`WebSocketMessage`。 |
| `src/index.ts` | ~69 行 | 模块入口：加载 `.env`、`startServer()`、导出核心类与类型；`require.main === module` 时自启。 |
| `src/server.ts` | ~8 行 | re-export 桥（`MiraServer`、`ServerConfig`、`MiraHttpServer`、`MiraWebsocketServer`、`startServer`）。注意：`HttpServer.ts` 内部类名为 `MiraHttpServer`，与 `MiraServer.ts` 中 `import { MiraHttpServer } from "./HttpServer"` 一致。 |
| `src/cli.ts` | 383 行 | `commander` CLI 总入口：顶层 `start` / `stop` / `restart` / `version` / `health`；`--mcp` 短路进入 MCP 服务模式；版本号从 `package.json` 动态读取。域命令在 `src/cli/commands/` 注册。 |

## CLI 模块 (`src/cli/`，2026-08 新增)

| 文件 | 职责 |
|------|------|
| `src/cli/client.ts` | `getAnonymousClient` / `resolveConnection` — 基于 `mira-app-core/shared/sdk` 的 CLI 客户端与连接解析 |
| `src/cli/credentials.ts` | 登录凭证持久化 `~/.mira/credentials.json`，多 profile |
| `src/cli/autostart.ts` / `commands/autostart.ts` | 开机自启管理（enable/status/stop/restart） |
| `src/cli/doctor.ts` | `doctor` 诊断命令 |
| `src/cli/format.ts` | 输出格式化工具 |
| `src/cli/commands/*.ts`（11 个） | auth / user / libraries / files / tags / folders / plugins / devices / database / system / autostart 域命令 |

## MCP 模块 (`src/mcp/`，2026-08 新增)

| 文件 | 职责 |
|------|------|
| `src/mcp/server.ts` | `startMcpServer()` — `@modelcontextprotocol/sdk` stdio JSON-RPC 服务，鉴权复用 CLI profile；stdout 仅承载 JSON-RPC |
| `src/mcp/helpers.ts` | 工具注册辅助 |
| `src/mcp/tools/*.ts`（9 个） | auth / system / libraries / files / tags / folders / plugins / devices / database 的 MCP tools |

## 路由 (`src/routes/`)

| 文件 | 大小 | 职责 |
|------|------|------|
| `BaseRouter.ts` | 7.2K | 路由基类，提供 `ApiResponse`、`validateLibrary`、统一响应。 |
| `AuthRouter.ts` | 13K | 认证（登录/登出/token/注册）。 |
| `AdminsRouter.ts` | 7.7K | 管理员管理。 |
| `UserRouter.ts` | 10K | 用户信息。 |
| `LibraryRoutes.ts` | 29K | 素材库 CRUD + 启用/禁用/插件。 |
| `PluginRoutes.ts` | 43K | 插件管理（安装/卸载/配置/路由）。 |
| `DatabaseRoutes.ts` | 5.2K | 数据库操作。 |
| `FileRoutes.ts` | 38K | 文件上传/下载/管理/ZIP 导入。 |
| `DeviceRoutes.ts` | 17K | 设备管理。 |
| `TagRouter.ts` | 5.9K | 标签 CRUD。 |
| `FolderRouter.ts` | 6.3K | 文件夹 CRUD。 |
| `FsRouter.ts` | 29K | 文件系统操作。 |
| `ThumbRouter.ts` | 4.4K | 缩略图管理。 |
| `StatisticsRouter.ts` | 8.4K | 统计。 |
| `SettingsRouter.ts` | 1.8K | 服务端设置。 |
| `CookieSitesRouter.ts` | 4.9K | Cookie 站点管理（`/api/cookie-sites`，2026-08 新增）。 |
| `DownloadRoutes.ts` | 3.5K | 下载任务（`/api/download`，2026-08 新增，配合 `DownloadExecutorService`）。 |
| `HttpRouter.ts` | 8.4K | 插件静态资源 + 动态路由。 |
| `WebSocketRouter.ts` | 1.5K | WebSocket 消息分发。 |

## 处理器 (`src/handlers/`)

| 文件 | 职责 |
|------|------|
| `MessageHandler.ts` | 通用消息处理。 |
| `FileHandler.ts` | 文件操作消息。 |
| `FolderHandler.ts` | 文件夹操作消息。 |
| `TagHandler.ts` | 标签操作消息。 |
| `LibraryHandler.ts` | 素材库操作消息。 |
| `PluginMessageHandler.ts` | 插件消息转发。 |

## 中间件 (`src/middleware/`)

| 文件 | 职责 |
|------|------|
| `permission.ts` | 权限配置表 + `createHttpPermissionMiddleware`、`canAccessLibrary`、`extractLibraryId`、`isPublicRoute`、`isLibraryScoped`。 |

## 服务 (`src/services/`)

| 文件 | 职责 |
|------|------|
| `ThumbnailService.ts` | 内置缩略图服务（11K），`ThumbnailGenerator` 接口、Image/Video Generator、`registerGenerator()`、`setWebSocketServer()` 广播进度。 |
| `MetadataService.ts` | 元数据解析规则注册（`registerRule` / `unregisterRule`），与协议 B 格式插件联动。 |
| `DownloadExecutorService.ts` | 下载任务执行（配合 `DownloadRoutes` / SDK `DownloadModule`）。 |
| `DuplicateScanner.ts` | 重复文件扫描（原 mira_duplicate_scanner 插件功能内置，含测试）。 |
| `DatabaseBackupService.ts` | 数据库备份（archiver 打包）。 |
| `LogRingBuffer.ts` | 环形日志缓冲（配合 SSE 日志流）。 |
| `procm.ts` | 进程管理相关服务。 |

## 同步模块 (`src/sync/`，2026-08 新增)

| 文件 | 职责 |
|------|------|
| `FilePathSet.ts` / `.test.ts` | 文件路径集合（`node --test` 测试）。 |
| `ImportedFileEvents.ts` / `.test.ts` | 已导入文件事件追踪。 |
| `SyncFilter.ts` | 同步过滤规则。 |

## 插件目录 (`src/plugins/`)

- `plugins.json` — 插件注册清单。
- `package.json` / `package-lock.json` / `node_modules/` — 插件依赖（npm 安装）。
- `mira_thumb/`、`mira_user/` — 内置示例插件目录（含 `data/`）。
- 重复文件扫描已内置到 `FsRouter` 与 `DuplicateScanner` 服务，不再依赖插件。

> 注：`src/plugins/node_modules` 体量巨大，未纳入扫描。
