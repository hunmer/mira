[根目录](../../../CLAUDE.md) > [plugins](../../CLAUDE.md) > [plugins](..) > **mira_n8n**

# mira_n8n

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 初始化 | 深度扫描后生成模块文档 |

## 模块职责

n8n 集成插件。通过独立的 WebSocket 服务器将 Mira 事件转发到 n8n 工作流，实现自动化触发。

核心功能：
- 启动独立的 WebSocket 服务器（默认端口 7457）
- 配置管理：Webhook 列表（标题、事件列表、Token）
- Token 验证：连接时通过 URL 参数 `?token=xxx` 验证
- 事件过滤：按 Webhook 配置的事件列表过滤
- 自动重连支持（客户端侧指数退避）

## 入口与启动

- **入口文件**: `index.ts` -- 导出 `init(inst): MiraN8N` 工厂函数
- 由 `ServerPluginManager` 在素材库加载时自动实例化
- 初始化时加载配置，启动独立 WebSocket 服务器

## 对外接口

### HTTP 路由

| 路径 | 方法 | 说明 |
|------|------|------|
| `/n8n/list` | GET | 获取所有 Webhook 配置 |
| `/n8n/list` | POST | 添加新的 Webhook 配置 |
| `/n8n/list/:id` | DELETE | 删除指定 Webhook 配置 |

### WebSocket 服务器

- 端口：7457（可通过配置修改）
- 连接：`ws://host:7457?token=xxx`
- 消息格式：`{ eventName, data, timestamp, source, libraryId }`

### 默认配置

```json
{
  "port": 7457,
  "list": {
    "1": {
      "title": "test",
      "events": ["file::created"],
      "token": "token1"
    }
  }
}
```

## 关键依赖与配置

- `ws`: WebSocket 服务器（来自 mira-app-server）
- `mira-app-core`: EventManager 事件订阅

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `index.ts` | 插件主实现 (290 行) |
| `package.json` | 包配置 (v1.0.9) |
