[根目录](../../CLAUDE.md) > [packages](..) > **mira-app-server**

# mira-app-server

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-26 | 增量更新 | 新增 ThumbnailService (289 行)、SettingsManager (52 行)、ThumbRouter、StatisticsRouter (161 行)；模块导出更新；路由清单增至 15 个 |
| 2026-05-25 | 增量更新 | 补充完整路由清单（13 个路由文件）、核心类行数、Handler 列表、LibraryWatcher、ServerPluginManager HttpHook 机制 |
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira 独立服务端应用，提供完整的后端服务能力：

1. **HTTP REST API**: 基于 Express，提供认证、用户、素材库、插件、文件、数据库、设备、标签、文件夹、缩略图、统计等 RESTful 接口
2. **WebSocket 实时通信**: 基于 `ws`，按素材库分组管理客户端连接，支持消息路由和广播
3. **多素材库管理**: 通过 `LibraryStorage` 动态加载/卸载多个 SQLite 素材库，每个库独立 EventManager + PluginManager
4. **插件系统**: 通过 `ServerPluginManager` 加载/卸载/重载服务端插件，支持 HTTP Hook 拦截机制
5. **CLI 工具**: 基于 Commander.js 的命令行界面，支持 start/version/health 子命令
6. **用户认证**: 基于 SQLite 的用户管理 (`UserStorage`, 431 行)
7. **库文件监视**: `LibraryWatcher` (263 行) 监视素材库目录变更
8. **缩略图服务**: 内置 `ThumbnailService` (289 行) 提供可扩展的缩略图生成（支持 Generator 注册）
9. **设置管理**: `SettingsManager` (52 行) 管理服务端全局配置

## 入口与启动

- **入口文件**: `src/index.ts` -- 导出并启动 MiraServer，导出 ThumbnailService/ThumbnailGenerator 等
- **CLI 入口**: `src/cli.ts` -- 命令行入口，bin 字段注册为 `mira-app-server`
- **主类**: `src/MiraServer.ts` -- 服务器编排核心，协调 HTTP + WebSocket + 插件
- **构建产物**: `dist/` 目录
- **构建命令**: `tsc` / `pnpm run build` / `pnpm run rebuild`
- **启动**: `node dist/index.js` 或 `pnpm run start`
- **开发**: `pnpm run dev` (ts-node + inspect)

## 对外接口

### HTTP API 路由 (15 个路由文件)

| 路径前缀 | 路由文件 | 行数 | 说明 |
|----------|----------|------|------|
| `/api/auth` | `routes/AuthRouter.ts` | 401 | 用户认证（登录/登出/token验证/注册） |
| `/api/admins` | `routes/AdminsRouter.ts` | 193 | 管理员管理 |
| `/api/user` | `routes/UserRouter.ts` | 140 | 用户信息（符合 Vben 标准） |
| `/api/libraries` | `routes/LibraryRoutes.ts` | 720 | 素材库 CRUD + 启用/禁用/插件管理 |
| `/api/plugins` | `routes/PluginRoutes.ts` | 857 | 插件管理（安装/卸载/配置/路由） |
| `/api/database` | `routes/DatabaseRoutes.ts` | 111 | 数据库操作 |
| `/api/files` | `routes/FileRoutes.ts` | 603 | 文件上传/下载/管理/ZIP 导入 |
| `/api/devices` | `routes/DeviceRoutes.ts` | 391 | 设备管理 |
| `/api/tags` | `routes/TagRouter.ts` | 103 | 标签 CRUD |
| `/api/folders` | `routes/FolderRouter.ts` | 70 | 文件夹 CRUD |
| `/api/fs` | `routes/FsRouter.ts` | 64 | 文件系统操作 |
| `/api/thumb` | `routes/ThumbRouter.ts` | 71 | 缩略图管理（scan/progress/cancel/stats/generators/sync） |
| `/api/statistics` | `routes/StatisticsRouter.ts` | 161 | 统计数据（上传统计/每日统计/文件类型/最近上传） |
| `/api/settings` | `routes/SettingsRouter.ts` | -- | 服务端设置 |
| (通用) | `routes/BaseRouter.ts` | 206 | 路由基类（统一请求处理） |
| `/plugins/:libraryId/:pluginName/*` | `routes/HttpRouter.ts` | 204 | 插件静态资源服务 + 动态路由 |

