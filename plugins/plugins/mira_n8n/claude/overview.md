# mira_n8n 总览

## 模块职责

n8n 集成插件。通过独立的 WebSocket 服务器将 Mira 事件转发到 n8n 工作流。

核心功能：
- 启动独立 WebSocket 服务器（默认端口 7457）
- 配置管理 Webhook 列表（标题、事件列表、Token）
- Token 验证：连接时 `?token=xxx`
- 事件过滤：按 Webhook 配置的事件列表过滤
- 自动重连支持（客户端侧指数退避）

## 入口

- **入口文件**: `index.ts` -- 导出 `init(inst): MiraN8N` 工厂函数
- 由 `ServerPluginManager` 在素材库加载时自动实例化

## HTTP 路由

| 路径 | 方法 | 说明 |
|------|------|------|
| `/n8n/list` | GET | 获取所有 Webhook 配置 |
| `/n8n/list` | POST | 添加新的 Webhook 配置 |
| `/n8n/list/:id` | DELETE | 删除指定 Webhook 配置 |

## 依赖

- `ws` (来自 mira-app-server)
- `mira-app-core` (EventManager)
