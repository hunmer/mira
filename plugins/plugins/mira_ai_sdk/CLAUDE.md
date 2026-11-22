# mira_ai_sdk

通用 AI 服务商网关深度插件(v1.0.0,2026-08-23 新增,默认 enabled)。管理多个 **OpenAI 兼容服务商**(baseUrl/apiKey/模型列表),基于 `ai` + `@ai-sdk/openai-compatible` 提供流式聊天与图片生成 API;附带「AI 图片生成器」`web/` SPA(文生图/图生图/蒙版重绘)与 dashboard 内嵌的管理组件。20 个插件中带 runtime npm 依赖的两个深度插件之一(另一个是 `mira_semantic_search`)。

## 约定

- 协议 A 深度插件(不 `extends ServerPlugin`),`init(inst)` 注册 **13 条路由**(前缀 `/ai-sdk`):`presets/{list,models,refresh}`、`providers/{list,create,update,delete,default,test,default-model,default-image}`(list 返回脱敏 apiKey)、`POST /chat`(流式)、`POST /image/generate`
- Provider 数据持久化在 `{pluginDir}/data/providers.json`(**运行时生成,不在 git**;`.gitignore` 忽略 `plugins/plugins/*/data/`),Store 结构 `{ providers: [...], defaultProviderId, defaultModelId, defaultImageProviderId, defaultImageModelId }`(2026-11 起:文本默认模型与生图默认服务商/模型分离)
- `imageResponseFetch`(index.ts 自定义 fetch):归一化各 OpenAI 兼容服务商的 `/images/` JSON 响应——`base64/b64_json/b64` 字段统一为 `b64_json`、`url` 结果自动下载转 base64、容忍网关在 JSON 前后拼接的杂质文本;`createOpenAICompatible` 与生图路径均注入
- `presets.json`(根目录,626KB)是 models.dev 预设目录快照(README 称 167 服务商/5900+ 模型),`scripts/fetch-presets.mjs` 刷新
- `components/AiSdkManager.js`(744 行,IIFE):向 `window.MiraPluginComponents` 注册,复用 `window.MiraDashboardUI` 在 dashboard 内嵌「AI 测试」大对话框(聊天 + 生图合并 Tabs;内联 style,因插件模板不在 dashboard Tailwind 扫描范围);模型徽章可点击就地「设置默认文本模型/设置默认视觉模型」
- `web/` SPA(pluginId `18a04e8d-...`,名「AI 图片生成器」):参考图经 MediaPickerDialog 取素材库(支持 `mira-plugin-ui` 的 VueDraggable 拖拽排序与 DropdownMenu 菜单),结果经 BatchUploadDialog 回库;依赖 mira-app-core、mira-plugin-ui、vue、@lucide/vue;生图未选模型时回落默认生图模型

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,688 行:13 条路由、Provider CRUD/测试、默认模型管理、chat 流式、图片生成 |
| `components/AiSdkManager.js` | dashboard 内嵌管理/测试组件(纯 JS IIFE) |
| `data/providers.json` | 运行时 Provider 存储(git 忽略);`data/images/` 存生成图 |
| `presets.json` + `scripts/fetch-presets.mjs` | 模型预设目录快照与刷新脚本 |
| `web/src/App.vue`、`web/src/components/MaskEditor.vue` | AI 图片生成器 SPA 与蒙版编辑器 |
| `web/src/lib/{i18n,server}.ts` | 国际化/服务端调用 |
| `README.md` / `HANDOFF.md` | 使用说明与交接记录 |

## 扫描状态

- **更新时间**: 2026-11-21(增量,基线 bc638a73)
- **已扫描**: index.ts 全文、AiSdkManager.js 结构、presets/providers 数据结构、web/ 结构、注册表(enabled,installedAt 2026-08-23)
- **基线以来变更**: 08-24 AiSdkManager.js 重构(聊天/生图两卡片合并为「AI 测试」Dialog+Tabs)、`data/providers.json` 从 git 移除(运行时数据去 git 化);**2026-10~11**:新增默认文本/生图模型机制(路由 11→13、Store 扩 3 字段)、`imageResponseFetch` 图片响应归一化、AiSdkManager 690→744 行(模型徽章点击设默认)、App.vue 参考图拖拽排序 + DropdownMenu + 生图默认服务商记忆(index.ts 571→688 行)
- **未深扫**: chat/image 生成的完整 prompt 与流式协议细节
