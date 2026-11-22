# mira-app-server

## 项目简单介绍

`mira-app-server` 是 pnpm monorepo 中的独立服务端包（`name=mira-app-server`, `version=3.0.2`），基于 `mira-app-core` 提供完整的 Mira 后端服务。它以 Express 提供 REST API，以 `ws`（及 `socket.io`）提供 WebSocket 实时通信（v3.0 起支持**设备间二进制帧端到端转发**），使用 `sqlite3` 持久化用户与库元数据，通过 `chokidar` 监视素材库目录、`fluent-ffmpeg` 生成缩略图、`multer` 处理上传（支持 copy/move/link 三种导入模式）、`commander` 提供 CLI（含完整 SDK 操作子命令与 MCP 服务模式）。

服务由 `MiraServer` 顶层编排：启动时初始化 `SettingsManager`、`ThumbnailService`、`MiraHttpServer`、`MiraWebsocketServer`，再加载 `LibraryStorage`（多 SQLite 素材库）与 `ServerPluginManager`（服务端插件 + HTTP Hook）。HTTP 默认端口 8081，WebSocket 默认 8018。

发布形态：`pnpm run build` = `copy-dashboard + copy-web + tsc` 三段（`scripts/copy-*.mjs` 拷贝 dashboard 与前端静态资源进产物；`build:plugin-ui` 为独立脚本）；npm 包 `files` = `dist/web/public/README`。注意：`sdk/` 目录已不存在（git 全历史未跟踪过，系当时本地未跟踪目录），`test`/`test:integration`/`build:sdk`/`sdk:example` 等引用 `sdk/` 的脚本当前失效，实际可跑的是 `test:paths`。

## 约定的规则

- 构建：`pnpm run build`（=`copy-dashboard` + `copy-web` + `tsc`；`build:plugin-ui` 独立），开发：`pnpm run dev`（ts-node + `--inspect`）。
- 测试：`pnpm run test:paths`（node --test 跑 `src/sync/` 2 个测试 + `FileAssociationResolver`/`UploadImportMode`/`ThumbnailService`/`MetadataService` 共 6 个测试）；`pnpm test` 等 jest 脚本引用已不存在的 `sdk/jest.config.js`，当前失效（另有 `tests/MetadataService.test.ts` 等 jest 单测无法经 `pnpm test` 跑）。
- 入口运行：`pnpm run start` = `node dist/index.js`；CLI 入口 `dist/cli.js`（bin = `mira-app-server`），顶层命令 `start` / `stop` / `restart` / `version` / `health`，另有 11 个域子命令（auth/user/libraries/files/tags/folders/plugins/devices/database/system/autostart）与 `doctor`；`--mcp` 参数进入 MCP 服务模式（stdio JSON-RPC，把 SDK 能力暴露为 MCP tools）。
- 路由统一继承 `routes/BaseRouter.ts`，返回 `{ code, message, data }` 形式的 `ApiResponse`。
- WebSocket 消息结构：`{ action, requestId, libraryId, clientId, payload: { type, data } }`，按 `libraryId` 分组管理连接，在 `routes/WebSocketRouter.ts` 中分发到 `handlers/` 下 Handler；二进制帧（`0x4D` 魔数 + 目标 clientId）按 clientId 端到端转发。
- 权限：`middleware/permission.ts` 基于角色 `super` / `admin` / `user`，区分公开路由（含 `/devices/share/` 分享票据下载）、库级 `allowedRoles` 校验。
- 插件：`ServerPlugin` 基类 + `plugins/plugins.json` 注册；可通过 `pluginManager.registerHttpHook({ method, path, handler })` 拦截 HTTP。
- 环境变量（见 `.env.example`）：`HTTP_PORT=8081` / `WS_PORT=8018` / `DATA_PATH=./data` / `INITIAL_ADMIN_*` / `SESSION_LIFETIME` / `NODE_ENV`；`MIRA_SERVER_HTTP_PORT`、`MIRA_SERVER_WS_PORT` 优先级更高。
- 运行时数据写入 `data/`：`librarys.json`（库清单）、`settings.json`（含 v3.0 `pluginSources` 插件商店源）、`users.db`（SQLite）。
- 上传/导入：`POST /api/files/upload` 按库 `customFields.importType` 走 copy/move/link（`docs/library-import-modes.md`）；本机路径导入 `POST /api/files/import-path`（仅 loopback）；跨库导入（Eagle/Billfish）走 `POST /api/libraries/import` 异步任务（`LibraryImportService`）。
- 素材库物理迁移（v3.0.2）：`POST /api/libraries/:id/relocate`（202 返回 relocationId）+ `GET /api/libraries/:id/relocate/:relocationId`（字节级进度），由 `LibraryRelocationService` 停库→复制→改写 `data/librarys.json` 的 path→删源目录→重启；`PUT /api/libraries/:id` 仍只重连 DB 不搬文件。
- 标签/文件夹关联（v3.0.2）：`FileRoutes /update`、`TagRouter /file/set(-batch)`、`FolderRouter /file/set`、`DownloadRoutes` 统一经 `resolveTagIds`/`resolveFolderId`（`routes/FileAssociationResolver.ts`）按名称或 ID 关联，名称不存在则创建；回收站内文件一律 `409 'Cannot update a recycled file'`。

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

