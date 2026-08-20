# Mira TypeScript — 新时代的素材管理软件

Mira TypeScript 是基于 TypeScript 的 pnpm workspace monorepo,目标是构建新时代的素材管理软件。核心能力:媒体文件组织/检索/预览/管理(图片/视频/音频/3D/动画/矢量/电子书/归档)、多素材库(独立 SQLite)、**双协议插件架构**(`ServerPlugin` 基类 + `registerFileFormat` 格式注册)、实时 WebSocket、Web 管理面板、n8n 集成、跨平台 Electron 桌面客户端、Chrome 浏览器扩展采集入口、Next.js 落地页。

分层:核心库(`mira-app-core`)→ 服务端(`mira-app-server`)→ 客户端(`mira-client` mira-web,Electron + Vue 3)→ 管理面板(`mira-dashboard-next`),外加 Chrome 扩展、Flutter 移动端(`mira_mobile`)、插件共享 UI 组件库(`mira-plugin-ui`)、瀑布流/框选组件、脚本工具、VitePress 文档、落地页、服务端插件集合(14 个)。

> 当前分支:`main`。客户端 shadcn-vue 迁移已完成合并。详见 [packages/mira-client/CLAUDE.md](packages/mira-client/CLAUDE.md)。

## 约定的规则

- TypeScript strict;服务端 CommonJS,客户端 ESM;移动端为 Flutter(Dart ^3.10)
- API 统一响应 `{ code, data, message?, timestamp }`,路由前缀 `/api/`,共 19 个路由模块;SDK(mira-app-core)覆盖 17 个 API 模块,128 条 API covered 117
- **插件双协议**:旧 `extends ServerPlugin`(深度介入服务端);新 `registerFileFormat(ServerFileFormatHandler)`(声明扩展名/缩略图/查看器);均导出 `init(inst)` 工厂,注册表 `plugins/plugins/plugins.recommend.json` + 服务端运行时 `src/plugins/plugins.json`
- **客户端 UI 约定**:只用 `@/components/ui`(shadcn-vue),禁用原生控件、禁用直接 import reka-ui、禁用 `--mira-*` 变量;插件侧共享 UI 用 `mira-plugin-ui`
- Electron:Context Isolation 启用,Node Integration 禁用,IPC 经 `contextBridge` 暴露
- 浏览器扩展:跨上下文传文件必须用 `fileToStaged`;MV3 禁 eval
- 服务端 CLI 为多命令结构(`src/cli/commands/`,含 doctor),并内置 MCP 服务(`--mcp` stdio)
- 更多约定见 [claude/conventions.md](claude/conventions.md)

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 架构总览、分层、技术栈 | 首次了解项目 |
| [claude/conventions.md](claude/conventions.md) | 编码/API/插件双协议/安全约定 | 改代码前 |
| [claude/module-index.md](claude/module-index.md) | 全部模块职责 + 13 插件表 + 已移除模块 | 定位模块 |
| [claude/entrypoints.md](claude/entrypoints.md) | 入口与启动编排 | 运行/构建 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | REST/WS/SDK/IPC/CLI 聚合 | 对接接口 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖版本、配置、环境变量 | 排查依赖 |
| [claude/data-model.md](claude/data-model.md) | SQLite 实体、消息结构、客户端状态 | 数据层改动 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | 测试/lint/质量风险 | 质量评估 |
| [claude/file-map.md](claude/file-map.md) | 目录树与关键文件 | 找文件 |
| [claude/faq.md](claude/faq.md) | 常见问题定位 | 遇到坑 |
| [claude/changelog.md](claude/changelog.md) | 文档索引变更记录 | 看更新历史 |

## 模块索引

