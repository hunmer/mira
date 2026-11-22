# public-interfaces

公开接口（HTTP REST + WebSocket）。详细端点签名未逐条扫描，以下为模块级路径前缀与职责；具体请求/响应字段需查阅各 Router 文件。

## HTTP API 路由（21 个文件 = 19 Router（含 `BaseRouter` / `WebSocketRouter`）+ 2 个非路由辅助）

| 路径前缀 | 路由文件 | 说明 |
|----------|----------|------|
| `/health` | （在 `HttpServer.ts` 直接挂载） | 健康检查，公开路由 |
| `/api/auth` | `routes/AuthRouter.ts` | 登录 / 登出 / token 验证 / 注册 |
| `/api/admins` | `routes/AdminsRouter.ts` | 管理员管理 |
| `/api/user` | `routes/UserRouter.ts` | 用户信息（`/user/avatar/` 为公开前缀） |
| `/api/libraries` | `routes/LibraryRoutes.ts` | 素材库 CRUD + 启用/禁用/插件管理 + 跨库导入 + 物理迁移 `/relocate` |
| `/api/plugins` | `routes/PluginRoutes.ts` | 插件安装/卸载/配置/路由 |
| `/api/database` | `routes/DatabaseRoutes.ts` | 数据库操作（库级校验） |
| `/api/files` | `routes/FileRoutes.ts` | 文件上传/下载/管理/ZIP 导入 + `/import-path`（仅 loopback）+ `/checkDuplicates`（库级校验） |
| `/api/devices` | `routes/DeviceRoutes.ts` | 设备管理（库级校验） |
| `/api/tags` | `routes/TagRouter.ts` | 标签 CRUD + `/file/set`、`/file/set-batch` 批量（库级校验） |
| `/api/folders` | `routes/FolderRouter.ts` | 文件夹 CRUD + `/file/set` 名称/ID 关联（库级校验） |
| `/api/fs` | `routes/FsRouter.ts` | 文件系统操作（库级校验） |
| `/api/cookie-sites` | `routes/CookieSitesRouter.ts` | Cookie 站点管理（2026-08 新增，SDK `CookieSiteModule`） |
| `/api/download` | `routes/DownloadRoutes.ts` | 下载任务（2026-08 新增，SDK `DownloadModule`） |
| `/api/thumb` | `routes/ThumbRouter.ts` | 缩略图管理 |
| `/api/statistics` | `routes/StatisticsRouter.ts` | 统计数据（库级校验） |
| `/api/settings` | `routes/SettingsRouter.ts` | 服务端设置（`GET` 公开） |
| `/plugins/:libraryId/:pluginName/*` | `routes/HttpRouter.ts` | 插件静态资源 + 动态路由 |
| — | `routes/WebSocketRouter.ts` | WebSocket 消息分发（非 HTTP） |

> 完整端点级清单见仓库根 `.audit/server-api-manifest.json` 与 `.audit/sdk-coverage-report.md`（2026-09-09 生成：固定 JSON API 共 141 条，covered 128 / missing 13 / excluded 13 / dynamic 7；missing 主要是插件动态路由与 `:param` 通配端点）。

> 响应统一为 `ApiResponse<T> = { code: number; message: string; data: T | null }`（`BaseRouter.ts`）。

### v3.0.2 新增端点（2026-11 增量确认）

| 端点 | 说明 |
|------|------|
| `POST /api/libraries/:id/relocate` | 素材库物理迁移，body `{destinationPath}`，202 返回 `{relocationId}`；同库防并发 |
| `GET /api/libraries/:id/relocate/:relocationId` | 迁移进度（`status/totalFiles/movedFiles/totalBytes/movedBytes/current`） |
| `POST /api/files/import-path` | 本机绝对路径导入，仅接受 loopback 客户端；走库级 importType，支持 folderId/tags |
| `POST /api/files/checkDuplicates` | body `{libraryId, names}`，返回 `{duplicates}`（已存在文件名集合） |
| `POST /api/tags/file/set-batch` | 批量设置多文件标签，返回 `{updated, failed, results[], tags}` |

