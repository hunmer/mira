# 项目总览

## 项目愿景

Mira TypeScript 是一个基于 TypeScript 的 monorepo 项目,目标是构建一个**新时代的素材管理软件**。核心能力:

- 媒体文件的组织、检索、预览与管理(图片、视频、音频、文档)
- 多素材库(Library)支持,每个库拥有独立的 SQLite 数据库
- 插件化架构,支持服务端和客户端插件扩展
- 实时 WebSocket 双向通信
- Web 后台管理面板
- n8n 自动化集成
- 跨平台桌面客户端(Electron)

## 架构分层

pnpm workspace monorepo,分为以下层次:

- **核心层** `mira-app-core`(v2.0.1):事件管理、库列表管理、SQLite 存储实现、TypeScript SDK、共享类型
- **服务层** `mira-app-server`(v2.0.1):HTTP REST API + WebSocket、素材库管理、插件、用户认证、内置 ThumbnailService / SettingsManager
- **客户端层** `mira-client`(v1.0.5):Electron 38 + Vue 3.5 桌面客户端,当前正在完成 shadcn-vue 迁移(见各包 CLAUDE.md)
- **管理面板** `mira-dashboard-next`(v0.0.0):Vue 3.5 + shadcn-vue 2.7 + Tailwind v4 Web 后台
- **工具** `mira-scripts-core`(v1.0.5):数据迁移/导入 CLI
- **文档** `mira-doc`(v1.0.0):VitePress 文档站
- **插件** `plugins/`:服务端插件集合(mira_n8n、mira_thumb_imagemagick、mira_duplicate_scanner)

## 技术栈

| 层次 | 技术 |
|------|------|
| 语言 | TypeScript(strict mode) |
| 服务端 | Express 4 + ws/socket.io + SQLite3 + fluent-ffmpeg |
| 客户端 | Electron 38 + Vue 3.5 + Pinia 3 + Tailwind v4 + shadcn-vue(reka-ui) |
| 管理面板 | Vue 3.5 + shadcn-vue 2.7 + Tailwind CSS 4 |
| 构建 | Vite 6 + TypeScript 5.7 |
| 文档 | VitePress 2.0-alpha |
| 包管理 | pnpm workspace(无 turbo/nx/lerna) |

## 模块依赖关系

```
mira-app-core (核心)
  ├── mira-app-server (服务端) ── 依赖 core
  ├── mira-client (客户端) ── 依赖 core (workspace:*)
  ├── mira-scripts-core (工具) ── 依赖 core
  └── 插件 (mira_n8n, mira_thumb_imagemagick, ...) ── 依赖 server + core

mira-dashboard-next (管理面板) ── 调用 server API
```

## 工作区配置注意

`pnpm-workspace.yaml` 中仍列出 `packages/mira-server-sdk-examples` 与 `packages/n8n-nodes-mira-ws-trigger`,但**两者在磁盘上已不存在**(陈旧条目)。实际可用的 workspace 包为 6 个。
