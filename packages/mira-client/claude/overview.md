# mira-client 总览

## 模块定位

Mira 桌面媒体库管理客户端,基于 Electron + Vue 3 + TypeScript。包名 `mira-web`,版本 3.0.2。通过 `mira-app-core` 的 SDK(`mira-app-core/workspace:*`)与服务端通信,提供媒体文件的整理、查看、搜索、管理与插件扩展。

## 核心能力

1. **媒体浏览/预览/管理** — 图片、视频、音频、文档预览(plyr / viewerjs / v-viewer);v3.0.2 新增 document 类别预览(pdf/office 走缩略图)与文本预览(txt/md/json/xml/csv/log,≤100KB,md 经 MdPreview + sanitizeHtml)
2. **插件系统** — 客户端插件加载、沙箱执行(经 `online_client_plugins/` 索引);插件窗口可申请**受控执行**白名单命令(PluginExecHandlers:ffmpeg/ffprobe/scenedetect)+ plugin-fs 文件原语(为视频剪辑器类插件服务);v3.0.2:插件 fetch API 新增 `authPost`(自动附登录态)、`window.pluginSystem` 全局注册(instanceManager.ts)、FilterBar 可消费插件 `filterSearchProviders` 做**语义搜索过滤**、PluginContributionBar 插件贡献图标条(拖拽排序/popover/弹簧分页)
3. **Tab 导航** — 基于视图的标签页系统(TabRegistry + TabTypes);含 Webview 标签页(WebviewTabView + FaviconCacheService)
4. **全局搜索** — 跨库搜索(独立 search-window)
5. **文件上传** — 上传收进 FileUploadDialog(独立 `/upload` 页面已于 v3.0.2 删除):限额设置化(uploadMax* 三项)、同名跳过、哈希查重、文件夹/URL 导入、UploadQueueDialog 批次队列(实时进度+重试)、本地库绝对路径导入(importLocalFilePath,免重传);URL 导入(UrlImportDialog)
6. **多服务器管理** — ServerListStore 管理多个服务端连接;主进程含服务端控制/部署 IPC(server-control/server-deploy)
7. **多窗口** — 主窗口(支持按库独立多开)、悬浮球窗口、通知窗口(同屏数量可设 1-10)、搜索窗口、截图窗口
8. **Home 仪表盘** — grid-layout-plus 拖拽卡片布局(dashboardLayout store + CardRegistry + tabs/dashboard/cards/ 卡片体系)
9. **类型化事件总线 miraEventBus** — `services/EventBus.ts`(event-emitter-adv),MiraEventMap 14 种事件,v3.0.2 起 18 个文件从 window.dispatchEvent(CustomEvent) 迁移至此
10. **字体动作** — FontActionService(fontkit):激活系统字体/推送 Adobe(PS/AI/ID),经 `plugin-window:font-action` IPC 仅对 mira-font-actions 插件开放

## 多进程 / 多窗口架构

| 进程/窗口 | 目录 | 职责 |
|-----------|------|------|
| 主进程 | `src/main/` | MiraApplication 单例:窗口管理、IPC(19 个 Handler,handlers.ts 实例化计)、自定义协议 `mira://`、托盘、自动更新、主进程 i18n |
| 渲染进程 | `src/renderer/` | Vue 3 SPA,Pinia 状态,插件系统,主 UI,procm-ui-tests |
| 预加载 | `src/preload/` | contextBridge 安全桥梁 |
| 悬浮球窗口 | `src/floating-ball-window/` | 桌面悬浮球(FloatingBallApp.vue,v2.x 新增) |
| 浮动窗口(残留) | `src/floating-window/` | 仅剩 `bridge.ts`,独立构建体系(vendor/core.js/floating-window.html/build:float)已移除 |
| 通知窗口 | `src/notification-window/` | 系统级通知窗口 |
| 搜索窗口 | `src/search-window/` | 全局搜索窗口 |
| 截图窗口 | `src/screenshot-window/` | 屏幕截图采集(08-20 后新增:main.ts + style.css + `screenshot-window.html`,配合 ScreenshotHandlers 的 captureDisplay/detectVisibleWindows/complete/cancel) |
| 共享 | `src/shared/` `src/types/` | 跨进程类型 |
| UI 库 | `src/components/ui/` | shadcn-vue 基础组件库(60 目录) |
| 工具 | `src/lib/` | `cn()` 等通用工具 |

## UI 技术栈(迁移后)

| 维度 | 现状 |
|------|------|
| 框架 | Vue 3.5.13(`<script setup>`,`__VUE_OPTIONS_API__: true` 双模式) |
| 样式 | Tailwind **v4**(4.0.17),`@import "tailwindcss"` + `@theme inline`,无 v3 老指令;**SCSS 体系已整体删除**(0 处 `lang="scss"`) |
| UI 库 | **shadcn-vue**(style `new-york`,baseColor `neutral`,cssVariables,icon `lucide`),60 个组件目录(2026-08-05 为 34,08-20 为 52,08-25 为 58,11-21 为 60:+attachment/dropzone/interactive-hover-button/spinner/terminal-view,后 +images-badge/pagination/scrollbar,-chapter-scrubber) |
| 无头层 | **reka-ui**(全部封装在 `src/components/ui/*` 内) |
| 旧库 | element-plus / naive / ant-design-vue:**0 引用**;自研 `volt/`:**已删除** |
| i18n | 渲染进程 vue-i18n ^11.4.4(`renderer/i18n/`,zh-CN/en-US);主进程自带轻量字典(`main/i18n/`,托盘菜单文案) |
| 残留 | 仅 2 处 `radix-vue` 直引待清理(`PopoverComponent.vue`、`MediaListComponent.vue`) |

## 重要设计取舍

- **主题源是 `src/renderer/assets/main.css`,不是 `tailwind.config.js`**。后者是 Tailwind v3 遗留死文件,未被任何 vite/postcss 引用,不要在其中改样式。
- SCSS 已删,但 `vite.renderer.config.ts` 的 `css.preprocessorOptions.scss.additionalData` 仍注入已不存在的 `assets/scss/variables.scss`/`mixins.scss`(残留死配置,待清理)。
- 安全模型:Context Isolation 启用、Node Integration 禁用,所有能力经 preload 的 `contextBridge.exposeInMainWorld` 暴露。
- 主进程 `main.ts` 已瘦身为 323 行,窗口管理等职责拆到 `services/MainWindowService.ts` 等服务。
