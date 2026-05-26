[根目录](../CLAUDE.md) > **plugins**

# Mira 服务端插件集合

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-26 | 增量更新 | 新增 mira_thumb_imagemagick 插件 (ImageMagick 缩略图)；mira_user/upload_statistics 源码已移除；服务端内置 ThumbnailService 替代部分插件功能 |
| 2026-05-25 | 深度扫描更新 | 完整扫描 4 个插件源码，补充每个插件的路由/事件/机制详情 |
| 2026-05-20 | 初始化 | 首次生成插件目录文档 |

## 模块职责

`plugins/plugins/` 目录包含 Mira 服务端的插件集合。每个插件是一个独立的 TypeScript 模块，继承自 `ServerPlugin` 基类（来自 `mira-app-server`），在素材库加载时被 `ServerPluginManager` 动态加载。

插件可以：
- 注册自定义 HTTP 路由（通过 `httpRouter.registerRounter`）
- 监听/广播 WebSocket 事件（通过 `EventManager.subscribe/broadcast`）
- 注册 HTTP Hook 拦截请求（通过 `pluginManager.registerHttpHook`）
- 注册前端 UI 路由定义（通过 `registerRoute`）
- 注册缩略图生成器（通过 `thumbnailService.registerGenerator`）
- 扩展客户端连接字段（通过 `pluginManager.registerFields`）
- 持久化配置（通过 `writeConfig/readConfig/writeJson/readJson`）

## 入口与启动

插件不由用户直接启动，而是由 `mira-app-server` 的 `ServerPluginManager` 自动加载：
1. 读取 `plugins.json` 配置
2. 扫描插件目录，动态 require 入口文件
3. 调用导出的 `init(inst)` 工厂函数
4. 构造函数接收 `{ pluginManager, server, dbService, miraClient? }`

## 插件列表

### mira_thumb (v1.0.19) - 缩略图生成 (ffmpeg)

**职责**: 使用 ffmpeg 为图片和视频自动生成缩略图。

**机制**:
- 监听 `file::created` 事件，自动为新文件生成缩略图
- 监听 `file::deleted` 事件，清理对应的缩略图文件
- 支持格式：图片 (jpg/jpeg/png/gif/bmp/webp)、视频 (mp4/mov/avi/mkv/flv/webm)
- 图片缩略图：200px 宽，保持宽高比
- 视频缩略图：从第 1 秒截图，200px 宽
- 使用 Queue 并发控制（concurrency: 5）
- 提供 HTTP 接口：`/thumb/scan` (开始扫描), `/thumb/progress` (进度查询), `/thumb/cancel` (取消), `/thumb/stats` (统计)
- 注册前端路由：`/media/thumbnails` (缩略图管理页面)

**关键依赖**: fluent-ffmpeg, queue, which, mira-app-core

### mira_n8n (v1.0.7) - n8n 集成

**职责**: 通过独立的 WebSocket 服务器将 Mira 事件转发到 n8n 工作流。

**机制**:
- 启动独立的 WebSocket 服务器（默认端口 7457）
- 通过配置管理 Webhook 列表，每个 Webhook 绑定事件列表和 Token
- Token 验证：连接时通过 URL 参数 `?token=xxx` 验证身份
- 按 Webhook 配置的事件列表过滤并转发事件
- 提供 HTTP 接口：`/n8n/list` (GET 列表, POST 新增), `/n8n/list/:id` (DELETE 删除)
- 支持指数退避重连（客户端侧）

**关键依赖**: ws (内置), mira-app-server, mira-storage-sqlite, mira-app-core

### mira_thumb_imagemagick (v1.0.0) - ImageMagick 缩略图

**职责**: 使用 ImageMagick 为专业格式生成缩略图，扩展内置 ThumbnailService 的能力。

**机制**:
- 实现 `ThumbnailGenerator` 接口，通过 `thumbnailService.registerGenerator()` 注册
- 支持格式：psd, ai, eps, svg, tiff, tif, dng, raw, heic, heif（可通过配置启用/禁用）
- 生成参数：200x200 像素，保持宽高比
- ImageMagick 查找优先级：配置文件 > `MAGICK_PATH` 环境变量 > PATH 查找
- 配置文件：`data/config.json`，可配置 `magickPath` 和 `enableExts`

**关键依赖**: which (查找 ImageMagick)

### mira_user (v1.0.9) - 用户登录认证 [已移除]

源码已移除，功能可能已内置于服务端核心。`plugins.json` 中仍有注册但 `enabled: false`。

### upload_statistics (v1.0.7) - 上传统计 [已移除]

源码已移除，功能已内置于服务端 `StatisticsRouter`（提供更丰富的统计 API）。`plugins.json` 中仍有注册但 `enabled: false`。

## 对外接口

每个插件继承 `ServerPlugin` 抽象类，核心接口：

```typescript
abstract class ServerPlugin {
  constructor(pluginName: string, pluginManager: ServerPluginManager, dbServer: ILibraryServerData)
  protected writeConfig(key: string, value: any): void
  protected readConfig(key: string): any
  protected loadConfig(defaultConfig: Record<string, any>): void
  protected saveConfig(): void
  protected writeJson(filename: string, data: any): void
  protected readJson(filename: string): any
  protected registerRoute(route: PluginRouteDefinition): void
  protected registerRoutes(routes: PluginRouteDefinition[]): void
  public getRoutes(): PluginRouteDefinition[]
}
```

每个插件必须导出工厂函数：

```typescript
export function init(inst: { pluginManager, server, dbService, miraClient? }): PluginClass
```

## 关键依赖与配置

所有插件共享以下依赖：
- `mira-app-server`: 提供 `ServerPlugin`, `ServerPluginManager`, `MiraWebsocketServer`, `ThumbnailService` 等
- `mira-storage-sqlite`: 提供 `ILibraryServerData` 数据接口
- `mira-app-core`: 提供 `EventArgs`, `EventManager`

插件数据持久化在 `{pluginDir}/data/` 目录下。

## 测试与质量

当前无独立测试。插件依赖运行时加载环境，测试需要集成测试框架。

## 相关文件清单

```
plugins/
  CLAUDE.md                     # 本文件
  plugins/
    plugins.json                # 插件注册配置（6 个插件条目）
    mira_user/                  # [已移除] 用户认证插件
    mira_thumb/
      index.ts                  # 缩略图生成插件 (331 行)
      CLAUDE.md                 # 模块文档
      package.json              # 包配置 (v1.0.19)
      tsconfig.json
      node_modules/             # 插件独立依赖 (fluent-ffmpeg)
    upload_statistics/          # [已移除] 上传统计插件
    mira_n8n/
      index.ts                  # n8n 集成插件 (290 行)
      CLAUDE.md                 # 模块文档
      package.json              # 包配置 (v1.0.7)
      tsconfig.json
    mira_thumb_imagemagick/
      index.ts                  # ImageMagick 缩略图插件 (117 行)
      config.json               # 默认配置
      data/config.json          # 运行时配置
      package.json              # 包配置 (v1.0.0)
      tsconfig.json
```
