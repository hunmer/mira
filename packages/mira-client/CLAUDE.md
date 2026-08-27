# mira-client

Electron 桌面客户端(包名 `mira-web`,v3.0.1)。基于 Vue 3.5 + TypeScript + Electron 38 构建,提供媒体文件的整理、查看、搜索、管理与插件扩展。多窗口架构(主/悬浮球/通知/搜索/截图,**支持按库独立多开窗口**),自定义协议 `mira://`,通过 `mira-app-core` SDK 与服务端通信。

> **UI 体系**:shadcn-vue(style `new-york`,Tailwind v4,底层 reka-ui),`src/components/ui/` 基础组件现为 **58** 个目录。v3.0 新增:**设备间分享**(DeviceShareDialog + WS 二进制传输 + FileSharePanel)、Eslint 9 flat config、`test:split-tabs` node 纯函数测试、媒体 Tab 区块注册表;08-23 后重构:HomeView 侧边栏拆分(886 行→8 文件)、LocalFolderTabView 拆分(13 子文件)、设置分区 10→7(新 ExtensionsPanel)。详见 [claude/overview.md](claude/overview.md)。

## 约定的规则

- Vue 3 Composition API(`<script setup>`),Pinia 3(15 个 Store)
- **UI 只用 `@/components/ui/*`(shadcn-vue)**:禁用原生控件、禁用直接 import reka-ui、禁用 `volt/` 与 `--mira-*` 变量
- Electron:Context Isolation 启用,Node Integration 禁用,IPC 经 `contextBridge` 暴露
- Tab 系统基于 TabRegistry + TabTypes + `tabs/` 目录
- 改样式改 `src/renderer/assets/main.css`,**不要**改 `tailwind.config.js`(v3 死文件);SCSS 体系与 vite 残留注入已全部清理
- 开发:`pnpm run electron:dev`;门禁:`pnpm run type-check` + `pnpm run test:ui:remote <name>`(procm 远程 UI 测试,仅开发构建可用)+ `pnpm run test:split-tabs`(node --test 分屏/媒体 Tab 纯函数)
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
| UI 组件库 | [src/components/ui/CLAUDE.md](src/components/ui/CLAUDE.md) | 58 个 shadcn-vue 组件 + 迁移说明 |

## 扫描状态

- **版本**: 3.0.1(08-23 基线以来 44 个提交、201 个文件变更,提交信息均为 "fix")
- **更新时间**: 2026-08-25(分支 main)
- **本次更新(2026-08-25)**:
  - **设备间分享全链路**:`components/business/DeviceShareDialog/`(6 文件,587 行主对话框含二维码配对、binaryTransfer.ts 387 行 WS 二进制流、useDeviceTransfers)+ `composables/useDeviceShare` + `views/settings/FileSharePanel` + ui 新增 attachment/dropzone;services/WebSocketService 二进制帧支持;依赖 +qrcode
  - **HomeView 侧边栏拆分**(2b30ff6d):SidebarModuleList 886→341 行,拆出 SidebarHeaderActions/SidebarImportToolbar/SidebarLocalFilesModule/SidebarModuleSection/SidebarShortcutsModule + useSidebarCollapse/useSidebarImportMenu
  - **MediaTabListView**:`tabSections.ts` 区块注册表(顺序/显隐经 SortableLayoutDialog + LibraryPrefs)+ mediaTabRuntime 纯函数(node --test,新 `test:split-tabs` 脚本);LocalFolderTabView 拆分(967→464 行 + 13 子文件,`tabs/CLAUDE.md` 已随代码更新)
  - **ui 53→58 目录**(+attachment/dropzone/interactive-hover-button/spinner/terminal-view);**IPC handler 实为 19 个**(以 `handlers.ts` 19 处实例化计,修正此前"20"口径,本区间无新增删除);preload 仅 +`fs.getPathForFile`
  - **设置重构**:分区 10→7(general/library/notifications/extensions/plugins/network/data),新 ExtensionsPanel(聚合截图/悬浮球/浏览器/文件分享)与 FileSharePanel,删 ImportPanel 与 ServerControlDialog
  - **工程**:ESLint 9 flat config(`.eslintrc.js` 删除);`build` 加 `--max-old-space-size=5120` 防 OOM;`grid-layout-plus` npm→`@hunmer/grid-layout-plus` workspace;procm-mcp-sdk 改 npm 包;新增 `mira-app-server`(.cmd/.ps1) 启动 shim;main.ts 按库多开窗口(openLibraryWindow);stores 仍 15 个;composables +useDeployPipeline/useDeviceShare/useDirectImport
- **已扫描**: package.json、全目录结构、ui/stores/ipc/services/composables 清单、i18n key 组、git 变更聚合
- **未深扫**: 各 Handler/Store/View 实现体、`claude/overview·file-map·module-responsibilities` 未逐节重写(遗留待下次)
- **已知技术债**: 2 处 radix-vue 直引;33 个预存 TS6133(08-20 时点,flat config 迁移后待复测)
