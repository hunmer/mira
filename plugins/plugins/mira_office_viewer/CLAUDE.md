# mira_office_viewer

Office 文档预览插件(v1.0.0,2026-10 落库,协议 B)。用 vue-office 预览 docx/xlsx/pptx/pdf 文件;服务端零依赖纯声明,预览逻辑全在 `web/` SPA。

## 约定

- 协议 B:`init(inst)` 调 `registerFileFormat('mira_office_viewer', handler)`,一次注册 4 种格式(docx/xlsx/pptx/pdf,含各自 mimeTypes),**无缩略图**
- **per-viewer 过滤**:该插件率先使用 viewers[] 内的 `extensions`/`mimeTypes` 字段——4 个 viewer 共享 `entry: viewer.html` 但各只声明一种扩展(`mira-office-docx/xlsx/pptx/pdf`,priority 20)
- 服务端 `main: index.ts`(同 mira_tiptap_format,不经 dist 构建,ServerPluginManager 直接加载 TS 源);服务端零 npm 依赖(devDependencies 仅 @types/node + typescript)
- `web/` 是独立 Vite 工程(自带 package.json,`vite build` 产 `web/dist/`):Vue 3.5 + `@vue-office/{docx,excel,pptx,pdf}`(v3 入口,动态 import 按格式懒加载)+ vite 8 + TypeScript 7;`web/viewer.html` 只引 `dist/assets/index.{css,js}`
- `web/index.js`(32 行)客户端注册脚本:拼跳 `viewer.html` 并透传 `fileId/fileUrl/fileName/format` 查询参数
- server 运行时注册表默认 enabled=true,path 回指仓库 `../../../../plugins/plugins/mira_office_viewer`

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,61 行:4 格式 + 4 viewer 声明 |
| `web/src/main.js` | SPA 入口:按 `format` 查询参数懒加载对应 vue-office 组件 |
| `web/viewer.html` + `web/dist/` | 预览壳页与构建产物(git 不跟踪 dist/node_modules) |
| `web/index.js` + `web/plugin.json` | 客户端注册脚本与 manifest(pluginId `d4e5f607-…`,permissions `["ui","dom"]`) |
| `test.js` | 自测脚本 |
| `web/package.json` | SPA 依赖(vue-office 四件套) |

## 扫描状态

- **更新时间**: 2026-11-21(首建文档,基线 bc638a73 后新增)
- **已扫描**: index.ts 全文、web/src/main.js 结构、双注册表条目
- **未深扫**: vue-office 组件加载与渲染细节
