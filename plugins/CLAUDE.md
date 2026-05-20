[根目录](../CLAUDE.md) > **plugins**

# Mira 服务端插件集合

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成插件目录文档 |

## 模块职责

`plugins/plugins/` 目录包含 Mira 服务端的插件集合。每个插件是一个独立的 TypeScript 模块，继承自 `ServerPlugin` 基类（来自 `mira-app-server`），在素材库加载时被 `ServerPluginManager` 动态加载。

插件可以：
- 注册自定义 HTTP 路由
- 监听/广播 WebSocket 事件
- 扩展素材库数据字段
- 提供前端 UI 路由定义

## 入口与启动

插件不由用户直接启动，而是由 `mira-app-server` 的 `ServerPluginManager` 自动加载：
1. 读取 `plugins.json` 配置
2. 扫描插件目录，动态 require 入口文件
3. 实例化插件类，注入依赖（server, dbService, pluginManager）

## 插件列表

| 插件名 | 入口文件 | 职责 | 关键依赖 |
|--------|----------|------|----------|
| mira_user | `plugins/mira_user/index.ts` | 用户登录认证，通过 SDK 连接 Mira 服务端进行权限验证 | mira-server-sdk |
| mira_thumb | `plugins/mira_thumb/index.ts` | 缩略图生成，使用 ffmpeg 为视频/图片创建缩略图 | fluent-ffmpeg, queue |
| upload_statistics | `plugins/upload_statistics/index.ts` | 上传统计，记录和查询上传历史数据 | -- |
| mira_n8n | `plugins/mira_n8n/index.ts` | n8n 集成，通过 Webhook 和 WebSocket 将事件转发到 n8n 工作流 | ws |

## 对外接口

每个插件继承 `ServerPlugin` 抽象类，核心接口：

```typescript
abstract class ServerPlugin {
  constructor(pluginName: string, pluginManager: ServerPluginManager, dbServer: ILibraryServerData)
  protected writeConfig(key: string, value: any): void
  protected readConfig(key: string): any
  protected writeJson(filename: string, data: any): void
  protected readJson(filename: string): any
  // 路由定义、配置管理、数据持久化等
}
```

## 关键依赖与配置

所有插件共享以下依赖：
- `mira-app-server`: 提供 `ServerPlugin`, `ServerPluginManager`, `MiraWebsocketServer` 等
- `mira-storage-sqlite`: 提供 `ILibraryServerData` 数据接口

## 测试与质量

当前无独立测试。插件依赖运行时加载环境，测试需要集成测试框架。

## 相关文件清单

```
plugins/
  plugins/
    mira_user/
      index.ts              # 用户认证插件
      tsconfig.json
    mira_thumb/
      index.ts              # 缩略图生成插件
      tsconfig.json
      node_modules/         # 插件独立依赖 (fluent-ffmpeg)
    upload_statistics/
      index.ts              # 上传统计插件
      tsconfig.json
    mira_n8n/
      index.ts              # n8n 集成插件
      tsconfig.json
```
