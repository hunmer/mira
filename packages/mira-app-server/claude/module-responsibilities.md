# module-responsibilities

按文件/模块分解职责（基于实际扫描）。

## 顶层核心 (`src/`)

| 文件 | 行数(估) | 职责 |
|------|----------|------|
| `src/MiraServer.ts` | ~104 | 顶层编排类 `MiraServer`：构造默认端口（8081/8018）、`start()` 依次初始化 SettingsManager → ThumbnailService → MiraHttpServer → MiraWebsocketServer → 接入缩略图广播 → 加载 LibraryStorage；提供 `stop()`、`createAndStart()`、各类 getter；定义 `ServerConfig`。 |
| `src/HttpServer.ts` | ~15K | `MiraHttpServer`：创建 Express app、注册全部路由、HTTP 日志中间件、CORS、permission 中间件、`/health` 端点。 |
| `src/WebSocketServer.ts` | ~11K | `MiraWebsocketServer`：基于 `ws`，`libraryClients` 按 `libraryId` 分组管理连接、query 鉴权、`WebSocketRouter` 分发；定义 `ConnectedClient` / `WSUserInfo`。 |
| `src/LibraryStorage.ts` | ~11K | 多素材库加载/卸载/启用/禁用，读取 `data/librarys.json`。 |
| `src/LibraryWatcher.ts` | ~11K | chokidar 监视库目录变更。 |
| `src/ServerPluginManager.ts` | 576 行 | **双协议插件管理器**(per-library):协议 A `extends ServerPlugin`(HTTP Hook / 路由 / cleanup)、协议 B `registerFileFormat(ServerFileFormatHandler)`(联动 ThumbnailService + MetadataService + Web viewer iframe 解析);含生命周期(load/unload/reload/addPlugin)、Web plugin manifest 校验、插件列表元数据。详见 [plugin-system.md](plugin-system.md)。定义 `PluginConfig`、`HttpHookDefinition`、`HttpHookContext`、`ServerFileFormatHandler`、`ServerPreviewViewerDefinition`、`ResolvedPreviewViewer`。 |
| `src/ServerPlugin.ts` | ~4K | 协议 A 插件基类 `ServerPlugin`(配置读写、路由注册)、`PluginRouteDefinition`。 |
| `src/UserStorage.ts` | ~15K | 用户管理、认证、会话（SQLite `users.db`）。 |
| `src/SettingsManager.ts` | ~52 行 | 全局设置：`ServerSettings`（`authRequired`、`allowRegistration`、`dashboardPort`）读写 `data/settings.json`，含默认值合并。 |
| `src/types.ts` | ~32 行 | 共享类型：`User`、`Session`、`WebSocketMessage`。 |
| `src/index.ts` | ~69 行 | 模块入口：加载 `.env`、`startServer()`、导出核心类与类型；`require.main === module` 时自启。 |
| `src/server.ts` | ~8 行 | re-export 桥（`MiraServer`、`ServerConfig`、`MiraHttpServer`、`MiraWebsocketServer`、`startServer`）。注意：`HttpServer.ts` 内部类名为 `MiraHttpServer`，与 `MiraServer.ts` 中 `import { MiraHttpServer } from "./HttpServer"` 一致。 |
| `src/cli.ts` | ~93 行 | `commander` CLI：`start` / `version` / `health` 子命令。 |

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
| `FsRouter.ts` | 13K | 文件系统操作。 |
| `ThumbRouter.ts` | 2.9K | 缩略图管理。 |
| `StatisticsRouter.ts` | 8.4K | 统计。 |
| `SettingsRouter.ts` | 1.9K | 服务端设置。 |
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

## 插件目录 (`src/plugins/`)

- `plugins.json` — 插件注册清单。
- `package.json` / `package-lock.json` / `node_modules/` — 插件依赖（npm 安装）。
- `mira_thumb/`、`mira_user/` — 内置示例插件目录（含 `data/`）。
- 当前 `plugins.json` 启用项：`mira_duplicate_scanner`、`mira_eagle_extension`（path 指向 `node_modules/...`）；`mira_demo`、`mira_n8n`、`mira_thumb_imagemagick` 为 disabled。

> 注：`src/plugins/node_modules` 体量巨大，未纳入扫描。
