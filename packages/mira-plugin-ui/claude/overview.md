# mira-plugin-ui 概览

## 定位

Mira 插件共享 UI 组件库（`mira-plugin-ui`，v1.1.0，private）。为无法携带完整前端工程的环境（浏览器扩展、server web 插件页面、任意 HTML 页面）提供一套**自包含**的 Vue 3 组件：构建产物 dist 同时包含 JS（ESM + UMD）与编译好的 CSS（含 oklch token 与内联 material-icons 字体），只有 `vue` 是 external，reka-ui / motion-v / tailwind 运行时全部打进 bundle，可经 CDN 直接引入，不依赖宿主页面的组件库。

## 三层结构

1. **`src/components/ui/`（68 个组件目录 / 376 个 .vue）**：shadcn-vue 官方 registry 源码（style `new-york`，Tailwind v4，底层 reka-ui）+ 自有扩展块（questionnaire、message/message-scroller、bubble、attachment、item、marker、icon-picker、stepper、combobox、empty、field、tags-input 等）。**只增不改、禁止手写包装**（曾因 `v-bind="props"` 透传 `undefined` 键导致 Select 无法展开，见 FAQ）。官方组件经 `demo/fetch-registry.mjs` 从 shadcn-vue 官方 registry 批量拉取（08-20~08-21 补齐至 67；2026-11 新增 `draggable/`，仅 `export * from 'vue-draggable-plus'` 转发）。
2. **`src/` 顶层业务组件（6 个 .vue）**：`BatchUploadDialog` / `BatchUploadForm` / `FileInfoForm` / `SaveLocationDialog` / `SaveLocationForm` / `DeviceListPicker`，只组合官方组件实现上传/保存/设备选择流程。
3. **`src/library/` 媒体库组件族（15 个 .vue + 10 个 ts）**：经独立子入口 `mira-plugin-ui/library` 以**源码**消费（不引入 tailwind.css），宿主需自带 tailwind 环境与 shadcn token。覆盖：素材浏览（MediaBrowser 网格/瀑布流 + MediaWaterfall + MediaDetail）、选择器（MediaPickerDialog）、三栏整合（MediaLibraryView）、筛选（FilterBar + SavedFilterDialog + filterBar 规则函数）、树体系（LibraryTree/Tree/Select/CreateNodeDialog/ContextMenu/Dropzone + 默认拖放上传 defaultDropUpload）、服务器管理（ServerManagerView/Dialog + serverAuth）。组件不直接访问数据源，由宿主注入 `services` / `dialog` / `upload` 接口。

## 包级 i18n（2026-11 新增）

`src/i18n.ts`（631 行）是全包文案单例：zh/en 双语扁平 key 字典 + `{x}` 插值，**不依赖 vue-i18n**。初始语言探测 `window.mira.app.locale` → `navigator.language` → zh；`setLocale()` 切换即时生效。两层文案机制：

- library 系列组件：传 `t` prop（vue-i18n 的 t 等）即接管，缺 key 回退内置词典（`src/library/i18n.ts` 仅剩兜底转发 `createLibraryTreeT`）；
- 顶层业务组件：文案缺省走内置 i18n，`title` / `submitText` 等文案 props 覆盖。

宿主监听 `window.mira.onLocaleChanged` 调一次 `setLocale` 即全局生效（README 有完整文档）。

## 消费方（grep 实测，2026-11-21）

源码 import 9 处：

| 消费方 | 依赖方式 | 使用入口 |
|--------|----------|----------|
| `packages/mira-browser-extension` | `workspace:*` | `mira-plugin-ui/library`（LibraryTree/LibraryTreeView/LibrarySelect/ServerManagerDialog/ContextMenu + tree 工具 + hooks）；另直引 `mira-plugin-ui/src/BatchUploadForm.vue`、`src/BatchUploadDialog.vue` |
| `plugins/plugins/mira_tiptap_format/web` | `file:` 链接 | 根入口 `{ SaveLocationDialog }` + `mira-plugin-ui/mira-plugin-ui.css` |
| `packages/mira-cep-panel` | `workspace:*` | `MediaLibraryView` 三栏（PS 内 CEP 面板） |
| `plugins/plugins/mira_image_cropper` / `mira_format_converter` / `mira_ai_sdk` 的 `web/` | 各自声明 | 插件窗口 SPA（裁切/转换/AI 应用） |
| `online_client_plugins/plugins/` 的 `mira-video-editor` / `image-search` / `mira-whiteboard` | 各自声明 | 客户端插件市场 |

另 1 处 CDN 形态：`packages/mira-app-server/public/pair.html`（设备配对页）加载 `public/vendor/mira-plugin-ui.umd.js + .css`，由 `mira-app-server/scripts/copy-plugin-ui.mjs` 从本包 dist 拷贝——改本包后需重跑该脚本同步。

## 技术栈

Vue 3.5 + TypeScript 5.8 + Vite 6 库模式 + Tailwind CSS v4（`@tailwindcss/vite`）+ reka-ui + motion-v + @lucide/vue + vue-draggable-plus（draggable 转发）。样式规则由仓库根 `ui_rule.md` 约束（原子类、shadcn token、禁自定义语义变量、禁手写 scoped CSS）。

## 开发/验证

- `pnpm --filter mira-plugin-ui dev`：demo 页（`demo/App.vue`），经 vite 代理 `/mira-api -> 127.0.0.1:8081` 连接真实 server，用 mira-app-core SDK 实测组件；demo 已覆盖 locale 切换、树排序五模式循环切换、tree/tiles 视图切换、fileDrop 自定义拖放回调。
- `pnpm --filter mira-plugin-ui build`：产出 `dist/mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css`。无自动化测试、无 type-check 脚本（见 testing-and-quality.md）。
