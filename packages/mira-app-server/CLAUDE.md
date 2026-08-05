# mira-app-server

## 项目简单介绍

`mira-app-server` 是 pnpm monorepo 中的独立服务端包（`name=mira-app-server`, `version=2.0.1`），基于 `mira-app-core` 提供完整的 Mira 后端服务。它以 Express 提供 REST API，以 `ws`（及 `socket.io`）提供 WebSocket 实时通信，使用 `sqlite3` 持久化用户与库元数据，通过 `chokidar` 监视素材库目录、`fluent-ffmpeg` 生成缩略图、`multer` 处理上传、`commander` 提供 CLI。

服务由 `MiraServer` 顶层编排：启动时初始化 `SettingsManager`、`ThumbnailService`、`MiraHttpServer`、`MiraWebsocketServer`，再加载 `LibraryStorage`（多 SQLite 素材库）与 `ServerPluginManager`（服务端插件 + HTTP Hook）。HTTP 默认端口 8081，WebSocket 默认 8018。

## 约定的规则

- 构建：`pnpm run build`（=`tsc`），开发：`pnpm run dev`（ts-node + `--inspect`）。
- 测试：`pnpm test` = `jest --config sdk/jest.config.js`（注意配置文件在 `sdk/` 下）。
- 入口运行：`pnpm run start` = `node dist/index.js`；CLI 入口 `dist/cli.js`（bin = `mira-app-server`），支持 `start` / `version` / `health`。
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
| [claude/entrypoints.md](claude/entrypoints.md) | 入口与启动流程（index / cli / MiraServer） |
| [claude/public-interfaces.md](claude/public-interfaces.md) | HTTP / WebSocket 公开接口 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖、环境变量、配置文件 |
| [claude/data-model.md](claude/data-model.md) | SQLite/JSON 数据模型 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | Jest 测试与质量配置 |
| [claude/file-map.md](claude/file-map.md) | 全部源文件清单 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 |

## 扫描状态

- **扫描日期**: 2026-08-05
- **包版本**: 2.0.1（`package.json`）；`src/cli.ts` 内嵌字符串仍为旧版本号（`1.0.17` / `v1.0.0`），未同步。
- **扫描范围**: `package.json`、`src/` 顶层 + `routes/` / `handlers/` / `middleware/` / `services/` 目录、`src/index.ts`、`src/MiraServer.ts`、`src/cli.ts`、`src/server.ts`、`src/HttpServer.ts`、`src/WebSocketServer.ts`、`src/middleware/permission.ts`、`src/routes/BaseRouter.ts`、`src/SettingsManager.ts`、`src/ServerPluginManager.ts`（前若干行）、`src/plugins/plugins.json`、`data/librarys.json`、`.env.example`、`tsconfig.json`（未扫描）。`src/plugins/node_modules` 与 dist 产物未纳入。
- **未扫描/未发现**: `sdk/` 目录在 `package.json` 中被引用（`sdk/jest.config.js`、`sdk/scripts/`、`sdk/examples/`、`sdk/tsconfig.json`）但当前会话未读取其内容；`API_REFERENCE.md` / `Dockerfile*` / `README.md` 未读取。
