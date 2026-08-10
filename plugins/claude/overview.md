# plugins 总览

## 模块职责

`plugins/plugins/` 目录包含 Mira 服务端的插件集合。每个插件是独立的 TypeScript 模块，继承自 `ServerPlugin` 基类（来自 `mira-app-server`），在素材库加载时被 `ServerPluginManager` 动态加载。

插件能力：
- 注册自定义 HTTP 路由 (`httpRouter.registerRounter`)
- 监听/广播 WebSocket 事件 (`EventManager.subscribe/broadcast`)
- 注册 HTTP Hook 拦截请求 (`pluginManager.registerHttpHook`)
- 注册前端 UI 路由 (`registerRoute`)
- 注册缩略图生成器 (`thumbnailService.registerGenerator`)
- 持久化配置 (`writeConfig/readConfig/writeJson/readJson`)

## 入口机制

1. 读取 `plugins.json` 配置
2. 扫描插件目录，动态 require 入口文件
3. 调用导出的 `init(inst)` 工厂函数
4. 构造函数接收 `{ pluginManager, server, dbService, miraClient? }`

## 插件列表

| 插件 | 版本 | 状态 | 职责 |
|------|------|------|------|
| mira_n8n | 1.0.7 | 活跃 | n8n 集成，独立 WebSocket 服务器 |
| psd-viewer | 1.0.0 | 活跃 | PSD/PSB 分层查看器 |
| mira_duplicate_scanner | 1.0.0 | 活跃 (enabled) | 重复文件扫描与删除 |
| mira_thumb | 1.0.19 | 旧版目录 | ffmpeg 缩略图生成 (已移至 old_plugins/) |
| mira_user | -- | 已移除 | 用户认证 (功能已内置于服务端) |
| upload_statistics | -- | 已移除 | 上传统计 (功能已内置于服务端) |

## ServerPlugin 基类接口

```typescript
abstract class ServerPlugin {
  protected writeConfig(key, value): void
  protected readConfig(key): any
  protected loadConfig(defaultConfig): void
  protected saveConfig(): void
  protected writeJson(filename, data): void
  protected readJson(filename): any
  protected registerRoute(route): void
  protected registerRoutes(routes): void
  public getRoutes(): PluginRouteDefinition[]
}

// 每个插件必须导出:
export function init(inst): PluginClass
```