| 模块 | 版本 | 职责 | 文档 |
|------|------|------|------|
| mira-app-core | 2.0.8 | 核心库:事件、SQLite 存储、TS SDK(17 模块)、共享类型 | [packages/mira-app-core/CLAUDE.md](packages/mira-app-core/CLAUDE.md) |
| mira-app-server | 2.0.9 | 服务端:Express + WebSocket,19 路由,CLI + MCP,双协议插件管理器 | [packages/mira-app-server/CLAUDE.md](packages/mira-app-server/CLAUDE.md) |
| mira-client | 2.0.9 | Electron 桌面客户端(包名 mira-web):媒体管理、插件、Tab、i18n | [packages/mira-client/CLAUDE.md](packages/mira-client/CLAUDE.md) |
| mira-dashboard-next | 0.0.0 | Web 管理面板:Vue 3 + shadcn-vue + Tailwind 4,API 已迁移到 SDK | [packages/mira-dashboard-next/CLAUDE.md](packages/mira-dashboard-next/CLAUDE.md) |
| mira-browser-extension | 0.1.0 | Chrome MV3 扩展:网页素材采集(截图/拖拽/嗅探/批量上传) | [packages/mira-browser-extension/CLAUDE.md](packages/mira-browser-extension/CLAUDE.md) |
| mira_mobile | 1.0.0+1 | Flutter 移动端:浏览/下载/相册自动备份 | [packages/mira_mobile/CLAUDE.md](packages/mira_mobile/CLAUDE.md) |
| mira-plugin-ui | 1.1.0 | 插件共享 UI 组件库(自包含 dist,CDN 可用;被扩展/tiptap 消费) | [packages/mira-plugin-ui/CLAUDE.md](packages/mira-plugin-ui/CLAUDE.md) |
| vue-masonry | 0.1.0 | @hunmer/vue-masonry:Vue 3 瀑布流组件 | [packages/vue-masonry/CLAUDE.md](packages/vue-masonry/CLAUDE.md) |
| vue-selection-box | 0.1.0 | @hunmer/vue-selection-box:Vue 3 框选组件(被 client/plugin-ui 依赖) | [packages/vue-selection-box/CLAUDE.md](packages/vue-selection-box/CLAUDE.md) |
| landing-page | 0.1.0 | efferd-ui:Next.js 16 + React 19 官方落地页(efferd.com,静态导出) | [packages/landing-page/CLAUDE.md](packages/landing-page/CLAUDE.md) |
| mira-scripts-core | 1.0.5 | 脚本工具:数据转换、文件导入 | [packages/mira-scripts-core/CLAUDE.md](packages/mira-scripts-core/CLAUDE.md) |
| mira-doc | 1.0.0 | VitePress 文档站(部署 base /docs/) | [packages/mira-doc/CLAUDE.md](packages/mira-doc/CLAUDE.md) |
| plugins | -- | 服务端插件集合(14 个:3 旧协议 + 11 格式协议) | [plugins/CLAUDE.md](plugins/CLAUDE.md) |

```mermaid
graph TD
  core[mira-app-core] --> server[mira-app-server]
  core --> client[mira-client]
  core --> scripts[mira-scripts-core]
  core --> ext[mira-browser-extension]
  core --> dash[mira-dashboard-next]
  vmason[vue-masonry] --> client
  vsel[vue-selection-box] --> client
  vsel --> pui[mira-plugin-ui]
  pui --> ext
  server --> plugins[plugins/* 双协议]
  server -.REST/WS.-> dash
  server -.REST/WS.-> ext
  server -.REST/WS.-> mobile[mira_mobile]
```

## 扫描状态

- **更新时间**: 2026-08-20
- **分支**: main
- **已扫描**: 根目录 + 全部 12 个 packages + plugins/(14 插件全目录核对,mira_tiptap_format 深读) + online_client_plugins 概览
- **本次更新要点**(增量,基线 2026-08-11,期间约 200+ 提交):
  - 版本:core 2.0.3→2.0.8、server 2.0.3→2.0.9、client 1.0.5→2.0.9
  - **新增模块文档**:mira-plugin-ui(全新 12 文件)、vue-selection-box(轻量)、mira_mobile 补入根索引(此前遗漏)
  - client:UI 组件 34→52、IPC Handler 13→18、Store 11→15、新增 i18n/悬浮球窗口/procm-ui-tests;主进程拆分 services
  - server:CLI 扩展为 5 顶层 + 11 域子命令,新增 MCP 服务(`--mcp`);SDK 模块 10→17,覆盖率 117/128
  - plugins:13→14(+mira_tiptap_format 格式插件);mira_duplicate_scanner 已于 08-13 移除;mira_gallery_dl 补记为旧协议
  - dashboard:API 层迁移到 mira-app-core SDK;extension:src 54→101 文件
  - landing-page:shadcn registry 链整体移除,改为静态导出单页营销站
- **跳过/陈旧**: 各包 `node_modules/`、`dist/`、`build/`;mira-plugin-ui 的 80 个 shadcn 组件实现体仅结构清点
- **下一步建议**: 补 plugins/ 下其余 12 个插件的独立 `CLAUDE.md`(当前仅 mira_n8n/psd-viewer/mira_tiptap_format 有);`vite.renderer.config.ts` 残留已删 SCSS 的 additionalData 注入待清理;dashboard 的 `react-selectable-fast` 疑似遗留依赖;`.claude/index.json` 版本数据需同步
