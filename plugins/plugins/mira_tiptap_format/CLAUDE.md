# mira_tiptap_format

Tiptap JSON 文档格式插件（`.tiptap`）。服务端（index.ts，51 行）注册格式处理器与预览查看器，本身零运行时依赖；重量在前端 `web/`——一个 Notion 风格的 Vue 3 + Tiptap 文档编辑器，经 `MiraClient` 直连 server API 读写文档并自动保存。

## 约定

- 协议 B（`registerFileFormat`）：handler id `mira-tiptap`，扩展名 `tiptap`，MIME `application/vnd.mira.tiptap+json`
- 无缩略图；`process` 仅校验 Tiptap JSON 文档结构（`type === 'doc'` + `content[]`），返回 `{ format, type, nodeCount }`
- viewer：`mira-tiptap-editor`，entry `dist/index.html`，priority 20；`getQuery` 注入 `libraryId/fileId/fileUrl/apiBaseUrl/token`
- web/ 由 vite 构建（`web/package.json` 的 `build`），依赖 `@tiptap/vue-3` 全家桶、`mira-plugin-ui`、`mira-app-core`、`reka-ui`、`tailwind-merge`
- 服务端入口 `main: index.ts`（不经 tsc 预构建，无 dist 依赖）

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 服务端 handler / viewer / web 前端结构 | 改格式注册或编辑器 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 | 看历史 |

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（51 行）：registerFileFormat + process + viewer 声明 |
| `package.json` | v1.0.0，server 端零依赖 |
| `web/index.js` | 客户端插件注册脚本（pluginSystem contribution：open-editor 独立窗口 1100x820） |
| `web/plugin.json` | 客户端 manifest（pluginId f4a8c6d2-…，permissions ui/dom/storage） |
| `web/src/App.vue` | 编辑器主组件：URL 参数初始化 MiraClient、新建/打开/另存、防抖自动保存 |
| `web/src/components/editor/` | EditorToolbar、SlashCommandMenu、TextBubbleMenu、LinkEditorMenu、OutlinePanel、CoverBanner、DocumentIconPicker、DragHandle、OpenFileDialog、block-options、slash-command、extensions/notion-behaviors |
| `web/src/components/ui/` | button / dropdown-menu / input / menubar / popover / separator 基础组件 |

## 扫描状态

- 版本：1.0.0（server 与 web 一致）
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、web/index.js、web/src/App.vue 头部、block-options.ts 头部、目录结构（web/ 共 85 个文件）
- 未扫描：web/src 其余组件实现细节、composables/useEditorVersion、lib/utils
