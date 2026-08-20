# entrypoints

入口与启动流程（基于 `package.json`、`src/index.ts`、`src/cli.ts`、`src/MiraServer.ts`）。

## package.json 声明

- `main`: `dist/index.js`
- `types`: `dist/index.d.ts`
- `bin.mira-app-server`: `dist/cli.js`
- 直接运行入口：`pnpm run start` → `node dist/index.js`；开发 `pnpm run dev` → ts-node。

## src/index.ts（主入口）

1. `dotenv.config({ path: path.join(__dirname, '../../../.env') })` — 先加载仓库根 `.env`。
2. `dotenv.config()` — 再加载当前目录 `.env`（覆盖前者）。
3. `startServer()`：
   - 读取端口：`MIRA_SERVER_HTTP_PORT || HTTP_PORT || '8081'`、`MIRA_SERVER_WS_PORT || WS_PORT || '8018'`、`DATA_PATH || './data'`。
   - 调用 `MiraServer.createAndStart({ httpPort, wsPort, dataPath })`。
   - 注册 `SIGINT` / `SIGTERM` 优雅关闭（`server.stop()` 后 `process.exit(0)`）。
   - 失败时 `process.exit(1)`。
4. 导出：`MiraServer`、`startServer`、`ServerPluginManager`、`ServerPlugin`、`MiraWebsocketServer`、`MiraHttpServer`、`ThumbnailService`、`express`、`ws`；类型导出 `ThumbnailGenerator`、`PluginRouteDefinition`、`ILibraryServerData`。
5. `if (require.main === module) startServer()` — 直接运行才启动。

## src/cli.ts（CLI 入口，383 行）

`commander` 程序 `mira-app-server`，版本号从 `package.json` 动态读取（`getPackageVersion()`，旧的内嵌版本号问题已解决）。

**MCP 模式短路**：命令行含 `--mcp` 时跳过 commander，直接 `startMcpServer()`（stdio JSON-RPC，见 `src/mcp/server.ts`），保证 stdout 仅承载协议数据。

**顶层命令**：

- `start` — 选项 `-p/--http-port`(8081)、`-w/--ws-port`(8018)、`-d/--data-path`、`--env <path>`；调用 `MiraServer.createAndStart(...)`；注册 `SIGINT` / `SIGTERM`。
- `stop` / `restart` — 服务进程管理（配合 `src/cli/autostart.ts`）。
- `version` — 打印版本与运行环境。
- `health` — 选项 `-p/--http-port`(8081)，`axios.get('http://localhost:${port}/health')`。
- `doctor` — 诊断命令（`src/cli/doctor.ts`）。

**域子命令**（`src/cli/commands/`，共 11 个，通过 `mira-app-core/shared/sdk` 操作远端服务）：`auth`、`user`、`libraries`、`files`、`tags`、`folders`、`plugins`、`devices`、`database`、`system`、`autostart`。登录凭证多 profile 持久化到 `~/.mira/credentials.json`（`src/cli/credentials.ts`）。

- 无参数时输出 help。

## MiraServer 启动序列 (`src/MiraServer.ts`)

`MiraServer.createAndStart(config)` → `new MiraServer(config)` + `start()`：

1. 构造：合并默认 `{ httpPort:8081, wsPort:8018 }` 与传入 config；`dataPath = config.dataPath || process.env.DATA_PATH || cwd/data`。
2. `start()`：
   1. `new SettingsManager(dataPath)` + `initialize()`。
   2. `new ThumbnailService()`。
   3. `new MiraHttpServer(this, dataPath)` + `initialize()` + `start(httpPort)`。
   4. `new MiraWebsocketServer(this)` + `start(wsPort)`（独立端口，非复用 HTTP server）。
   5. `thumbnailService.setWebSocketServer(webSocketServer)` — 缩略图进度经 WS 广播。
   6. `new LibraryStorage(this)` + `loadAll()` — 异步加载所有素材库。
3. `stop()`：仅关闭 `httpServer`（`webSocketServer` 的关闭在扫描范围内未体现，未发现显式调用）。

## server.ts

re-export 桥：从 `./MiraServer`（`MiraServer`、`ServerConfig`）、`./HttpServer`（`MiraHttpServer`）、`./WebSocketServer`（`MiraWebsocketServer`）、`./index`（`startServer`）汇总导出，供路由等模块统一引用。
