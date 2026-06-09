# 公开接口

## HTTP API 路由 (15 个路由文件)

| 路径前缀 | 路由文件 | 说明 |
|----------|----------|------|
| `/api/auth` | `routes/AuthRouter.ts` | 用户认证（登录/登出/token验证/注册） |
| `/api/admins` | `routes/AdminsRouter.ts` | 管理员管理 |
| `/api/user` | `routes/UserRouter.ts` | 用户信息 |
| `/api/libraries` | `routes/LibraryRoutes.ts` | 素材库 CRUD + 启用/禁用/插件管理 |
| `/api/plugins` | `routes/PluginRoutes.ts` | 插件管理（安装/卸载/配置/路由） |
| `/api/database` | `routes/DatabaseRoutes.ts` | 数据库操作 |
| `/api/files` | `routes/FileRoutes.ts` | 文件上传/下载/管理/ZIP 导入 |
| `/api/devices` | `routes/DeviceRoutes.ts` | 设备管理 |
| `/api/tags` | `routes/TagRouter.ts` | 标签 CRUD |
| `/api/folders` | `routes/FolderRouter.ts` | 文件夹 CRUD |
| `/api/fs` | `routes/FsRouter.ts` | 文件系统操作 |
| `/api/thumb` | `routes/ThumbRouter.ts` | 缩略图管理 |
| `/api/statistics` | `routes/StatisticsRouter.ts` | 统计数据 |
| `/api/settings` | `routes/SettingsRouter.ts` | 服务端设置 |
| `/plugins/:libraryId/:pluginName/*` | `routes/HttpRouter.ts` | 插件静态资源 + 动态路由 |

## WebSocket 协议

- 连接: `ws://host:wsPort?clientId=xxx&libraryId=xxx`
- 消息: `{ action, requestId, libraryId, clientId, payload: { type, data } }`

### WebSocket Handlers (6 个)

| Handler | 文件 | 说明 |
|---------|------|------|
| MessageHandler | `handlers/MessageHandler.ts` | 通用消息处理 |
| FileHandler | `handlers/FileHandler.ts` | 文件操作消息 |
| FolderHandler | `handlers/FolderHandler.ts` | 文件夹操作消息 |
| TagHandler | `handlers/TagHandler.ts` | 标签操作消息 |
| LibraryHandler | `handlers/LibraryHandler.ts` | 素材库操作消息 |
| PluginMessageHandler | `handlers/PluginMessageHandler.ts` | 插件消息转发 |

## 核心类

| 类 | 文件 | 职责 |
|----|------|------|
| MiraServer | `MiraServer.ts` | 顶层编排：HTTP + WebSocket + 配置 |
| MiraHttpServer | `server.ts` | Express 应用、路由注册、中间件 |
| MiraWebsocketServer | `WebSocketServer.ts` | WS 服务器、按库分组连接管理 |
| LibraryStorage | `LibraryStorage.ts` | 多库加载/卸载/启用/禁用 |
| ServerPluginManager | `ServerPluginManager.ts` | 插件生命周期、HTTP Hook |
| ServerPlugin | `ServerPlugin.ts` | 插件基类 |
| UserStorage | `UserStorage.ts` | 用户管理、认证、会话 |
| LibraryWatcher | `LibraryWatcher.ts` | 文件系统监视 |
| ThumbnailService | `services/ThumbnailService.ts` | 内置缩略图服务 |
| SettingsManager | `SettingsManager.ts` | 全局设置管理 |

## 模块导出 (src/index.ts)

```typescript
export { MiraServer, startServer, ServerPluginManager, ServerPlugin,
         MiraWebsocketServer, MiraHttpServer, ThumbnailService, express, ws }
export type { ThumbnailGenerator } from './services/ThumbnailService'
export type { PluginRouteDefinition } from './ServerPlugin'
export type { ILibraryServerData } from 'mira-app-core/storage/sqlite'
```

## ThumbnailService 扩展

```typescript
interface ThumbnailGenerator {
  name: string;
  supportedExtensions: string[];
  generate(srcPath: string, destPath: string): Promise<void>;
}
// 注册: thumbnailService.registerGenerator()
// 内置: ImageThumbnailGenerator, VideoThumbnailGenerator
```
