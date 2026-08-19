# 交接文档：mira_tiptap_format — Notion 风格文档编辑器插件

> 生成日期：2026-08-19
> 范围：`plugins/plugins/mira_tiptap_format/web`（不含 bug 修复过程记录）

## 一、项目情况

### 背景与定位

Mira 是一个媒体库管理 monorepo（Electron 客户端 + Node 服务端 + 插件体系）。本次工作将其中的 **Tiptap 文档编辑器插件**（`plugins/plugins/mira_tiptap_format`）升级为 **Notion 风格的块编辑器**：编辑、自动保存 `.tiptap` JSON 文档到素材库，UI 采用 **shadcn-vue**（reka-ui + Tailwind CSS v4 + cva + lucide 图标），交互参考 tiptap 官方 Notion-like 模板与 `G:\agent_spaces\packages\web\src\components\common\editors\notion-editor.tsx`。

### 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Vue 3.5 SFC（`<script setup>` + TS） |
| 编辑器 | tiptap v2.27（StarterKit + Underline/Link/TextStyle/Color/Highlight/TextAlign/TaskList/TaskItem/Typography/Placeholder） |
| UI 体系 | shadcn-vue 自移植组件（reka-ui 原语），Tailwind v4（`@tailwindcss/vite`）+ `tw-animate-css`，oklch 设计令牌（浅色默认、预留 `.dark`） |
| 服务交互 | `mira-app-core` SDK（MiraClient：writeFile / uploadFile / getFilesByExtension / download / libraries / folders） |
| 构建 | Vite 6，`build: vite build`（**vue-tsc 未纳入构建**：reka-ui 缺失 `vue-component-type-helpers` 类型依赖导致类型检查不可用，与 `mira_3d_format` 插件的处理一致） |

### 架构要点

```
web/src/
├── lib/utils.ts                      # cn()
├── composables/useEditorVersion.ts   # tiptap v2 useEditor 不订阅 transaction，
│                                     # 以版本号驱动工具栏 isActive/can 刷新
├── components/ui/                    # shadcn-vue 组件（button / dropdown-menu /
│                                     # popover / menubar / separator / input）
└── components/editor/
    ├── EditorToolbar.vue      # Menubar「文件」(打开文件 Ctrl+O / 另存为 Ctrl+S) +
    │                          # 居中格式组 + 右侧保存
    ├── SlashCommandMenu.vue   # '/' 命令菜单：onUpdate 检测光标前 '/'，钉在 '/' 处，
    │                          # 三分组（基本块/列表/高级），capture 键盘导航
    ├── DragHandle.vue         # 常显 '+/⋮⋮' 把手：跟随鼠标所在块、transaction 后贴齐；
    │                          # 原生 HTML5 拖拽重排块（capture 拦截 PM 默认拖放）
    ├── TextBubbleMenu.vue     # 选中文本的浮动工具栏（turn-into/标记/颜色/对齐/链接）
    ├── LinkEditorMenu.vue     # 光标落入链接时的编辑气泡
    ├── OutlinePanel.vue       # 固定右上角的文档大纲：折叠/展开、章节滚动定位、
    │                          # 当前章节高亮
    ├── DocumentIconPicker.vue # 标题左侧 emoji 图标（50 精选）
    ├── CoverBanner.vue        # 封面背景层（12 渐变预设 + 图片 URL，渐变遮罩保可读）
    ├── OpenFileDialog.vue     # 打开文档列表弹窗（按修改时间倒序）
    ├── block-options.ts       # turn-into / 色板 / 对齐 的共享数据与命令
    └── extensions/notion-behaviors.ts  # TrailingNode（文末空段，不入 undo 历史）
                                        # + NotionKeyboard（空块 Backspace 降级为段落）
```

**布局模型**：顶部 sticky 工具栏 → 灰底滚动区 → 白色编辑卡片（`pl-24` 容纳把手，右上角宽/居中切换）→ fixed 大纲浮层。宽屏模式右缘以大纲为界（`w-[calc(100%-16rem)]`），偏好存 localStorage。

