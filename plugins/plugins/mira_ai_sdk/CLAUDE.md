# mira_ai_sdk

通用 AI 服务商网关深度插件(v1.0.0,2026-08-23 新增,默认 enabled)。管理多个 **OpenAI 兼容服务商**(baseUrl/apiKey/模型列表),基于 `ai` + `@ai-sdk/openai-compatible` 提供流式聊天与图片生成 API;附带「AI 图片生成器」`web/` SPA(文生图/图生图/蒙版重绘)与 dashboard 内嵌的管理组件。**16 个插件中唯一带 runtime npm 依赖的深度插件**。

## 约定

- 协议 A 深度插件(不 `extends ServerPlugin`),`init(inst)` 注册 11 条路由(前缀 `/ai-sdk`):`presets/{list,models,refresh}`、`providers/{list,create,update,delete,default,test}`(list 返回脱敏 apiKey)、`POST /chat`(流式)、`POST /image/generate`
- Provider 数据持久化在 `{pluginDir}/data/providers.json`(**运行时生成,不在 git**;`.gitignore` 忽略 `plugins/plugins/*/data/`),Store 结构 `{ providers: [...], defaultProviderId }`
- `presets.json`(根目录,626KB)是 models.dev 预设目录快照(README 称 167 服务商/5900+ 模型),`scripts/fetch-presets.mjs` 刷新
- `components/AiSdkManager.js`(690 行,IIFE):向 `window.MiraPluginComponents` 注册,复用 `window.MiraDashboardUI` 在 dashboard 内嵌「AI 测试」大对话框(聊天 + 生图合并 Tabs;内联 style,因插件模板不在 dashboard Tailwind 扫描范围)
- `web/` SPA(pluginId `18a04e8d-...`,名「AI 图片生成器」):参考图经 MediaPickerDialog 取素材库,结果经 BatchUploadDialog 回库;依赖 mira-app-core、mira-plugin-ui、vue、@lucide/vue

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,571 行:11 条路由、Provider CRUD/测试、chat 流式、图片生成 |
| `components/AiSdkManager.js` | dashboard 内嵌管理/测试组件(纯 JS IIFE) |
| `data/providers.json` | 运行时 Provider 存储(git 忽略);`data/images/` 存生成图 |
| `presets.json` + `scripts/fetch-presets.mjs` | 模型预设目录快照与刷新脚本 |
| `web/src/App.vue`、`web/src/components/MaskEditor.vue` | AI 图片生成器 SPA 与蒙版编辑器 |
| `web/src/lib/{i18n,server}.ts` | 国际化/服务端调用 |
| `README.md` / `HANDOFF.md` | 使用说明与交接记录 |

## 扫描状态

- **更新时间**: 2026-08-25(首建文档)
- **已扫描**: index.ts 全文、AiSdkManager.js 结构、presets/providers 数据结构、web/ 结构、注册表(enabled,installedAt 2026-08-23)
- **基线以来变更**: 08-24 AiSdkManager.js 重构(聊天/生图两卡片合并为「AI 测试」Dialog+Tabs)、小修;`data/providers.json` 从 git 移除(运行时数据去 git 化)
- **未深扫**: chat/image 生成的完整 prompt 与流式协议细节
