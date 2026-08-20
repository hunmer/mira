# mira-client

Electron 桌面客户端(包名 `mira-web`,v2.0.9)。基于 Vue 3.5 + TypeScript + Electron 38 构建,提供媒体文件的整理、查看、搜索、管理与插件扩展。多窗口架构(主/悬浮球/通知/搜索),自定义协议 `mira://`,通过 `mira-app-core` SDK 与服务端通信。

> **当前焦点**:shadcn-vue 迁移**已完成并合回 `main`**(style `new-york`,Tailwind v4,底层 reka-ui)。`volt/` 与 `--mira-*` 变量已删,`src/components/ui/` 基础组件从 34 扩到 **52** 个;SCSS 体系已整体移除。v2.x 新增:悬浮球窗口、主进程 i18n、服务端控制/部署 IPC、procm 远程 UI 测试。详见 [claude/overview.md](claude/overview.md)。

## 约定的规则

- Vue 3 Composition API(`<script setup>`),Pinia 3(15 个 Store)
- **UI 只用 `@/components/ui/*`(shadcn-vue)**:禁用原生控件、禁用直接 import reka-ui、禁用 `volt/` 与 `--mira-*` 变量
- Electron:Context Isolation 启用,Node Integration 禁用,IPC 经 `contextBridge` 暴露
- Tab 系统基于 TabRegistry + TabTypes + `tabs/` 目录
- 改样式改 `src/renderer/assets/main.css`,**不要**改 `tailwind.config.js`(v3 死文件);SCSS 已删,`vite.renderer.config.ts` 里的 scss 注入是残留死配置
- 开发:`pnpm run electron:dev`;门禁:`pnpm run type-check` + `pnpm run test:ui:remote <name>`(procm 远程 UI 测试,仅开发构建可用)
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
| UI 组件库 | [src/components/ui/CLAUDE.md](src/components/ui/CLAUDE.md) | 52 个 shadcn-vue 组件 + 迁移说明 |

## 扫描状态

- **版本**: 2.0.9(2026-08-11 以来 108 个提交、约 607 个文件变更,提交信息多为 "fix")
- **更新时间**: 2026-08-20T14:10:00+08:00(分支 main)
- **本次更新(2026-08-20)**: 版本 1.0.5→2.0.9;shadcn-vue 迁移完成合回 main,ui 组件 34→52;Store 11→15(+dashboardLayout/homeSidebarLayout/urlImport/viewHistory);主进程 IPC Handler 13→18(新增 FloatingBall/Login/Network/PluginWindow/ServerControl/ServerDeploy,删 HotUpdate),main.ts 拆分(595→323 行,新增 MainWindowService/LocalServerService/ProcmService/DownloadService+单测);新增悬浮球窗口 floating-ball-window、主/渲染进程 i18n(zh-CN/en-US,vue-i18n 11);SCSS 体系整体删除;public/ext_icons→public/icons(188 个);新增 procm-ui-tests 远程 UI 测试(`test:ui:remote`);依赖 +@hunmer/vue-selection-box(workspace)、+@testing-library/*
- **已扫描**: package.json、vite 配置、src/ 全目录结构、ui 组件清单、stores、views、router、preload IPC 通道、procm-ui-tests、main 进程结构
- **未深扫**: 各 Handler/Store/View 实现体、floating-ball/notification/search-window 内部细节、HomeView 子模块、i18n 词条覆盖
- **已知技术债**: 2 处 radix-vue 直引、dev 弹出层动画、tailwind.config.js 死文件、`vite.renderer.config.ts` 残留 scss additionalData 注入(指向已删除的 `assets/scss/*`,待清理)
