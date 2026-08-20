# mira-plugin-ui 概览

## 定位

Mira 插件共享 UI 组件库（`mira-plugin-ui`，v1.1.0，private）。为无法携带完整前端工程的环境（浏览器扩展、server web 插件页面、任意 HTML 页面）提供一套**自包含**的 Vue 3 组件：构建产物 dist 同时包含 JS（ESM + UMD）与编译好的 CSS（含 oklch token 与内联 material-icons 字体），只有 `vue` 是 external，reka-ui / motion-v / tailwind 运行时全部打进 bundle，可经 CDN 直接引入，不依赖宿主页面的组件库。

## 三层结构

1. **`src/components/ui/`（13 个基础组件族）**：shadcn-vue 官方 registry 源码（style `new-york`，Tailwind v4，底层 reka-ui）。**只增不改、禁止手写包装**（曾因 `v-bind="props"` 透传 `undefined` 键导致 Select 无法展开，见 FAQ）。
2. **`src/` 顶层业务组件**：`BatchUploadDialog` / `BatchUploadForm` / `FileInfoForm` / `SaveLocationDialog` / `SaveLocationForm`，只组合官方组件实现上传/保存流程。
3. **`src/library/` 素材库树体系**：经独立子入口 `mira-plugin-ui/library` 以**源码**消费（不引入 tailwind.css），宿主需自带 tailwind 环境与 shadcn token。组件不直接访问数据源（background 桥 / SDK / fetch），由宿主注入 `services` / `dialog` / `upload` 三类接口。

## 消费方（grep 确认）

| 消费方 | 依赖方式 | 使用入口 |
|--------|----------|----------|
| `packages/mira-browser-extension` | `workspace:*` | `mira-plugin-ui/library`（LibraryTree/LibraryTreeView/LibrarySelect/ServerManagerDialog/ContextMenu + tree 工具 + hooks）；另直引 `mira-plugin-ui/src/BatchUploadForm.vue`、`src/BatchUploadDialog.vue` |
| `plugins/plugins/mira_tiptap_format/web` | `file:` 链接 | 根入口 `{ SaveLocationDialog }` + `mira-plugin-ui/mira-plugin-ui.css` |

## 技术栈

Vue 3.5 + TypeScript 5.8 + Vite 6 库模式 + Tailwind CSS v4（`@tailwindcss/vite`）+ reka-ui + motion-v + @lucide/vue。样式规则由仓库根 `ui_rule.md` 约束（原子类、shadcn token、禁自定义语义变量、禁手写 scoped CSS）。

## 开发/验证

- `pnpm --filter mira-plugin-ui dev`：demo 页（`demo/App.vue`），经 vite 代理 `/mira-api -> 127.0.0.1:8081` 连接真实 server，用 mira-app-core SDK 实测组件。
- `pnpm --filter mira-plugin-ui build`：产出 `dist/mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css`。无自动化测试、无 type-check 脚本（见 testing-and-quality.md）。
