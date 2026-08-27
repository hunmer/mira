# mira-app-server

## 项目简单介绍

`mira-app-server` 是 pnpm monorepo 中的独立服务端包（`name=mira-app-server`, `version=3.0.1`），基于 `mira-app-core` 提供完整的 Mira 后端服务。它以 Express 提供 REST API，以 `ws`（及 `socket.io`）提供 WebSocket 实时通信（v3.0 起支持**设备间二进制帧端到端转发**），使用 `sqlite3` 持久化用户与库元数据，通过 `chokidar` 监视素材库目录、`fluent-ffmpeg` 生成缩略图、`multer` 处理上传（支持 copy/move/link 三种导入模式）、`commander` 提供 CLI（含完整 SDK 操作子命令与 MCP 服务模式）。

服务由 `MiraServer` 顶层编排：启动时初始化 `SettingsManager`、`ThumbnailService`、`MiraHttpServer`、`MiraWebsocketServer`，再加载 `LibraryStorage`（多 SQLite 素材库）与 `ServerPluginManager`（服务端插件 + HTTP Hook）。HTTP 默认端口 8081，WebSocket 默认 8018。

发布形态：`pnpm run build` 现为 `copy-dashboard + copy-plugin-ui + copy-web + tsc` 四段（`scripts/copy-*.mjs` 拷贝 dashboard、mira-plugin-ui 与前端静态资源进产物）；npm 包 `files` 含 `public/**/*`（pair.html 配对页、vendor 免构建依赖、SDK ESM bundle）。

## 约定的规则

- 构建：`pnpm run build`（=`copy-dashboard` + `copy-plugin-ui` + `copy-web` + `tsc`），开发：`pnpm run dev`（ts-node + `--inspect`）。
- 测试：`pnpm test` = `jest --config sdk/jest.config.js`（注意配置文件在 `sdk/` 下）；另有 `pnpm run test:paths`（node --test 跑 `src/sync/` 下测试）与 `src/services/DuplicateScanner.test.ts` 等 vitest/jest 单测。
- 入口运行：`pnpm run start` = `node dist/index.js`；CLI 入口 `dist/cli.js`（bin = `mira-app-server`），顶层命令 `start` / `stop` / `restart` / `version` / `health`，另有 11 个域子命令（auth/user/libraries/files/tags/folders/plugins/devices/database/system/autostart）与 `doctor`；`--mcp` 参数进入 MCP 服务模式（stdio JSON-RPC，把 SDK 能力暴露为 MCP tools）。
- 路由统一继承 `routes/BaseRouter.ts`，返回 `{ code, message, data }` 形式的 `ApiResponse`。
- WebSocket 消息结构：`{ action, requestId, libraryId, clientId, payload: { type, data } }`，按 `libraryId` 分组管理连接，在 `routes/WebSocketRouter.ts` 中分发到 `handlers/` 下 Handler；二进制帧（`0x4D` 魔数 + 目标 clientId）按 clientId 端到端转发。
- 权限：`middleware/permission.ts` 基于角色 `super` / `admin` / `user`，区分公开路由（含 `/devices/share/` 分享票据下载）、库级 `allowedRoles` 校验。
- 插件：`ServerPlugin` 基类 + `plugins/plugins.json` 注册；可通过 `pluginManager.registerHttpHook({ method, path, handler })` 拦截 HTTP。
- 环境变量（见 `.env.example`）：`HTTP_PORT=8081` / `WS_PORT=8018` / `DATA_PATH=./data` / `INITIAL_ADMIN_*` / `SESSION_LIFETIME` / `NODE_ENV`；`MIRA_SERVER_HTTP_PORT`、`MIRA_SERVER_WS_PORT` 优先级更高。
- 运行时数据写入 `data/`：`librarys.json`（库清单）、`settings.json`（含 v3.0 `pluginSources` 插件商店源）、`users.db`（SQLite）。
- 上传/导入：`POST /api/files/upload` 按库 `customFields.importType` 走 copy/move/link（`docs/library-import-modes.md`）；跨库导入（Eagle/Billfish）走 `POST /api/libraries/import` 异步任务（`LibraryImportService`）。

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

- **扫描日期**: 2026-08-25(增量,上次 2026-08-23;基线 2d1710c1 以来 31 个 src 文件变更)
- **包版本**: 3.0.1(2.0.9 → 3.0.0 → 3.0.1;`src/cli.ts` 从 package.json 动态读取版本)
- **本次增量确认**(v3.0 主线):
  - **路由仍 19 个模块**,新增端点:DeviceRoutes 分享票据(`POST /api/devices/share-tickets`、`GET /api/devices/share/:ticketId` 免认证,TTL 30 分钟/20 次,archiver ZIP 打包);LibraryRoutes 跨库导入(`POST /api/libraries/import`、`GET .../import/:importId`、`POST .../cancel`);UserRouter 用户文件(`GET|PUT /api/user/files`,防路径穿越);PluginRoutes `GET /api/plugins/store` 商店代理;SettingsRouter `pluginSources`/`pluginSourceActive`;FsRouter duplicates `matchMode`、下载支持 `ids`;FileRoutes 上传 importType/sourcePath/watcher 防重
  - **新服务 `LibraryImportService`**(484 行,Eagle/Billfish 导入:复制素材/文件夹/标签,异步进度/取消,缩略图复制)
  - ThumbnailService 重构为数据层钩子(`onFileImported/onFileDeleted`,`.gen` 临时文件,防覆盖导入缩略图);MetadataService exif 合并写入;DuplicateScanner matchMode + 回收过滤
  - WebSocketServer 二进制帧端到端转发;permission 公开前缀 `/devices/share/`
  - **public/ 新增**:`pair.html`(914 行设备配对静态页)、`vendor/`(vue.global/mira-plugin-ui.umd/jszip)、`sdk/mira-sdk.esm.mjs`;`scripts/copy-plugin-ui.mjs` 新增
  - 依赖 +jszip(供静态页);`files` 含 `public/**/*`;Dockerfile 补 vue-selection-box/grid-layout-plus 构建
- **未扫描/未发现**: `src/cli/commands/` 各命令实现细节、`src/mcp/tools/` 各工具、`sdk/` 目录、`API_REFERENCE.md` / `README.md`
- **下一步建议**: `claude/public-interfaces.md` 端点清单未随本次新增端点逐条重写,下次深扫补全
