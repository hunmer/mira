[根目录](../../CLAUDE.md) > [packages](..) > **n8n-nodes-mira-ws-trigger**

# n8n-nodes-mira-ws-trigger

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 增量更新 | 补充节点参数、重连机制、消息格式详情 |
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

n8n 社区节点包，提供 Mira WebSocket Trigger 节点。允许 n8n 工作流实时监听 Mira 服务端的 WebSocket 事件（通过 `mira_n8n` 插件的独立 WebSocket 服务器），实现自动化流程触发。

## 入口与启动

- **入口文件**: `index.ts`
- **节点实现**: `nodes/MiraWebSocketTrigger/MiraWebSocketTrigger.node.ts` (247 行)
- **构建命令**: `tsc && npm run copy-assets`
- **发布**: npm (MIT)

## 对外接口

### n8n 节点参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | string | `ws://127.0.0.1:7457` | Mira WebSocket 端点 URL |
| `token` | string (password) | -- | 认证 Token |
| `eventFilter` | string | -- | 事件过滤（逗号分隔，留空监听全部） |
| `reconnectInitialMs` | number | 1000 | 重连初始延迟(ms) |
| `reconnectMaxMs` | number | 30000 | 重连最大延迟(ms) |
| `enableDebug` | boolean | false | 调试日志 |

### 消息格式

节点将接收到的消息标准化输出：

```json
{
  "eventName": "file::created",
  "data": { ... },
  "timestamp": "2026-05-25T...",
  "source": "mira_websocket"
}
```

### 重连机制

- 指数退避重连：从 `reconnectInitialMs` 开始，每次翻倍，最大不超过 `reconnectMaxMs`
- 连接成功后重置退避延迟

## 关键依赖与配置

- **运行时依赖**: `ws` (^8.18.3)
- **peer 依赖**: `n8n-core` (^1.14.1), `n8n-workflow` (^1.82.0)
- **开发依赖**: `typescript`, `@types/ws`, `@types/node`
- **Node**: >= 18

## 测试与质量

当前无独立测试。

## 相关文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `index.ts` | 1 | 包入口 |
| `nodes/MiraWebSocketTrigger/MiraWebSocketTrigger.node.ts` | 247 | 触发器节点实现 |
| `nodes/MiraWebSocketTrigger/*.json` | -- | 节点配置 |
| `nodes/MiraWebSocketTrigger/*.svg` | -- | 节点图标 |
| `package.json` | -- | 包配置 (v0.1.3, MIT) |
