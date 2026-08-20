# conventions

约定与代码规范（基于 `src/` 扫描归纳）。

## 命名

- 文件名：核心类用 PascalCase（`MiraServer.ts`、`HttpServer.ts`、`WebSocketServer.ts`）；路由文件 PascalCase + `Router`/`Routes` 后缀（`AuthRouter.ts`、`LibraryRoutes.ts`）；中间件、类型、入口用小写（`permission.ts`、`types.ts`、`index.ts`、`server.ts`、`cli.ts`）。
- 服务类置于 `src/services/`，PascalCase（`ThumbnailService.ts`）。
- 插件目录小写（`src/plugins/mira_thumb`、`mira_user`），插件 npm 包名形如 `mira_*`。

## 命令约定

- 构建 = `copy-dashboard + copy-web + tsc`（`pnpm run build`，前端静态资源先拷贝再编译）；测试 = `jest --config sdk/jest.config.js`（必须带 `sdk/` 前缀）；`test:paths` 用 `node --test` 跑 `src/sync/` 测试。
- `pnpm run dev` 与 `start:ts` 都用 `node --inspect -r ts-node/register src/index.ts`。
- CLI：顶层子命令 `start`（`-p/--http-port`、`-w/--ws-port`、`-d/--data-path`、`--env`）、`stop`、`restart`、`version`、`health`、`doctor`；域子命令 auth/user/libraries/files/tags/folders/plugins/devices/database/system/autostart（`src/cli/commands/`）；`--mcp` 进入 MCP 服务模式。
- CLI 凭证：多 profile，存 `~/.mira/credentials.json`。

## 路由约定

- 所有路由继承 `routes/BaseRouter.ts`，构造接收 `backend: MiraServer`；统一返回 `ApiResponse<T> = { code, message, data }`。
- 路由在 `HttpServer.ts` 中 import 并 mount（路径前缀见 `public-interfaces.md`）。
- 验证库统一走 `BaseRouter.validateLibrary(libraryId)`（返回 `{ success, library?, error? }`）。

## 权限约定

- `middleware/permission.ts` 集中维护：`PUBLIC_ROUTES`（如 `GET /health`、`POST /auth/login`、`POST /auth/register`、`GET /settings`）、`PUBLIC_PREFIXES`（如 `/user/avatar/`）、`LIBRARY_SCOPED_PREFIXES`（`/files/`、`/tags/`、`/folders/`、`/database/`、`/devices/`、`/fs/`、`/statistics/`）。
- 角色：`super` / `admin` / `user`；库级访问由库配置的 `allowedRoles` 控制（`canAccessLibrary`）。
- WebSocket 连接通过 query `token` 鉴权（见 `WebSocketServer.ts`）。

## WebSocket 约定

- 连接 URL：`ws://host:wsPort?clientId=xxx&libraryId=xxx&token=xxx`，缺 `clientId` / `libraryId` 直接 close。
- 消息体：`{ action, requestId, libraryId, clientId, payload: { type, data } }`（见 `types.ts` 的 `WebSocketMessage`）。
- 路由分发在 `routes/WebSocketRouter.ts`，处理器在 `handlers/`（File/Folder/Tag/Library/Message/PluginMessage）。

## 插件约定

- 插件继承 `ServerPlugin`，目录 `src/plugins/`，注册清单 `src/plugins/plugins.json`（`[{ name, enabled, path, status? }]`）。
- 通过 `ServerPluginManager` 管理生命周期；可用 `registerHttpHook({ method?, path, handler })` 拦截 HTTP。
- 缩略图扩展实现 `ThumbnailGenerator` 接口（`{ name, supportedExtensions, generate(src, dest) }`），调用 `ThumbnailService.registerGenerator()` 注册。

## 配置约定

- 优先加载仓库根 `.env`（`../../../.env`）再加载本地 `.env`（`dotenv.config()` 二次调用，后者覆盖前者）。
- 环境变量优先级：`MIRA_SERVER_HTTP_PORT` > `HTTP_PORT` > 默认 `8081`；`MIRA_SERVER_WS_PORT` > `WS_PORT` > 默认 `8018`；`DATA_PATH` 默认 `./data`。
- 运行时数据：`data/librarys.json`、`data/settings.json`、`data/users.db`、`data/users/`、`data/temp/`。
- 优雅关闭：监听 `SIGINT` / `SIGTERM`，调用 `server.stop()`。
