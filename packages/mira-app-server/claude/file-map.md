# file-map

`src/` 全部源文件清单（基于目录扫描；行数/大小为近似）。2026-08 新增 `src/cli/`、`src/mcp/`、`src/sync/` 目录。

## 顶层 (`src/`)

| 文件 | 大小 | 说明 |
|------|------|------|
| `src/index.ts` | 2.4K | 模块入口，`startServer()` + 导出 |
| `src/server.ts` | 280B | re-export 桥 |
| `src/cli.ts` | 383 行 | commander CLI 总入口（顶层命令 + MCP 模式短路） |
| `src/MiraServer.ts` | 3.5K | 顶层编排类 |
| `src/HttpServer.ts` | 15K | Express HTTP 服务器 |
| `src/WebSocketServer.ts` | 11K | WebSocket 服务器 |
| `src/LibraryStorage.ts` | 11K | 多素材库管理 |
| `src/LibraryWatcher.ts` | 11K | chokidar 文件监视 |
| `src/ServerPluginManager.ts` | 660 行 | 插件管理 + HTTP Hook + 格式注册 |
| `src/ServerPlugin.ts` | 124 行 | 插件基类 |
| `src/UserStorage.ts` | 15K | 用户/会话存储 |
| `src/SettingsManager.ts` | 1.5K | 全局设置 |
| `src/types.ts` | 657B | 共享类型 |

## 路由 (`src/routes/`，19 个 .ts)

| 文件 | 大小 | 说明 |
|------|------|------|
| `BaseRouter.ts` | 7.2K | 路由基类 + `ApiResponse` |
| `AuthRouter.ts` | 13K | `/api/auth` |
| `AdminsRouter.ts` | 11K | `/api/admins` |
| `UserRouter.ts` | 12K | `/api/user` |
| `LibraryRoutes.ts` | 32K | `/api/libraries` |
| `PluginRoutes.ts` | 49K | `/api/plugins` |
| `DatabaseRoutes.ts` | 5.2K | `/api/database` |
| `FileRoutes.ts` | 71K | `/api/files` |
| `DeviceRoutes.ts` | 17K | `/api/devices` |
| `TagRouter.ts` | 6.2K | `/api/tags` |
| `FolderRouter.ts` | 8K | `/api/folders` |
| `FsRouter.ts` | 29K | `/api/fs` |
| `ThumbRouter.ts` | 4.4K | `/api/thumb` |
| `StatisticsRouter.ts` | 8.6K | `/api/statistics` |
| `SettingsRouter.ts` | 1.8K | `/api/settings` |
| `CookieSitesRouter.ts` | 4.9K | `/api/cookie-sites`（2026-08 新增） |
| `DownloadRoutes.ts` | 3.5K | `/api/download`（2026-08 新增） |
| `HttpRouter.ts` | 8.4K | `/plugins/:libraryId/:pluginName/*` |
| `WebSocketRouter.ts` | 1.5K | WebSocket 消息分发 |

## CLI (`src/cli/`，2026-08 新增)

| 文件 | 说明 |
|------|------|
| `client.ts` | CLI 用 SDK 客户端 / 连接解析 |
| `credentials.ts` | 凭证多 profile（`~/.mira/credentials.json`） |
| `autostart.ts` | 开机自启实现 |
| `doctor.ts` | 诊断命令 |
| `format.ts` | 输出格式化 |
| `commands/*.ts`（11 个） | auth / user / libraries / files / tags / folders / plugins / devices / database / system / autostart 域命令 |

## MCP (`src/mcp/`，2026-08 新增)

| 文件 | 说明 |
|------|------|
| `server.ts` | stdio JSON-RPC MCP 服务入口（`--mcp`） |
| `helpers.ts` | 工具注册辅助 |
| `tools/*.ts`（9 个） | auth / system / libraries / files / tags / folders / plugins / devices / database 的 MCP tools |

## 同步 (`src/sync/`，2026-08 新增)

| 文件 | 说明 |
|------|------|
| `FilePathSet.ts` + `.test.ts` | 文件路径集合 |
| `ImportedFileEvents.ts` + `.test.ts` | 已导入文件事件 |
| `SyncFilter.ts` | 同步过滤规则 |

## 处理器 (`src/handlers/`)

| 文件 | 说明 |
|------|------|
| `MessageHandler.ts` | 通用消息 |
| `FileHandler.ts` | 文件操作消息 |
| `FolderHandler.ts` | 文件夹操作消息 |
| `TagHandler.ts` | 标签操作消息 |
| `LibraryHandler.ts` | 素材库操作消息 |
| `PluginMessageHandler.ts` | 插件消息转发 |

## 中间件 (`src/middleware/`)

| 文件 | 说明 |
|------|------|
| `permission.ts` | 权限中间件 + 角色校验 |

## 服务 (`src/services/`)

| 文件 | 大小 | 说明 |
|------|------|------|
| `ThumbnailService.ts` | 11K | 缩略图服务 + Generator 注册 |
| `MetadataService.ts` | — | 元数据解析规则 |
| `DownloadExecutorService.ts` | — | 下载任务执行 |
| `DuplicateScanner.ts` + `.test.ts` | — | 重复文件扫描（内置，原插件功能） |
| `DatabaseBackupService.ts` | — | 数据库备份 |
| `LogRingBuffer.ts` | — | 环形日志缓冲 |
| `procm.ts` | — | 进程管理服务 |

## 插件 (`src/plugins/`)

| 路径 | 说明 |
|------|------|
| `plugins.json` | 插件注册清单 |
| `package.json` | 插件依赖声明 |
| `package-lock.json` | 锁文件 |
| `mira_thumb/` | 内置插件（含 `data/`） |
| `mira_user/` | 内置插件（含 `data/`） |
| `node_modules/` | 插件依赖（体量大，未纳入扫描） |

## 仓库根其他文件（包级别）

| 文件 | 说明 |
|------|------|
| `package.json` | 包元数据与脚本 |
| `tsconfig.json` | TS 配置（未读取内容） |
| `.env` / `.env.example` | 环境变量 |
| `README.md` | 包说明（未读取） |
| `API_REFERENCE.md` | API 参考（12.8K，未读取） |
| `Dockerfile` / `Dockerfile.optimized` / `docker-build.sh` / `docker-build.bat` / `.dockerignore` | 容器化（未读取） |
| `data/` | 运行时数据（`librarys.json` / `settings.json` / `users.db` / `users/` / `temp/`） |
| `dist/` | 构建产物 |
| `sdk/` | SDK 与测试目录（`jest.config.js` / `scripts/` / `examples/` / `tsconfig.json`，未读取） |
| `library_data.db` | 根目录遗留 SQLite（20K，用途未确认） |

## 未扫描

- `src/plugins/node_modules/**`、`node_modules/**`、`dist/**` —— 体量过大或为产物，跳过。
- `sdk/**` 内容 —— 未读取。
- `API_REFERENCE.md`、`README.md`、`Dockerfile*`、`tsconfig.json` 内容 —— 未读取。
