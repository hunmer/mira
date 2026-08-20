# mira-app-server

## 项目简单介绍

`mira-app-server` 是 pnpm monorepo 中的独立服务端包（`name=mira-app-server`, `version=2.0.9`），基于 `mira-app-core` 提供完整的 Mira 后端服务。它以 Express 提供 REST API，以 `ws`（及 `socket.io`）提供 WebSocket 实时通信，使用 `sqlite3` 持久化用户与库元数据，通过 `chokidar` 监视素材库目录、`fluent-ffmpeg` 生成缩略图、`multer` 处理上传、`commander` 提供 CLI（含完整 SDK 操作子命令与 MCP 服务模式）。

服务由 `MiraServer` 顶层编排：启动时初始化 `SettingsManager`、`ThumbnailService`、`MiraHttpServer`、`MiraWebsocketServer`，再加载 `LibraryStorage`（多 SQLite 素材库）与 `ServerPluginManager`（服务端插件 + HTTP Hook）。HTTP 默认端口 8081，WebSocket 默认 8018。

发布形态：`pnpm run build` 现为 `copy-dashboard + copy-web + tsc` 三段（`scripts/copy-dashboard.mjs` / `scripts/copy-web.mjs` 拷贝前端静态资源进产物）；CI 会将 server 依赖打进 Electron 发行版。

## 约定的规则

- 构建：`pnpm run build`（=`copy-dashboard` + `copy-web` + `tsc`），开发：`pnpm run dev`（ts-node + `--inspect`）。
- 测试：`pnpm test` = `jest --config sdk/jest.config.js`（注意配置文件在 `sdk/` 下）；另有 `pnpm run test:paths`（node --test 跑 `src/sync/` 下测试）。
- 入口运行：`pnpm run start` = `node dist/index.js`；CLI 入口 `dist/cli.js`（bin = `mira-app-server`），顶层命令 `start` / `stop` / `restart` / `version` / `health`，另有 11 个域子命令（auth/user/libraries/files/tags/folders/plugins/devices/database/system/autostart）与 `doctor`；`--mcp` 参数进入 MCP 服务模式（stdio JSON-RPC，把 SDK 能力暴露为 MCP tools）。
- 路由统一继承 `routes/BaseRouter.ts`，返回 `{ code, message, data }` 形式的 `ApiResponse`。
- WebSocket 消息结构：`{ action, requestId, libraryId, clientId, payload: { type, data } }`，按 `libraryId` 分组管理连接，在 `routes/WebSocketRouter.ts` 中分发到 `handlers/` 下 Handler。
- 权限：`middleware/permission.ts` 基于角色 `super` / `admin` / `user`，区分公开路由、库级 `allowedRoles` 校验。
- 插件：`ServerPlugin` 基类 + `plugins/plugins.json` 注册；可通过 `pluginManager.registerHttpHook({ method, path, handler })` 拦截 HTTP。
- 环境变量（见 `.env.example`）：`HTTP_PORT=8081` / `WS_PORT=8018` / `DATA_PATH=./data` / `INITIAL_ADMIN_*` / `SESSION_LIFETIME` / `NODE_ENV`；`MIRA_SERVER_HTTP_PORT`、`MIRA_SERVER_WS_PORT` 优先级更高。
- 运行时数据写入 `data/`：`librarys.json`（库清单）、`settings.json`、`users.db`（SQLite）。

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、职责、构建命令、依赖 |
| [claude/conventions.md](claude/conventions.md) | 命名/路由/权限/插件/配置约定 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 各模块/文件职责分解 |
| [claude/plugin-system.md](claude/plugin-system.md) | **插件双协议调度详解**(ServerPlugin / registerFileFormat) |
| [claude/entrypoints.md](claude/entrypoints.md) | 入口与启动流程（index / cli / MiraServer） |
| [claude/public-interfaces.md](claude/public-interfaces.md) | HTTP / WebSocket 公开接口 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖、环境变量、配置文件 |
| [claude/data-model.md](claude/data-model.md) | SQLite/JSON 数据模型 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | Jest 测试与质量配置 |
| [claude/file-map.md](claude/file-map.md) | 全部源文件清单 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 |

## 扫描状态

- **扫描日期**: 2026-08-20(增量,上次 2026-08-11)
- **包版本**: 2.0.9(`package.json`);`src/cli.ts` 现从 package.json 动态读取版本(`getPackageVersion()`),旧的内嵌版本号(1.0.17/v1.0.0)问题已解决。
- **本次增量确认**: 路由 17 → 19 个文件(新增 `CookieSitesRouter.ts` `/api/cookie-sites`、`DownloadRoutes.ts` `/api/download`);CLI 重构为完整 SDK 操作工具(`src/cli/` + `src/cli/commands/` 11 个域命令 + doctor/autostart + 凭证多 profile `~/.mira/credentials.json`);新增 `src/mcp/` MCP 服务(`@modelcontextprotocol/sdk`,stdio);新增 `src/sync/` 目录;`src/services/` 扩至 8 文件(+DatabaseBackupService/DownloadExecutorService/DuplicateScanner/LogRingBuffer/MetadataService/procm);构建改为 `copy-dashboard + copy-web + tsc`(`scripts/` 新增两个拷贝脚本);CI 将 server 依赖打入 Electron 发行版。
- **扫描范围**: `package.json`、`src/` 目录结构、`src/routes/` 挂载清单(`HttpServer.ts`)、`src/cli.ts` 头部与命令注册、`src/mcp/server.ts` 头部、git log(2026-08-11 起)。
- **未扫描/未发现**: `src/cli/commands/` 各命令实现细节、`src/mcp/tools/` 各工具、`src/sync/` 实现体、`sdk/` 目录、`API_REFERENCE.md` / `Dockerfile*` / `README.md`。