### WebSocket 协议

- 连接地址: `ws://host:wsPort?clientId=xxx&libraryId=xxx`
- 消息格式: `{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 路由: `routes/WebSocketRouter.ts` 分发到各 Handler

### WebSocket Handlers (6 个)

| Handler | 文件 | 说明 |
|---------|------|------|
| MessageHandler | `handlers/MessageHandler.ts` | 通用消息处理 |
| FileHandler | `handlers/FileHandler.ts` | 文件操作消息 |
| FolderHandler | `handlers/FolderHandler.ts` | 文件夹操作消息 |
| TagHandler | `handlers/TagHandler.ts` | 标签操作消息 |
| LibraryHandler | `handlers/LibraryHandler.ts` | 素材库操作消息 |
| PluginMessageHandler | `handlers/PluginMessageHandler.ts` | 插件消息转发 |

### 核心类

| 类 | 文件 | 行数 | 职责 |
|----|------|------|------|
| `MiraServer` | `MiraServer.ts` | 89 | 顶层编排：HTTP + WebSocket + 配置 |
| `MiraHttpServer` | `HttpServer.ts` | 338 | Express 应用、路由注册、中间件、HTTP 日志 |
| `MiraWebsocketServer` | `WebSocketServer.ts` | 220 | WS 服务器、按库分组连接管理、广播、对话框弹出 |
| `LibraryStorage` | `LibraryStorage.ts` | 277 | 多库加载/卸载/启用/禁用，每个库独立 EventManager |
| `ServerPluginManager` | `ServerPluginManager.ts` | 297 | 插件生命周期管理、HTTP Hook 注册、字段注册 |
| `ServerPlugin` | `ServerPlugin.ts` | 127 | 插件基类（抽象类）、配置持久化、路由注册 |
| `UserStorage` | `UserStorage.ts` | 431 | 用户管理（SQLite）、认证、会话管理 |
| `LibraryWatcher` | `LibraryWatcher.ts` | 263 | 文件系统监视（chokidar），自动检测库目录变更 |
| `ThumbnailService` | `services/ThumbnailService.ts` | 289 | 内置缩略图服务，支持 Generator 注册/注销、队列并发、进度追踪 |
| `SettingsManager` | `SettingsManager.ts` | 52 | 全局设置管理（authRequired, allowRegistration, dashboardPort） |

### ThumbnailService 扩展机制

`ThumbnailService` 支持通过 `ThumbnailGenerator` 接口扩展：

```typescript
interface ThumbnailGenerator {
  name: string;
  supportedExtensions: string[];
  generate(srcPath: string, destPath: string): Promise<void>;
}
```

- 内置 ImageThumbnailGenerator (jpg/jpeg/png/gif/bmp/webp) 和 VideoThumbnailGenerator (mp4/mov/avi/mkv/flv/webm)
- 插件可通过 `thumbnailService.registerGenerator()` 注册自定义生成器（如 `mira_thumb_imagemagick`）
- 队列并发控制（concurrency: 5）
- HTTP 接口：`/api/thumb/scan`, `/api/thumb/progress`, `/api/thumb/cancel`, `/api/thumb/stats`, `/api/thumb/generators`, `/api/thumb/sync`

### ServerPluginManager 扩展机制

- `registerHttpHook()`: 注册 HTTP 请求拦截器（支持方法+路径匹配）
- `registerFields()`: 注册客户端连接所需的字段（如 username/password）
- `setClientFields()` / `getClientFields()`: 读写客户端字段
- 插件通过 `init(inst)` 工厂函数导出

### 模块导出 (src/index.ts)

```typescript
export { MiraServer, startServer, ServerPluginManager, ServerPlugin, MiraWebsocketServer, MiraHttpServer, ThumbnailService, express, ws };
export type { ThumbnailGenerator } from './services/ThumbnailService';
export type { PluginRouteDefinition } from './ServerPlugin';
export type { ILibraryServerData } from 'mira-storage-sqlite';
```

## 关键依赖与配置

- **workspace 依赖**: `mira-app-core`, `mira-server-sdk`, `mira-storage-sqlite`
- **核心依赖**: `express`, `ws`, `socket.io`, `sqlite3`, `commander`, `multer` (文件上传), `cors`, `dotenv`, `yauzl` (ZIP 解压), `chokidar` (文件监视), `axios`, `fluent-ffmpeg` (缩略图)
- **开发依赖**: `typescript`, `ts-node`, `jest`, `ts-jest`
- **环境变量**: `MIRA_SERVER_HTTP_PORT` (8081), `MIRA_SERVER_WS_PORT` (8018), `DATA_PATH`, `FFMPEG_PATH`
- **源文件统计**: 35 个 .ts 文件 (src/), 约 7400 行代码

## 数据模型

服务端本身不定义独立数据模型，数据层由 `mira-storage-sqlite` 提供。服务端维护的类型：

- `User`: 用户信息（id, username, password, role, permissions, ...）
- `Session`: 会话信息（token, user_id, created_at, expires_at, is_active）
- `WebSocketMessage`: WS 消息格式
- `PluginConfig`: 插件配置（name, enabled, path）
- `PluginRouteDefinition`: 插件路由定义（name, group, path, component, meta）
- `HttpHookDefinition`: HTTP 拦截器定义（method, path, handler）
- `ServerSettings`: 全局设置（authRequired, allowRegistration, dashboardPort）
- `ThumbnailGenerator`: 缩略图生成器接口

## 测试与质量

- **测试框架**: Jest (ts-jest)
- **测试配置**: `sdk/jest.config.js`
- **测试命令**: `pnpm test`, `pnpm run test:coverage`, `pnpm run test:integration`
- 测试目录主要在 `sdk/` 下

## 常见问题 (FAQ)

**Q: 如何添加新的 API 路由？**
A: 在 `src/routes/` 下创建新的 Router 文件（可继承 `BaseRouter`），在 `HttpServer.ts` 中 import 并注册。

**Q: 如何添加新的 WebSocket 消息处理？**
A: 在 `src/handlers/` 下创建 Handler，在 `routes/WebSocketRouter.ts` 中注册路由。

**Q: 如何开发服务端插件？**
A: 继承 `ServerPlugin` 抽象类，在 `plugins.json` 中注册，导出 `init(inst)` 函数。参考 `plugins/plugins/` 下现有插件。

**Q: 如何拦截 HTTP 请求？**
A: 在插件构造函数中调用 `pluginManager.registerHttpHook({ method, path, handler })`。

**Q: 如何扩展缩略图支持更多格式？**
A: 实现 `ThumbnailGenerator` 接口，通过 `thumbnailService.registerGenerator()` 注册。参考 `mira_thumb_imagemagick` 插件。

## 相关文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/index.ts` | 69 | 模块入口，启动服务器，导出核心类和类型 |
| `src/server.ts` | 7 | 包级导出聚合 |
| `src/cli.ts` | 92 | CLI 命令行入口 (Commander.js) |
| `src/MiraServer.ts` | 89 | 服务器核心编排类 |
| `src/HttpServer.ts` | 338 | Express HTTP 服务器 |
| `src/WebSocketServer.ts` | 220 | WebSocket 服务器 |
| `src/LibraryStorage.ts` | 277 | 多素材库管理 |
| `src/LibraryWatcher.ts` | 263 | 库目录文件监视 |
| `src/ServerPluginManager.ts` | 297 | 插件管理器 |
| `src/ServerPlugin.ts` | 127 | 插件基类 |
| `src/UserStorage.ts` | 431 | 用户存储和认证 |
| `src/SettingsManager.ts` | 52 | 全局设置管理 |
| `src/services/ThumbnailService.ts` | 289 | 内置缩略图服务 |
| `src/types.ts` | 32 | 共享类型定义 |
| `src/routes/*.ts` | -- | 15 个 HTTP 路由文件 |
| `src/handlers/*.ts` | -- | 6 个消息处理器 |
| `src/middleware/permission.ts` | -- | 权限中间件 |
| `package.json` | -- | 包配置 (v1.0.25) |
