[根目录](../../CLAUDE.md) > [packages](..) > **n8n-nodes-mira-ws-trigger**

# n8n-nodes-mira-ws-trigger

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

n8n 社区节点包，提供 Mira WebSocket Trigger 节点。允许 n8n 工作流实时监听 Mira 服务端的 WebSocket 事件，实现自动化流程触发。

## 入口与启动

- **入口文件**: `index.ts`
- **节点实现**: `nodes/MiraWebSocketTrigger/MiraWebSocketTrigger.node.ts`
- **构建命令**: `tsc && npm run copy-assets`
- **发布**: npm (MIT)

## 对外接口

### n8n 节点注册

```json
{
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": ["dist/nodes/MiraWebSocketTrigger/MiraWebSocketTrigger.node.js"]
  }
}
```

节点连接到 Mira WebSocket 服务器，将接收到的实时事件作为 n8n 工作流的触发器。

## 关键依赖与配置

- **运行时依赖**: `ws` (^8.18.3)
- **peer 依赖**: `n8n-core` (^1.14.1), `n8n-workflow` (^1.82.0)
- **开发依赖**: `typescript`, `@types/ws`, `@types/node`
- **Node**: >= 18

## 测试与质量

当前无独立测试。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `index.ts` | 包入口 |
| `nodes/MiraWebSocketTrigger/MiraWebSocketTrigger.node.ts` | 触发器节点实现 |
| `nodes/MiraWebSocketTrigger/*.json` | 节点配置 |
| `nodes/MiraWebSocketTrigger/*.svg` | 节点图标 |
| `package.json` | 包配置 (v0.1.3, MIT) |