- **扫描日期**: 2026-11-21(增量,上次 2026-08-25;基线 bc638a73 以来 23 个 src/插件清单文件变更,提交信息全为 "fix",经 diff 取证)
- **包版本**: 3.0.2(3.0.1 → 3.0.2;`src/cli.ts` 从 package.json 动态读取版本)
- **本次增量确认**(v3.0.2,均以 diff 为证):
  - **路由仍 19 个模块**(src/routes/ 21 个 .ts = 19 Router + 2 个非路由辅助模块),新增 5 个端点:素材库迁移 `POST /api/libraries/:id/relocate` + `GET .../:relocationId`(新服务 `LibraryRelocationService.ts` 221 行:停库→流式复制→persistConfig 改写 librarys.json→删源目录→重启,字节级进度/防并发/失败回滚);本机导入 `POST /api/files/import-path`(仅 loopback,新 `routes/UploadImportMode.ts` 决定用源文件还是临时副本);重名检查 `POST /api/files/checkDuplicates`(core `checkDuplicateNames` 分块 500);标签批量 `POST /api/tags/file/set-batch`(逐文件 404/409 计入 results)
  - **回收站只读**:FileRoutes `/rename` `/update`、TagRouter `/file/set`(+batch)、FolderRouter `/file/set` 对 `recycled=1` 统一 409 `'Cannot update a recycled file'`
  - **名称/ID 关联**:新 `routes/FileAssociationResolver.ts`(`resolveTagIds`/`resolveFolderId`,名称无则创建),接入 FileRoutes/Tag/Folder/Download 四处;MCP tools folders(folderId)/tags(tags) 参数同样接受名称或 ID
  - **copy 模式 path=NULL 适配**:MetadataService/ThumbnailService 不再依赖 `file.path`,改 `getItemFilePath({isUrlFile:false})`;FolderOperations 移回收站同理
  - LibraryRoutes:新导出 `resolveLibraryPath()`(创建库路径规范化为以库名结尾);stats 查询改 `folders` 表 / `files.tags` json_each / `getFileTypeStatistics()`
  - LibraryWatcher:unlink 确认删除后先 DB 删除成功再广播 `file::deleted`
  - **运行时插件注册表 `src/plugins/plugins.json` 11 → 15 条**(+mira_html_format/mira_font_format/mira_office_viewer/mira_semantic_search;全量重写含 meta);`src/plugins/package.json` +3 个 link 依赖
  - 依赖无新增;.env 的 EXIFTOOL_PATH 硬编码改注释占位;新测试 8 个(routes 4 + services 4),test:paths 扩至 6 文件
- **未扫描/未发现**: `src/cli/commands/` 各命令实现细节、`src/mcp/tools/` 其余工具、`API_REFERENCE.md` / `README.md`。另核实：`sdk/` 目录在 git 全历史均未跟踪、工作区现已不存在（08-25 文档所记 sdk/ 相关内容系当时未跟踪的本地目录）
- **下一步建议**: `claude/public-interfaces.md` 已补 v3.0.2 端点摘要但完整逐条清单仍未生成,下次深扫补全
