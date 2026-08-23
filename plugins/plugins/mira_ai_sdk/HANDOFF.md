# mira_ai_sdk 插件交接文档

> 生成时间：2026-08-23。供后续 agent 接手开发使用。

## 插件定位

基于 Vercel AI SDK（`ai@7` + `@ai-sdk/openai-compatible`）的通用 AI 网关插件：
- 多 OpenAI 兼容服务商管理（名称 / Base URL / API Key / 模型列表）
- models.dev 预设目录（167 服务商 / 5900+ 模型，`presets.json`）
- 测试连接、默认服务商
- AI 聊天 API（非流式 + 流式），支持已保存服务商或请求自带 baseUrl/apiKey 直连
- 图片生成 API（`ai@7` 的 `generateImage` + openai-compatible 的 `imageModel`），参数设计参考 [iplanwebsites/ai-image](https://github.com/iplanwebsites/ai-image)；结果写入 `data/images/` 并返回经 `/api/plugins/{libraryId}/mira_ai_sdk/data/images/<file>` 静态路由访问的 URL；支持文生图与图生图（`images`/`mask` 参数走 `/v1/images/edits`）

## 文件结构

```
plugins/plugins/mira_ai_sdk/
  index.ts            # 服务端源码 → tsc → dist/
  components/AiSdkManager.js   # Dashboard 页面（字符串模板 Vue 组件）
  scripts/fetch-presets.mjs    # 下载/转换 models.dev 目录 → presets.json
  presets.json         # 预设数据（612KB，随插件分发）
  data/providers.json  # 运行时服务商配置（含真实 apiKey，勿提交/外传）
  data/images/         # 图片生成结果落盘目录
  web/                 # 客户端插件 + AI 图片生成器 SPA（Vite + mira-plugin-ui 源码消费）
    plugin.json / index.js   # 宿主脚本：右侧栏贡献 + 媒体右键菜单「AI 生成 / 编辑」
    src/App.vue / components/MaskEditor.vue / lib/server.ts
    dist/              # vite build 产物，经 /server-plugins/<lib>/mira_ai_sdk/dist/ 托管
  README.md            # API 文档
  HANDOFF.md           # 本文档
```

## HTTP API（全部需 Bearer token + libraryId）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-sdk/providers/list` | 列表（apiKey 打码） |
| POST | `/api/ai-sdk/providers/create` | 创建 |
| POST | `/api/ai-sdk/providers/update` | 更新（apiKey 留空/掩码则保留） |
| POST | `/api/ai-sdk/providers/delete` | 删除 |
| POST | `/api/ai-sdk/providers/default` | 设默认 |
| POST | `/api/ai-sdk/providers/test` | 测试连接 |
| GET | `/api/ai-sdk/presets/list` | 预设服务商摘要 |
| POST | `/api/ai-sdk/presets/models` | 预设模型列表 `{id}` |
| POST | `/api/ai-sdk/presets/refresh` | 重拉 models.dev（spawn 脚本，120s 超时） |
| POST | `/api/ai-sdk/chat` | 聊天；`{baseUrl, apiKey?, model, messages}` 直连 或 `{providerId?, model?, messages, stream?}` |
| POST | `/api/ai-sdk/image/generate` | 图片生成；同 chat 的服务商解析，`{prompt, n?, size?, seed?, providerOptions?, images?, mask?, returnBase64?}` |

默认账号 admin/admin123 可拿 token（`POST /api/auth/login`）。libraryId 如 `1779810479725`。

## 已完成

1. 插件骨架 + 服务商 CRUD + 测试连接 + 聊天（流式/非流式）
2. Dashboard 页面 `/tools/ai-sdk`：Empty 居中空态、服务商卡片、Combobox 预设选择、模型 TagsInput、聊天测试面板（流式）
3. models.dev 预设下载脚本与数据、预设三接口、选中预设自动填充模型 tags
4. chat API 直连模式（自带 baseUrl/apiKey）
5. 修复聊天界面不更新的 BUG（Vue3 响应式，见下）
6. 图片生成：`/ai-sdk/image/generate`（文生图 + 图生图）、Dashboard 图片生成面板（data URL 预览，因静态路由需 Bearer、`<img>` 无法携带；支持本地上传最多 4 张参考图触发编辑模式）；已用 mock 服务端到端验证（含落盘与静态访问）
7. AI 图片生成器 web SPA（`web/`）：文生图/图生图/蒙版画笔（MaskEditor 导出透明区 PNG）/素材库选参考图（MediaPickerDialog）/生成结果勾选批量入库（BatchUploadDialog + /api/files/upload）；宿主脚本注册右侧栏贡献与媒体右键菜单「AI 生成 / 编辑」（?media= 传参考图）。构建 `cd web && pnpm build`；`/api/plugins/web` 清单在 server 启动时快照，新增/修改 web/plugin.json 后需重启 server

## 关键坑（务必了解）

1. **HttpRouter 同一 path 只支持一种 method**（`packages/mira-app-server/src/routes/HttpRouter.ts` 的 `registerRounter`）：第二次注册同 path 会覆盖 handler 且不建 express 路由，静默 404/行为错乱。所有路由用独立 path（如 `/providers/list` 而非 GET+POST 共用 `/providers`）。
2. **插件需双注册**：`plugins/plugins/plugins.json`（安装目录清单）和 `packages/mira-app-server/src/plugins/plugins.json`（dev 模式实际读取，path 用相对路径 `../../../../plugins/plugins/mira_ai_sdk`）。
3. **Vue3 响应式**：字符串模板组件里 push 进数组后的消息，更新必须走 `this.chatMessages[index].xxx`（响应式代理），不能持有原始对象引用直接改（不触发渲染，表现为界面卡加载中）。
4. **改宿主 Dashboard 后需构建**：`pluginRuntime.ts` 变更后执行 `cd packages/mira-app-server && pnpm run build:dashboard`（构建 mira-dashboard-next 并拷贝到 dist/dashboard）。插件自身的 components/*.js 与 dist/ 是静态托管实时读盘，改完即生效（server 不用重启；但 index.ts 改动需 tsc + 重启 server）。
5. **本机网络需代理访问 models.dev**：直连超时，`http://127.0.0.1:7890` 可用。`fetch-presets.mjs` 支持 `HTTPS_PROXY`（需 `npm i -D undici`）或 `--input 本地api.json` 转换。
6. **静态插件文件路由需 Bearer**（`middleware/permission.ts` 仅公开插件 icon）：图片生成的前端预览用 `returnBase64: true` + data URL，不要指望裸 `<img src>`。
7. **openai-compatible imageModel 的限制**：`seed`/`aspectRatio` 不透传（SDK 记为 unsupported warning）；`providerOptions` 以服务商名为键展开进请求 body；返回只认 `b64_json`（`url` 字段不解析）。

## MiraDashboardUI 已暴露组件（pluginRuntime.ts）

Badge/Button/Card 系列/ScrollArea/Select 系列/Separator/Dialog 系列/Input/Label/Progress/Textarea/Table 系列/Tabs 系列/LibraryTreeSelect + 本插件开发中新增：**Combobox 系列（10 个）、TagsInput 系列（5 个）**。空态 Empty 未暴露，插件内用局部组件复刻了样式。

## 验证方法

```bash
# 登录取 token
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.accessToken))")

# 流式聊天（真实服务商，data/providers.json 中已有 DeepSeek 配置）
curl -s -N -X POST http://localhost:8081/api/ai-sdk/chat -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"libraryId":"1779810479725","model":"deepseek-chat","messages":[{"role":"user","content":"你好"}],"stream":true}'
```

端到端测试可在 `/tmp` 写 mock OpenAI 兼容 SSE 服务（`/v1/chat/completions` 返回标准 OpenAI chunk 格式），创建指向它的临时 provider 验证后删除。

服务器进程管理用 procm-mcp（mira-app-server-dev，改宿主/dashboard 后 restart）。

## 待办 / 后续优化

- 直连模式加用量统计或审计
- 前端聊天区加「临时直连」开关（复用 baseUrl 直连 API）
- tags input 加 `delimiter=","` 支持逗号粘贴批量添加
- refresh 预设在需代理的服务器环境会失败（spawn 子进程不继承 HTTPS_PROXY 的 undici 代理逻辑，可把代理配置进插件设置）
- Empty/更多组件可考虑从 pluginRuntime 整体导出，减少宿主改动
- 图片生成：静态路由对 png/jpg 返回正确 Content-Type（当前 text/plain，`<img>` 可正常渲染但直接下载体验差）；生成历史管理（data/images/ 会持续累积）
- AI 图片生成器 SPA：结果会话级保存（刷新丢失）；蒙版编辑器可加橡皮擦/撤销；参考图超 4MB 时可提示压缩

## Suggested skills

- `ai-sdk`：任何涉及 AI SDK API 的改动前必读（版本迭代快，勿凭记忆写代码，读 `node_modules/ai/docs/`）
- `procm-mcp`：服务器重启与日志查看
- `mira-cli`：CLI 方式管理库/插件
