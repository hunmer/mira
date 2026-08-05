# overview

`mira-app-server` 是 pnpm monorepo 的服务端包（`name=mira-app-server`, `version=2.0.1`, `description: "Mira Server - standalone server application using mira-app-core"`），独立可运行，依赖同仓 `mira-app-core`（`workspace:*`）。

## 模块职责

提供完整的 Mira 后端能力：

1. **HTTP REST API** — 基于 Express，路由位于 `src/routes/`（17 个 .ts，含 `BaseRouter` 与 `WebSocketRouter`）。
2. **WebSocket 实时通信** — 基于 `ws`，按素材库分组管理连接，`handlers/` 下分发（6 个 Handler）。
3. **多素材库管理** — `LibraryStorage` 动态加载/卸载多个 SQLite 素材库，元数据集中在 `data/librarys.json`。
4. **插件系统** — `ServerPluginManager` + `ServerPlugin` 基类，支持 HTTP Hook 拦截，配置见 `src/plugins/plugins.json`。
5. **CLI 工具** — `commander`，bin = `mira-app-server`，子命令 `start` / `version` / `health`。
6. **用户认证** — `UserStorage` + SQLite（`data/users.db`），角色 `super/admin/user`。
7. **库文件监视** — `LibraryWatcher`（chokidar）。
8. **缩略图服务** — `services/ThumbnailService`，内置 Image/Video Generator，可注册扩展。
9. **设置管理** — `SettingsManager`，`data/settings.json`。

## 入口与启动

- 入口模块：`src/index.ts`（`main = dist/index.js`），导出核心类并在直接运行时调用 `startServer()`。
- CLI：`src/cli.ts`（`bin.mira-app-server = dist/cli.js`）。
- 顶层编排：`src/MiraServer.ts`，`MiraServer.createAndStart(config)` 一键启动。
- 另有 `src/server.ts` 作为 re-export 桥（`MiraServer`、`MiraHttpServer`、`MiraWebsocketServer`、`startServer`）。

## 构建命令

| 命令 | 实际执行 | 用途 |
|------|----------|------|
| `pnpm run build` | `tsc` | 编译到 `dist/` |
| `pnpm run rebuild` | `pnpm run build` | 别名 |
| `pnpm run start` | `node dist/index.js` | 生产启动 |
| `pnpm run dev` / `start:ts` | `node --inspect -r ts-node/register src/index.ts` | 开发模式 |
| `pnpm run cli` / `cli:start` / `cli:health` / `cli:version` | `ts-node src/cli.ts [...]` | CLI 调试 |
| `pnpm test` | `jest --config sdk/jest.config.js` | 单元测试 |
| `pnpm run test:watch` | `jest --config sdk/jest.config.js --watch` | 监视测试 |
| `pnpm run test:coverage` | `jest --config sdk/jest.config.js --coverage` | 覆盖率 |
| `pnpm run test:integration` | `node sdk/scripts/test-and-fix.js` | 集成测试 |
| `pnpm run build:sdk` | `tsc --project sdk/tsconfig.json` | 构建 SDK |
| `pnpm run sdk:example` | `ts-node sdk/examples/usage-examples.ts` | 运行 SDK 示例 |
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
| which / queue | 可执行查找 / 任务队列 |
| mira-app-core | 复用核心类型与存储（`workspace:*`） |

devDependencies 主要为 `@types/*`、`jest` + `ts-jest`、`ts-node`、`typescript ^5.3.3`。

> `package.json` 的 `keywords: ["mira", "server"]`，`author: hunmer`，`license: ISC`，`publishConfig.access: public`。
