[根目录](../../CLAUDE.md) > [packages](..) > **mira-app-server**

# mira-app-server

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira 独立服务端应用，提供完整的后端服务能力：

1. **HTTP REST API**: 基于 Express，提供认证、用户、素材库、插件、文件、数据库、设备、标签、文件夹等 RESTful 接口
2. **WebSocket 实时通信**: 基于 `ws`，按素材库分组管理客户端连接，支持消息路由和广播
3. **多素材库管理**: 通过 `LibraryStorage` 动态加载/卸载多个 SQLite 素材库
4. **插件系统**: 通过 `ServerPluginManager` 加载/卸载/重载服务端插件
5. **CLI 工具**: 基于 Commander.js 的命令行界面，支持 start/version/health 子命令
6. **用户认证**: 基于文件的简单用户管理（users.db SQLite）

## 入口与启动

- **入口文件**: `src/index.ts` -- 导出并启动 MiraServer
- **CLI 入口**: `src/cli.ts` -- 命令行入口，bin 字段注册为 `mira-app-server`
- **主类**: `src/MiraServer.ts` -- 服务器编排核心，协调 HTTP + WebSocket + 插件
- **构建产物**: `dist/` 目录
- **构建命令**: `tsc` / `pnpm run build` / `pnpm run rebuild`
- **启动**: `node dist/index.js` 或 `pnpm run start`
- **开发**: `pnpm run dev` (ts-node + inspect)

## 对外接口

### HTTP API 路由

| 路径前缀 | 路由文件 | 说明 |
|----------|----------|------|
| `/api/auth` | `routes/AuthRouter.ts` | 用户认证（登录/登出/token验证） |
| `/api/admins` | `routes/AdminsRouter.ts` | 管理员管理 |
| `/api/user` | `routes/UserRouter.ts` | 用户信息（符合 Vben 标准） |
| `/api/libraries` | `routes/LibraryRoutes.ts` | 素材库 CRUD + 启用/禁用 |
| `/api/plugins` | `routes/PluginRoutes.ts` | 插件管理 |
| `/api/database` | `routes/DatabaseRoutes.ts` | 数据库操作 |
| `/api/files` | `routes/FileRoutes.ts` | 文件上传/下载/管理 |
| `/api/devices` | `routes/DeviceRoutes.ts` | 设备管理 |
| `/api/tags` | `routes/TagRouter.ts` | 标签 CRUD |
| `/api/folders` | `routes/FolderRouter.ts` | 文件夹 CRUD |
| `/api/plugin-routes` | HttpServer 内联 | 获取所有插件的动态路由 |
| `/api/health` | HttpServer 内联 | 健康检查 |
| `/plugins/:libraryId/:pluginName/*` | `routes/HttpRouter.ts` | 插件静态资源服务 |

### WebSocket 协议

- 连接地址: `ws://host:wsPort?clientId=xxx&libraryId=xxx`
- 消息格式: `{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 路由: `routes/WebSocketRouter.ts` 分发到各 Handler

### 核心类

| 类 | 文件 | 职责 |
|----|------|------|
| `MiraServer` | `MiraServer.ts` | 顶层编排：HTTP + WebSocket + 配置 |
| `MiraHttpServer` | `HttpServer.ts` | Express 应用、路由注册、中间件 |
| `MiraWebsocketServer` | `WebSocketServer.ts` | WS 服务器、连接管理、消息分发 |
| `LibraryStorage` | `LibraryStorage.ts` | 多库加载/卸载/启用/禁用 |
| `ServerPluginManager` | `ServerPluginManager.ts` | 插件生命周期管理 |
| `ServerPlugin` | `ServerPlugin.ts` | 插件基类（抽象类） |

## 关键依赖与配置

- **workspace 依赖**: `mira-app-core`, `mira-server-sdk`, `mira-storage-sqlite`
- **核心依赖**: `express`, `ws`, `socket.io`, `sqlite3`, `commander`, `multer` (文件上传), `cors`, `dotenv`, `yauzl` (ZIP), `axios`
- **开发依赖**: `typescript`, `ts-node`, `jest`, `ts-jest`
- **环境变量**: `MIRA_SERVER_HTTP_PORT` (8081), `MIRA_SERVER_WS_PORT` (8018), `DATA_PATH`

## 数据模型

服务端本身不定义独立数据模型，数据层由 `mira-storage-sqlite` 提供。服务端维护的类型：

- `User`: 用户信息（id, username, password, role, permissions, ...）
- `Session`: 会话信息（token, user_id, created_at, expires_at, is_active）
- `WebSocketMessage`: WS 消息格式
- `PluginConfig`: 插件配置（name, enabled, path）
- `PluginRouteDefinition`: 插件路由定义（name, group, path, component, meta）

## 测试与质量

- **测试框架**: Jest (ts-jest)
- **测试配置**: `sdk/jest.config.js`
- **测试命令**: `pnpm test`, `pnpm run test:coverage`, `pnpm run test:integration`
- 测试目录主要在 `sdk/` 下

## 常见问题 (FAQ)

**Q: 如何添加新的 API 路由？**
A: 在 `src/routes/` 下创建新的 Router 文件，在 `HttpServer.ts` 的 `setupRoutes()` 中注册。

**Q: 如何添加新的 WebSocket 消息处理？**
A: 在 `src/handlers/` 下创建 Handler，在 `routes/WebSocketRouter.ts` 中注册路由。

**Q: 如何开发服务端插件？**
A: 继承 `ServerPlugin` 抽象类，在 `plugins.json` 中注册，参考 `plugins/plugins/` 下现有插件。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 模块入口，启动服务器 |
| `src/cli.ts` | CLI 命令行入口 |
| `src/MiraServer.ts` | 服务器核心编排类 |
| `src/HttpServer.ts` | Express HTTP 服务器 |
| `src/WebSocketServer.ts` | WebSocket 服务器 |
| `src/LibraryStorage.ts` | 多素材库管理 |
| `src/ServerPluginManager.ts` | 插件管理器 |
| `src/ServerPlugin.ts` | 插件基类 |
| `src/routes/*.ts` | HTTP 路由定义 (9 个) |
| `src/handlers/*.ts` | 消息处理器 |
| `src/types.ts` | 共享类型定义 |
| `src/UserStorage.ts` | 用户存储 |
| `package.json` | 包配置 (v1.0.25) |
