# mira-cep-panel — 架构总览

## 定位

Adobe CEP 扩展面板（Photoshop 2020 / CEP 9）：在 PS 内嵌三栏界面浏览/管理 Mira 素材库（复用 `mira-plugin-ui` 的 `MediaLibraryView`），支持拖拽素材置入 PS 画布、导出活动图层为素材文件。

## 运行时形态

- 宿主：PS 的 CEF（**Chromium 61**），这决定了一切兼容性约束
- 前端：Vite 6 构建 + Vue 3.5 `<script setup>` + Tailwind 4；构建后 CSS 经 `scripts/compat-css.mjs` 降级（oklch、`@layer` 等），配 `postcss-preset-env` + `@csstools/postcss-cascade-layers`
- PS 桥：`src/cep.ts`（约 215 行）封装 `CSInterface.evalScript` ↔ `public/jsx/host.jsx`（ExtendScript：置入 place、导出活动图层、临时目录预取）
- 数据：`src/services.ts` 的 `useMira()` 用 **`MiraClient`**（`mira-app-core/shared/sdk`）直连 Mira Server；缩略图走 `/api/files/thumb/:lib/:id?token=` 直链
- polyfill：`src/polyfills.ts`（约 206 行，ResizeObserver/Array.at 等）+ `resize-observer-polyfill` 依赖

## 与其他模块关系

- 依赖 `mira-plugin-ui`（`workspace:*`）——该库 dist 自包含（仅 external vue），适合 CEP 环境
- 与 `mira-client`/`mira-browser-extension` 平级，是第 4 个 Mira 前端消费方
