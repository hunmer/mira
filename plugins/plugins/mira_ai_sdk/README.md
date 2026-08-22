# mira_ai_sdk

通用 AI SDK 网关插件：基于 [Vercel AI SDK](https://ai-sdk.dev)（`ai` + `@ai-sdk/openai-compatible`）管理多个 OpenAI 兼容服务商，并提供统一的 AI 聊天 API。

## 功能

- 多服务商管理：名称、Base URL、API Key、模型列表，持久化在插件 `data/providers.json`
- 默认服务商：聊天接口不传 `providerId` 时使用默认服务商
- 测试连接：对指定服务商发起一次最小化 `generateText` 调用，返回延迟与回复
- AI 聊天 API：支持普通与流式（chunked text stream）两种模式
- Dashboard 页面：`/tools/ai-sdk`（工具分组），可视化增删改服务商、测试连接、聊天测试

## HTTP API

所有请求需携带 `Authorization: Bearer <token>`，且带 `libraryId`（body 或 query）。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-sdk/providers/list` | 服务商列表（apiKey 打码） |
| POST | `/api/ai-sdk/providers/create` | 创建 `{ name, baseUrl, apiKey, models, setDefault? }` |
| POST | `/api/ai-sdk/providers/update` | 更新 `{ id, name?, baseUrl?, apiKey?, models? }`，apiKey 留空保持不变 |
| POST | `/api/ai-sdk/providers/delete` | 删除 `{ id }` |
| POST | `/api/ai-sdk/providers/default` | 设为默认 `{ id }` |
| POST | `/api/ai-sdk/providers/test` | 测试连接 `{ id, model? }` |
| POST | `/api/ai-sdk/chat` | 聊天 `{ providerId?, model?, messages: [{role, content}], stream? }` |

`stream: false`（默认）返回 `{ success, text, usage }`；`stream: true` 返回 `text/plain` 流。

## 聊天示例

```bash
curl -N -X POST http://localhost:8081/api/ai-sdk/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "libraryId": "<libraryId>",
    "providerId": "<可选，默认用默认服务商>",
    "model": "deepseek-chat",
    "messages": [{ "role": "user", "content": "你好" }],
    "stream": true
  }'
```

## 构建

```bash
cd plugins/plugins/mira_ai_sdk
npm install
npm run build
```