- 行为约定：`FileRoutes /rename /update`、`TagRouter /file/set(-batch)`、`FolderRouter /file/set` 对 `recycled=1` 的文件统一返回 409 `'Cannot update a recycled file'`。
- 标签/文件夹参数在上述路由及 `POST /api/download` 中均接受名称或 ID（`FileAssociationResolver.resolveTagIds/resolveFolderId`，名称不存在则创建）。

## 权限分层 (`middleware/permission.ts`)

- 公开路由（`PUBLIC_ROUTES`）：`GET /health`、`POST /auth/login`、`POST /auth/register`、`GET /settings`。
- 公开前缀（`PUBLIC_PREFIXES`，仅 GET）：`/user/avatar/`。
- 库级 `allowedRoles` 校验前缀（`LIBRARY_SCOPED_PREFIXES`）：`/files/`、`/tags/`、`/folders/`、`/database/`、`/devices/`、`/fs/`、`/statistics/`。
- 角色：`super` / `admin` / `user`。

## WebSocket 接口

- 连接：`ws://host:wsPort?clientId=xxx&libraryId=xxx&token=xxx`
  - 缺 `clientId` 或 `libraryId`：服务端 `ws.close()` 拒绝。
  - `token` 用于鉴权（依赖 `SettingsManager.authRequired`）。
- 消息体（`types.ts` `WebSocketMessage`）：

```ts
{
  action: string;
  requestId: string;
  libraryId: string;
  clientId: string;
  payload: { type: string; data: Record<string, any> };
}
```

- 连接管理：`MiraWebsocketServer.libraryClients: { [libraryId]: WebSocket[] }`，按库分组；客户端元信息见 `ConnectedClient`（`clientId`、`libraryId`、`user`、`fields`、`connectionTime`、`lastActivity`、`requestInfo`）。

### WebSocket Handlers（6 个）

| Handler | 文件 | 说明 |
|---------|------|------|
| MessageHandler | `handlers/MessageHandler.ts` | 通用消息 |
| FileHandler | `handlers/FileHandler.ts` | 文件操作 |
| FolderHandler | `handlers/FolderHandler.ts` | 文件夹操作 |
| TagHandler | `handlers/TagHandler.ts` | 标签操作 |
| LibraryHandler | `handlers/LibraryHandler.ts` | 素材库操作 |
| PluginMessageHandler | `handlers/PluginMessageHandler.ts` | 插件消息转发 |

## 模块导出 (`src/index.ts`)

```ts
export { MiraServer, startServer, ServerPluginManager, ServerPlugin,
         MiraWebsocketServer, MiraHttpServer, ThumbnailService, express, ws };
export type { ThumbnailGenerator } from './services/ThumbnailService';
export type { PluginRouteDefinition } from './ServerPlugin';
export type { ILibraryServerData } from 'mira-app-core/storage/sqlite';
```

`src/server.ts` 额外 re-export：`MiraServer`、`ServerConfig`、`MiraHttpServer`、`MiraWebsocketServer`、`startServer`。

## ThumbnailService 扩展点

```ts
interface ThumbnailGenerator {
  name: string;
  supportedExtensions: string[];
  generate(srcPath: string, destPath: string): Promise<void>;
}
// 注册: thumbnailService.registerGenerator(gen)
// 广播进度: thumbnailService.setWebSocketServer(ws)
```

## 插件 HTTP Hook 扩展点

```ts
interface HttpHookDefinition { method?: string; path: string | RegExp; handler: HttpHookHandler }
type HttpHookHandler = (ctx: HttpHookContext) => boolean | void | Promise<boolean | void>;
// 注册: pluginManager.registerHttpHook(def)  // 扫描范围内未见 registerHttpHook 实现体，疑似在 ServerPluginManager 后半部分（未读取）
```

> 未发现：各 Router 内具体子路径（如 `POST /files/upload`、`GET /libraries/:id`）的逐项清单，需查阅 `API_REFERENCE.md` 或各 Router 源码。
