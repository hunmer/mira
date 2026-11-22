# mira-client

Electron 桌面客户端(包名 `mira-web`,v3.0.2)。基于 Vue 3.5 + TypeScript + Electron 38 构建,提供媒体文件的整理、查看、搜索、管理与插件扩展。多窗口架构(主/悬浮球/通知/搜索/截图,**支持按库独立多开窗口**),自定义协议 `mira://`,通过 `mira-app-core` SDK 与服务端通信。

> **UI 体系**:shadcn-vue(style `new-york`,Tailwind v4,底层 reka-ui),`src/components/ui/` 基础组件现为 **60** 个目录。v3.0.2 新增:**语义搜索过滤器**(插件 provider)、**上传重构**(设置化上传限额/查重/队列对话框/本地路径导入)、**类型化事件总线 miraEventBus**(取代 window.dispatchEvent)、字体激活(FontActionService)、通知窗口同屏数量设置、文档/文本预览、`/upload` 页面移除(上传收进对话框)。v3.0.1:设备间分享、HomeView 侧边栏拆分、LocalFolderTabView 拆分、设置分区 10→7。详见 [claude/overview.md](claude/overview.md)。

## 约定的规则

- Vue 3 Composition API(`<script setup>`),Pinia 3(15 个 Store)
- **UI 只用 `@/components/ui/*`(shadcn-vue)**:禁用原生控件、禁用直接 import reka-ui、禁用 `volt/` 与 `--mira-*` 变量
- Electron:Context Isolation 启用,Node Integration 禁用,IPC 经 `contextBridge` 暴露
- Tab 系统基于 TabRegistry + TabTypes + `tabs/` 目录
- 改样式改 `src/renderer/assets/main.css`,**不要**改 `tailwind.config.js`(v3 死文件);SCSS 体系与 vite 残留注入已全部清理
- 渲染进程跨组件事件用类型化 `miraEventBus`(`services/EventBus.ts`,MiraEventMap),**不要**再 `window.dispatchEvent(new CustomEvent(...))`
- 开发:`pnpm run electron:dev`;门禁:`pnpm run type-check` + `pnpm run lint`(v3.0.2 起 `test:ui:remote`/`test:split-tabs` 脚本已从 package.json 移除;node 纯函数测试文件仍在,可 `node --experimental-strip-types --test <file>` 直跑)
- ESLint 9 flat config(`eslint.config.mjs`):`pnpm run lint` / `lint:fix`
- 更多约定见 [claude/conventions.md](claude/conventions.md)

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 架构、多窗口、UI 技术栈、迁移现状 | 首次了解模块 |
| [claude/conventions.md](claude/conventions.md) | UI/编码/安全约定 + 全部命令 | 改代码前 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 各目录职责、子模块文档链接 | 定位子模块 |
| [claude/entrypoints.md](claude/entrypoints.md) | 入口、三段构建、启动流程 | 运行/构建 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | Store、IPC 通道、Views、Tab 系统 | 对接内部接口 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖版本、components.json、配置文件 | 排查依赖 |
| [claude/data-model.md](claude/data-model.md) | 运行时状态、Tab、IPC 消息、共享类型 | 状态层改动 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | type-check/lint/分析工具、质量风险 | 质量评估 |
| [claude/file-map.md](claude/file-map.md) | 完整目录与文件清单 | 找文件 |
| [claude/faq.md](claude/faq.md) | 样式/动画/迁移/IPC 常见问题 | 遇到坑 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 子模块文档

| 模块 | 文档 | 说明 |
|------|------|------|
| 主进程 | [src/main/CLAUDE.md](src/main/CLAUDE.md) | MiraApplication、IPC、协议、托盘 |
| 预加载 | [src/preload/CLAUDE.md](src/preload/CLAUDE.md) | contextBridge 安全 API |
| 渲染进程 | [src/renderer/CLAUDE.md](src/renderer/CLAUDE.md) | Vue 3 SPA、Pinia、插件 |
| 共享类型 | [src/shared/CLAUDE.md](src/shared/CLAUDE.md) | 跨进程类型 |
| UI 组件库 | [src/components/ui/CLAUDE.md](src/components/ui/CLAUDE.md) | 60 个 shadcn-vue 组件 + 迁移说明 |

