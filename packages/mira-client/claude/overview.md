# mira-client 总览

## 模块定位

Mira 桌面媒体库管理客户端,基于 Electron + Vue 3 + TypeScript。包名 `mira-web`,版本 1.0.5。通过 `mira-app-core` 的 SDK(`mira-app-core/workspace:*`)与服务端通信,提供媒体文件的整理、查看、搜索、管理与插件扩展。

## 核心能力

1. **媒体浏览/预览/管理** — 图片、视频、音频、文档预览(plyr / viewerjs / v-viewer)
2. **插件系统** — 客户端插件加载、沙箱执行(经 `online_client_plugins/` 索引)
3. **Tab 导航** — 基于视图的标签页系统(TabRegistry + TabTypes)
4. **全局搜索** — 跨库搜索(独立 search-window)
5. **文件上传** — 拖拽上传、FilePond
6. **多服务器管理** — ServerListStore 管理多个服务端连接
7. **多窗口** — 主窗口、浮动窗口、通知窗口、搜索窗口

## 多进程 / 多窗口架构

| 进程/窗口 | 目录 | 职责 |
|-----------|------|------|
| 主进程 | `src/main/` | MiraApplication 单例:窗口管理、IPC、自定义协议 `mira://`、托盘、自动更新 |
| 渲染进程 | `src/renderer/` | Vue 3 SPA,Pinia 状态,插件系统,主 UI |
| 预加载 | `src/preload/` | contextBridge 安全桥梁 |
| 浮动窗口 | `src/floating-window/` | 浮动小窗(含 vendor/) |
| 通知窗口 | `src/notification-window/` | 系统级通知窗口 |
| 搜索窗口 | `src/search-window/` | 全局搜索窗口 |
| 共享 | `src/shared/` `src/types/` | 跨进程类型 |
| UI 库 | `src/components/ui/` | shadcn-vue 基础组件库(34 目录) |
| 工具 | `src/lib/` | `cn()` 等通用工具 |

## UI 技术栈(迁移后)

| 维度 | 现状 |
|------|------|
| 框架 | Vue 3.5.13(`<script setup>`,`__VUE_OPTIONS_API__: true` 双模式) |
| 样式 | Tailwind **v4**(4.0.17),`@import "tailwindcss"` + `@theme inline`,无 v3 老指令 |
| UI 库 | **shadcn-vue**(style `new-york`,baseColor `neutral`,cssVariables,icon `lucide`),34 个基础组件 |
| 无头层 | **reka-ui ^2.9.7**(230 处 import,全部封装在 `src/components/ui/*` 内) |
| 旧库 | element-plus / naive / ant-design-vue:**0 引用**;自研 `volt/`:**已删除** |
| 残留 | 仅 2 处 `radix-vue` 直引待清理(`PopoverComponent.vue`、`MediaListComponent.vue`) |

## 重要设计取舍

- **主题源是 `src/renderer/assets/main.css`,不是 `tailwind.config.js`**。后者是 Tailwind v3 遗留死文件,未被任何 vite/postcss 引用,不要在其中改样式。
- SCSS 体系与 Tailwind 并存:`vite.renderer.config.ts` 全局注入 `assets/scss/variables.scss` 与 `mixins.scss`,非迁移阻塞项。
- 安全模型:Context Isolation 启用、Node Integration 禁用,所有能力经 preload 的 `contextBridge.exposeInMainWorld` 暴露。
