# mira_ai_sdk

通用 AI SDK 网关插件：基于 [Vercel AI SDK](https://ai-sdk.dev)（`ai` + `@ai-sdk/openai-compatible`）管理多个 OpenAI 兼容服务商，并提供统一的 AI 聊天 API。

## 功能

- 多服务商管理：名称、Base URL、API Key、模型列表，持久化在插件 `data/providers.json`
- 内置预设目录：来自 [models.dev](https://models.dev) 的 167 个服务商 / 5900+ 模型（`presets.json`），新建时可搜索选择并一键导入模型列表
- 默认服务商：聊天接口不传 `providerId` 时使用默认服务商
- 测试连接：对指定服务商发起一次最小化 `generateText` 调用，返回延迟与回复
- AI 聊天 API：支持普通与流式（chunked text stream）两种模式
- 图片生成 API：文生图 + 图生图（`images` 参数），结果落盘 `data/images/` 并返回访问 URL
- Dashboard 页面：`/tools/ai-sdk`（工具分组），可视化增删改服务商、测试连接、聊天测试、图片生成

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
| GET | `/api/ai-sdk/presets/list` | 预设服务商目录（models.dev） |
| POST | `/api/ai-sdk/presets/models` | 预设服务商的模型列表 `{ id }` |
| POST | `/api/ai-sdk/presets/refresh` | 从 models.dev 重新拉取预设目录 |
| POST | `/api/ai-sdk/chat` | 聊天 `{ providerId?, model?, messages: [{role, content}], stream? }`，或自提供 `{ baseUrl, apiKey?, model, messages, stream?, name? }` 直连 |
| POST | `/api/ai-sdk/image/generate` | 图片生成（参数见下） |

`stream: false`（默认）返回 `{ success, text, usage }`；`stream: true` 返回 `text/plain` 流。

自带 baseUrl 直连（无需预先创建服务商，apiKey 可省略以适配本地 Ollama / LM Studio 等）：

```bash
curl -X POST http://localhost:8081/api/ai-sdk/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "libraryId": "<libraryId>",
    "baseUrl": "https://api.deepseek.com/v1",
    "apiKey": "sk-...",
    "model": "deepseek-chat",
    "messages": [{ "role": "user", "content": "你好" }]
  }'
```

## 图片生成

`POST /api/ai-sdk/image/generate`（接口设计参考 [ai-image](https://github.com/iplanwebsites/ai-image)），走 OpenAI 兼容的 `/v1/images/generations`，服务商解析与聊天接口一致（`providerId` / 默认服务商，或自带 `baseUrl` + `apiKey` 直连）：

| 参数 | 类型 | 说明 |
|------|------|------|
| `prompt` | string | 必填，图片描述 |
| `providerId` / `baseUrl` + `apiKey` + `model` | - | 二选一，同聊天接口 |
| `n` | number | 生成数量，1-10，默认 1 |
| `size` | string | `{width}x{height}`，如 `1024x1024`，缺省由服务商决定 |
| `seed` | number | 可选；多数 OpenAI 兼容服务商不支持，会以 warnings 返回 |
| `providerOptions` | object | 可选，透传服务商特定参数（如 `{ "自定义": { "quality": "high" } }`，键为服务商名） |
| `images` | string[] | 可选，base64 数组（支持 data URL）；传入时走图片编辑 `/v1/images/edits` |
| `mask` | string | 可选，base64 蒙版，配合 `images` 使用 |
| `returnBase64` | boolean | 默认 false；true 时每张图附 `base64` 字段（前端预览用） |

结果自动保存到插件 `data/images/`，响应：

```json
{
  "success": true,
  "providerName": "...", "model": "...", "elapsed": 5200,
  "images": [
    { "url": "plugins/<libraryId>/mira_ai_sdk/data/images/xxx.png", "file": "data/images/xxx.png", "mediaType": "image/png" }
  ],
  "warnings": [], "usage": { "totalTokens": 1 }
}
```

`url` 为相对 API 根（`/api`）的路径，携带 token 以 `GET /api/<url>` 获取文件。

```bash
curl -X POST http://localhost:8081/api/ai-sdk/image/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "libraryId": "<libraryId>",
    "providerId": "<可选，默认用默认服务商>",
    "model": "doubao-seedream-4-0",
    "prompt": "A cat on a roof, watercolor style",
    "n": 1,
    "size": "1024x1024",
    "returnBase64": true
  }'
```

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

## AI 图片生成器（web/）

`web/` 是随本插件分发的客户端插件 + 独立 Vite SPA（shadcn-vue，源码消费 `mira-plugin-ui`，同 `mira_image_cropper/web` 模式）：

- **入口**：Mira 客户端连接素材库后，右侧栏出现「AI 图片生成器」贡献图标；媒体右键菜单「AI 生成 / 编辑」把选中图片作为参考图打开窗口
- **功能**：文生图、图生图（参考图 = 本地上传 + `MediaPickerDialog` 从素材库多选）、蒙版重绘（画笔涂抹导出透明区 PNG，走 `/images/edits` 的 mask）、生成结果勾选后经 `BatchUploadDialog` 一键导入素材库
- **构建**：

```bash
cd plugins/plugins/mira_ai_sdk/web
pnpm install && pnpm build   # 产物 web/dist/，server 经 /server-plugins/<lib>/mira_ai_sdk/dist/ 托管
```

- 浏览器调试：`http://localhost:8081/server-plugins/<libraryId>/mira_ai_sdk/dist/index.html?server=<server>&token=<token>&libraryId=<libraryId>`

## 构建

```bash
cd plugins/plugins/mira_ai_sdk
npm install
npm run build
```

## 更新预设目录

预设数据精简自 <https://models.dev/api.json>，保存为插件根目录 `presets.json`。可在页面对话框中点「更新预设目录」，或在插件目录执行（需要代理时设置 `HTTPS_PROXY`，可选安装 `npm i -D undici` 启用代理支持）：

```bash
npm run fetch-presets                 # 在线拉取
npm run fetch-presets -- --input a.json  # 转换已下载的 api.json
```