**持久化模型**：文档 JSON 顶层附加 `title` / `icon` / `cover` 三个元字段（tiptap `setContent` 会忽略未知顶层字段，向后兼容旧文档）；已有 fileId 时 700ms 防抖 `writeFile` 覆盖保存；另存为经 `mira-plugin-ui` 的 `SaveLocationDialog`（共享包，未做 shadcn 化）。大标题联动默认文件名。

**Notion 行为集**：`/` 命令菜单、块拖拽重排、`+` 插块并唤起命令菜单、选中浮动工具栏、链接气泡、粘贴纯 URL 到选区自动成链、文末空段、空标题 Backspace 降级、点击空白聚焦文末、markdown 输入规则（`#`/`>`/```/`---` 等，Typography 扩展）。

### 构建与运行

```bash
cd plugins/plugins/mira_tiptap_format/web
npm run build     # 产物 dist/，由插件 index.js 经 openPluginWindow 打开
```

插件在客户端以独立窗口运行（1100×820），URL 参数注入 `libraryId/fileId/fileUrl/token/apiBaseUrl`。

## 二、未来可扩展功能

### 编辑器能力
- **图片块**：粘贴/拖入图片 → 经 MiraClient 上传至素材库 → 插入图片节点（参考 tiptap 模板的 image-upload-node，需处理上传进度与失败态）。
- **代码块语法高亮**：接入 `lowlight` + `@tiptap/extension-code-block-lowlight`，附语言选择下拉。
- **表格**：`@tiptap/extension-table` 系列与 Notion 式表格工具栏。
- **块右键菜单**：把手长按/右键弹出「复制块 / 删除 / 转为」（模板的 drag-context-menu）。
- **多选块拖拽**、把手在长块内跟随鼠标 Y 吸附。
- **emoji 选择器 / @提及**：tiptap cloud 付费扩展的开源替代（自维护数据源 + Suggestion）。
- **数学公式**（KaTeX）。

### 文档管理与同步
- **Markdown 双向转换**：导入 .md（`marked`/`turndown`）与导出 .md/HTML/PDF。
- **版本历史**：利用服务端文件能力做快照与回滚。
- **多窗口/多标签同步**：BroadcastChannel 广播文档更新。
- **最近打开列表**：localStorage 记录，置于打开文件弹窗顶部。
- **跨素材库浏览**：打开文件弹窗增加库切换与搜索过滤。

### 大纲与导航
- 折叠状态随文档持久化；支持 H4+；章节拖拽排序。
- 大纲自动隐藏（窄屏/宽屏下与内容冲突时）。

### 视觉与体验
- 深色模式接入（令牌已就绪，缺切换入口与 `dark` class 挂载）。
- 封面支持本地上传（存素材库）；标题/正文字体主题（sans/serif/mono，参考 notion-editor.tsx 的 theme prop）。
- 宽屏模式同步放大字号/行距。

### 工程质量
- **代码分割**：当前单 chunk 677KB（gzip 217KB），可按编辑器/组件库拆分。
- **启用类型检查**：待 reka-ui 修复 `vue-component-type-helpers` 依赖后恢复 `vue-tsc -b`。
- `SaveLocationDialog`（mira-plugin-ui 共享包）shadcn 化（影响其他格式插件，需单独评估）。

## 三、建议调用的技能（suggested skills）

| 场景 | 技能 |
|---|---|
| 继续移植 React/shadcn 组件为 Vue SFC | `port-react-to-vue` |
| 服务端/服务器进程管理与日志 | `procm-mcp` |
| 通过 CLI 管理库、文件、插件 | `mira-cli` |
| 新增/迁移格式类插件 | `mira-format-plugin-migration` |
| 涉及 server API 与 SDK 覆盖时 | `mira-sdk-coverage-audit` |

## 四、关键参考

- 插件入口：`plugins/plugins/mira_tiptap_format/index.ts`、`web/index.js`（贡献点注册 + 开窗）
- 参考实现：`G:\agent_spaces\packages\web\src\components\common\editors\notion-editor.tsx`、`markdown-editor.tsx`
- 同类先例（Tailwind/shadcn 结构来源）：`plugins/plugins/mira_3d_format/web`
- tiptap Notion-like 模板文档：https://tiptap.dev/docs/ui-components/templates/notion-like-editor
