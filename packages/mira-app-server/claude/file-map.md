# 文件清单

## 核心文件

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 模块入口，启动服务器 |
| `src/server.ts` | MiraHttpServer (Express) |
| `src/cli.ts` | CLI 命令行入口 |
| `src/MiraServer.ts` | 服务器核心编排 |
| `src/WebSocketServer.ts` | WebSocket 服务器 |
| `src/LibraryStorage.ts` | 多素材库管理 |
| `src/LibraryWatcher.ts` | 库目录文件监视 |
| `src/ServerPluginManager.ts` | 插件管理器 |
| `src/ServerPlugin.ts` | 插件基类 |
| `src/UserStorage.ts` | 用户存储和认证 |
| `src/SettingsManager.ts` | 全局设置管理 |
| `src/types.ts` | 共享类型定义 |

## 服务

| 文件 | 说明 |
|------|------|
| `src/services/ThumbnailService.ts` | 内置缩略图服务 |

## 路由 (17 个文件)

| 文件 | 说明 |
|------|------|
| `src/routes/BaseRouter.ts` | 路由基类 |
| `src/routes/AuthRouter.ts` | 认证路由 |
| `src/routes/AdminsRouter.ts` | 管理员路由 |
| `src/routes/UserRouter.ts` | 用户路由 |
| `src/routes/LibraryRoutes.ts` | 素材库路由 |
| `src/routes/PluginRoutes.ts` | 插件路由 |
| `src/routes/FileRoutes.ts` | 文件路由 |
| `src/routes/DatabaseRoutes.ts` | 数据库路由 |
| `src/routes/DeviceRoutes.ts` | 设备路由 |
| `src/routes/TagRouter.ts` | 标签路由 |
| `src/routes/FolderRouter.ts` | 文件夹路由 |
| `src/routes/FsRouter.ts` | 文件系统路由 |
| `src/routes/ThumbRouter.ts` | 缩略图路由 |
| `src/routes/StatisticsRouter.ts` | 统计路由 |
| `src/routes/SettingsRouter.ts` | 设置路由 |
| `src/routes/HttpRouter.ts` | 插件 HTTP 路由 |
| `src/routes/WebSocketRouter.ts` | WebSocket 路由 |

## 处理器 (6 个文件)

| 文件 | 说明 |
|------|------|
| `src/handlers/MessageHandler.ts` | 通用消息 |
| `src/handlers/FileHandler.ts` | 文件操作 |
| `src/handlers/FolderHandler.ts` | 文件夹操作 |
| `src/handlers/TagHandler.ts` | 标签操作 |
| `src/handlers/LibraryHandler.ts` | 素材库操作 |
| `src/handlers/PluginMessageHandler.ts` | 插件消息 |

## 中间件

| 文件 | 说明 |
|------|------|
| `src/middleware/permission.ts` | 权限中间件 |

## 测试

| 文件 | 说明 |
|------|------|
| `sdk/jest.config.js` | Jest 配置 |
