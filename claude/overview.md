# 项目总览

## 项目愿景

Mira TypeScript 是一个基于 TypeScript 的 monorepo 项目，目标是构建一个**智能文件管理与自动化平台**。核心能力包括：

- 媒体文件的组织、检索、预览与管理（图片、视频、音频、文档）
- 多素材库（Library）支持，每个库拥有独立的 SQLite 数据库
- 插件化架构，支持服务端和客户端插件扩展
- 实时 WebSocket 双向通信
- Web 后台管理面板
- n8n 自动化集成
- 跨平台桌面客户端（Electron）

## 架构总览

项目采用 **pnpm workspace monorepo** 结构，分为以下层次：

- **核心层 (core)**: `mira-app-core` 提供事件管理、库列表管理、SQLite 存储实现、TypeScript SDK 等基础能力
- **服务层 (server)**: `mira-app-server` 提供 HTTP REST API + WebSocket 服务，管理素材库、插件、用户认证，内置 ThumbnailService 和 SettingsManager
- **客户端层 (client)**: `mira-client` 基于 Electron + Vue 3 的桌面客户端
- **管理面板 (dashboard)**: `mira-dashboard-next` 基于 shadcn-vue + Tailwind CSS 4 的 Web 管理后台
- **工具**: `mira-scripts-core` 数据迁移/导入脚本工具集
- **文档**: `mira-doc` VitePress 驱动的项目文档站
- **插件**: 服务端插件集合（mira_thumb、mira_n8n、mira_thumb_imagemagick、mira_duplicate_scanner）

## 技术栈

| 层次 | 技术 |
|------|------|
| 语言 | TypeScript (strict mode) |
| 服务端 | Express 4 + ws + SQLite3 |
| 客户端 | Electron 38 + Vue 3.5 + Pinia 3 |
| 管理面板 | Vue 3.5 + shadcn-vue 2.7 + Tailwind CSS 4 |
| 构建 | Vite 6 + TypeScript 5.7 |
| 文档 | VitePress 2.0 |
| 包管理 | pnpm workspace |

## 模块依赖关系

```
mira-app-core (核心)
  ├── mira-app-server (服务端) ── 依赖 core
  ├── mira-client (客户端) ── 依赖 core
  ├── mira-scripts-core (工具) ── 依赖 core
  └── 插件 (mira_thumb, mira_n8n, ...) ── 依赖 server + core

mira-dashboard-next (管理面板) ── 调用 server API
```

## 源代码统计

| 模块 | 文件数 | 代码行数 |
|------|--------|----------|
| mira-app-core | ~28 | ~2,000+ (含 storage/sqlite + shared/sdk) |
| mira-app-server | ~35 | ~7,400 |
| mira-client | ~220+ | ~10,000+ (含 Vue 组件) |
| mira-dashboard-next | ~60+ | ~3,000+ |
| 插件 | ~8 | ~850 |
| mira-scripts-core | ~4 | ~500 |
| mira-doc | ~12 | Markdown |
