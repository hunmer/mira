# overview

`mira-app-server` 是 pnpm monorepo 的服务端包（`name=mira-app-server`, `version=3.0.2`, `description: "Mira Server - standalone server application using mira-app-core"`），独立可运行，依赖同仓 `mira-app-core`（`workspace:*`）。

## 模块职责

提供完整的 Mira 后端能力：

1. **HTTP REST API** — 基于 Express，路由位于 `src/routes/`（21 个 .ts = 19 个 Router（含 `BaseRouter`、`WebSocketRouter`）+ 2 个非路由辅助模块；2026-08 新增 `CookieSitesRouter`、`DownloadRoutes`，2026-11 新增辅助 `FileAssociationResolver`、`UploadImportMode`）。
2. **WebSocket 实时通信** — 基于 `ws`，按素材库分组管理连接，`handlers/` 下分发（6 个 Handler）。
3. **多素材库管理** — `LibraryStorage` 动态加载/卸载多个 SQLite 素材库，元数据集中在 `data/librarys.json`。
4. **插件系统** — `ServerPluginManager` + `ServerPlugin` 基类，支持 HTTP Hook 拦截，配置见 `src/plugins/plugins.json`。
5. **CLI 工具** — `commander`，bin = `mira-app-server`：顶层 `start` / `stop` / `restart` / `version` / `health` + 11 个域子命令（auth/user/libraries/files/tags/folders/plugins/devices/database/system/autostart）+ `doctor`；凭证多 profile 存 `~/.mira/credentials.json`。
6. **MCP 服务** — `src/mcp/`，`--mcp` 启动 stdio JSON-RPC 服务，把 `mira-app-core/shared/sdk` 全部能力暴露为 MCP tools（基于 `@modelcontextprotocol/sdk`）。
7. **用户认证** — `UserStorage` + SQLite（`data/users.db`），角色 `super/admin/user`。
8. **库文件监视** — `LibraryWatcher`（chokidar）+ `src/sync/`（FilePathSet / ImportedFileEvents / SyncFilter，同步过滤）。
9. **缩略图服务** — `services/ThumbnailService`，内置 Image/Video Generator，可注册扩展；另有 `MetadataService`（元数据规则）。
10. **下载/备份/查重/导入/迁移等后台服务** — `services/DownloadExecutorService`、`DatabaseBackupService`、`DuplicateScanner`、`LibraryImportService`（Eagle/Billfish 跨库导入）、`LibraryRelocationService`（素材库物理迁移，2026-11 新增）、`LogRingBuffer`、`procm`。
11. **设置管理** — `SettingsManager`，`data/settings.json`。

## 入口与启动

- 入口模块：`src/index.ts`（`main = dist/index.js`），导出核心类并在直接运行时调用 `startServer()`。
- CLI：`src/cli.ts`（`bin.mira-app-server = dist/cli.js`）。
- 顶层编排：`src/MiraServer.ts`，`MiraServer.createAndStart(config)` 一键启动。
- 另有 `src/server.ts` 作为 re-export 桥（`MiraServer`、`MiraHttpServer`、`MiraWebsocketServer`、`startServer`）。

## 构建命令

| 命令 | 实际执行 | 用途 |
|------|----------|------|
| `pnpm run build` | `pnpm run build:dashboard && pnpm run build:web && tsc` | 拷贝前端静态资源 + 编译到 `dist/` |
| `pnpm run build:dashboard` | `node scripts/copy-dashboard.mjs` | 拷贝 dashboard 静态资源 |
| `pnpm run build:web` | `node scripts/copy-web.mjs` | 拷贝 web 静态资源 |
| `pnpm run build:plugin-ui` | `node scripts/copy-plugin-ui.mjs` | 拷贝 mira-plugin-ui（独立脚本，不在 build 链中） |
| `pnpm run rebuild` | `pnpm run build` | 别名 |
| `pnpm run start` | `node dist/index.js` | 生产启动 |
| `pnpm run dev` / `start:ts` | `node --inspect -r ts-node/register src/index.ts` | 开发模式 |
| `pnpm run cli` / `cli:start` / `cli:health` / `cli:version` | `ts-node src/cli.ts [...]` | CLI 调试 |
| `pnpm test` | `jest --config sdk/jest.config.js` | ⚠️ 失效：`sdk/` 目录已不存在（git 未跟踪过） |
| `pnpm run test:watch` | `jest --config sdk/jest.config.js --watch` | ⚠️ 失效（同上） |
| `pnpm run test:coverage` | `jest --config sdk/jest.config.js --coverage` | ⚠️ 失效（同上） |
| `pnpm run test:integration` | `node sdk/scripts/test-and-fix.js` | ⚠️ 失效（同上） |
| `pnpm run test:paths` | `node --test` 跑 6 个测试文件 | `src/sync/` 2 个 + FileAssociationResolver / UploadImportMode / ThumbnailService / MetadataService |
| `pnpm run build:sdk` | `tsc --project sdk/tsconfig.json` | ⚠️ 失效：`sdk/` 目录已不存在 |
| `pnpm run sdk:example` | `ts-node sdk/examples/usage-examples.ts` | ⚠️ 失效（同上） |
| `pnpm prepublish` / `prepack` | `npm run build` | 发布前编译 |

## 关键依赖

| 依赖 | 用途 |
|------|------|
| express | HTTP 服务器与路由 |
| ws / socket.io | WebSocket（主用 ws，socket.io 兼容） |
| sqlite3 | 用户库 (`users.db`) 与各素材库 SQLite |
| commander | CLI 框架 |
| multer | 文件上传 |
| chokidar | 库目录文件监视 |
| fluent-ffmpeg | 视频/媒体缩略图 |
| yauzl | ZIP 解压（导入） |
| cors | 跨域 |
| dotenv | 环境变量加载 |
| axios | CLI health 检查 / 内部请求 |
| fast-glob | 文件匹配 |
| which / queue / p-queue | 可执行查找 / 任务队列 |
| @modelcontextprotocol/sdk | MCP 服务（`--mcp` 模式，stdio JSON-RPC） |
| archiver | 打包/压缩（数据库备份导出等） |
| zod | MCP tools 参数校验 |
| mira-app-core | 复用核心类型与存储（`workspace:*`） |

devDependencies 主要为 `@types/*`、`jest` + `ts-jest`、`ts-node`、`typescript ^5.3.3`。

> `package.json` 的 `keywords: ["mira", "server"]`，`author: hunmer`，`license: ISC`，`publishConfig.access: public`。
