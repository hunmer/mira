# file-map

`src/` 全部源文件清单（基于目录扫描；行数/大小为近似）。

## 顶层 (`src/`)

| 文件 | 大小 | 说明 |
|------|------|------|
| `src/index.ts` | 2.4K | 模块入口，`startServer()` + 导出 |
| `src/server.ts` | 280B | re-export 桥 |
| `src/cli.ts` | 2.8K | commander CLI |
| `src/MiraServer.ts` | 3.5K | 顶层编排类 |
| `src/HttpServer.ts` | 15K | Express HTTP 服务器 |
| `src/WebSocketServer.ts` | 11K | WebSocket 服务器 |
| `src/LibraryStorage.ts` | 11K | 多素材库管理 |
| `src/LibraryWatcher.ts` | 11K | chokidar 文件监视 |
| `src/ServerPluginManager.ts` | 12K | 插件管理 + HTTP Hook |
| `src/ServerPlugin.ts` | 4.1K | 插件基类 |
| `src/UserStorage.ts` | 15K | 用户/会话存储 |
| `src/SettingsManager.ts` | 1.5K | 全局设置 |
| `src/types.ts` | 657B | 共享类型 |

## 路由 (`src/routes/`)

| 文件 | 大小 | 说明 |
|------|------|------|
| `BaseRouter.ts` | 7.2K | 路由基类 + `ApiResponse` |
| `AuthRouter.ts` | 13K | `/api/auth` |
| `AdminsRouter.ts` | 7.7K | `/api/admins` |
| `UserRouter.ts` | 10K | `/api/user` |
| `LibraryRoutes.ts` | 29K | `/api/libraries` |
| `PluginRoutes.ts` | 43K | `/api/plugins` |
| `DatabaseRoutes.ts` | 5.2K | `/api/database` |
| `FileRoutes.ts` | 38K | `/api/files` |
| `DeviceRoutes.ts` | 17K | `/api/devices` |
| `TagRouter.ts` | 5.9K | `/api/tags` |
| `FolderRouter.ts` | 6.3K | `/api/folders` |
| `FsRouter.ts` | 13K | `/api/fs` |
| `ThumbRouter.ts` | 2.9K | `/api/thumb` |
| `StatisticsRouter.ts` | 8.4K | `/api/statistics` |
| `SettingsRouter.ts` | 1.9K | `/api/settings` |
| `HttpRouter.ts` | 8.4K | `/plugins/:libraryId/:pluginName/*` |
| `WebSocketRouter.ts` | 1.5K | WebSocket 消息分发 |

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