## 扫描状态

- **版本**: 3.0.2(bc638a73/08-25 基线以来 132 个文件变更、提交信息均为 "fix",以 diff 取证)
- **更新时间**: 2026-11-21(分支 main;上次扫描 2026-08-25,详见 claude/changelog.md)
- **本次更新(2026-11-21,v3.0.1→v3.0.2)**:
  - **语义搜索过滤器**:FilterBar 接入插件 `filterSearchProviders`(`plugins/instanceManager.ts` 注册到 `window.pluginSystem`),命中 `semanticFileIds` → `filters.ids` + `sort='ids'`(stores/media.ts);日期过滤支持 imported/fileCreated 双模式 + 快捷区间
  - **上传重构**:`/upload` 路由与 `FileUploadView.vue` 删除,上传全部收进 FileUploadDialog;限额设置化(settings store `uploadMax*` 三项 + LibraryPanel UI)、待传列表分页(200/页,ui 新 pagination)、同名跳过/哈希查重对话框、文件夹导入与 URL 导入入口、`UploadQueueDialog`(批次分组+实时进度+重试);SDK 侧 `uploadFile` 返回 `duplicate`、新增 `importLocalFilePath`(本地库按绝对路径导入,免重传字节)
  - **类型化事件总线**:新 `services/EventBus.ts`(event-emitter-adv,`MiraEventMap` 14 种事件,on/off/emit/emitAsync 带 weight),18 个文件从 `window.dispatchEvent(CustomEvent)` 迁移(stores/library、home modules、MediaTabListView、WebSocketService 等)
  - **字体动作**:主进程新 `services/FontActionService.ts`(fontkit 读元数据;activate 装系统字体/applyToAdobe 推 PS·AI·ID),经 `plugin-window:font-action` IPC 暴露且**仅限 mira-font-actions 插件**(ID 6c444c09)调用;依赖 +fontkit
  - **通知窗口**:同屏最大数量设置(1-10,`maxVisibleNotifications` + `notification:set-max-visible` IPC 即时下发),NotificationWindowApp 动态分页
  - **预览增强**:MediaPreviewContent 新 document 类别(pdf/office 缩略图)与文本预览(txt/md/json/xml/csv/log ≤100KB,md 经 MdPreview+sanitizeHtml);`ReleaseNotes.vue`(md-editor-v3 渲染更新日志,App 更新对话框/AboutDialog)
  - **ui 58→60 目录**:+images-badge、+pagination、+scrollbar(scrollbar-but-cooler 移植,吸收合并 chapter-scrubber 后者删除);**IPC handler 仍 19 个**(handlers.ts 实例化;另有 PluginHandler/DragDropHandler 两个单数 Handler,FloatingWindowHandler 为悬浮窗基类模板非独立注册);stores 仍 15 个(auth 新增 `reauthenticate` 401 自动重登,SDK 配 `onUnauthorized` 回调)
  - **其他**:HomeView PluginContributionBar 重写(插件贡献图标条,拖拽排序+popover 行为+分页弹簧滑动);文件夹树 SVG 分支线(useBranchLines)+「收入文件夹」飞入动画(useFolderCollect/FolderCollectOverlay,motion-v);窗口还原改为 1200x800 居中(AppHandlers);PluginService 新 `authPost`(插件带登录态 POST);`docs/` 新增架构图产物(mira-client-architecture.html 1.4 万行 + .architecture.json + 4 张 visual-check PNG);依赖 +event-emitter-adv,procm-mcp-sdk 改 npm ^0.1.1;删 `test:split-tabs`/`test:ui:remote` 脚本(测试文件保留)
- **已扫描**: package.json、全目录结构、ui/stores/ipc/services 清单、新增文件逐个读码、i18n key 组、git 变更聚合
- **未深扫**: FolderTreeComponent(1001 行变更)与 FilterBar(224 行)实现体细节、docs/ 架构图生成链路
- **已知技术债**: 2 处 radix-vue 直引;33 个预存 TS6133 待复测
