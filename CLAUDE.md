# Mira TypeScript - 智能文件管理与自动化平台

Mira TypeScript 是一个基于 TypeScript 的 monorepo 项目，目标是构建智能文件管理与自动化平台。核心能力包括媒体文件的组织/检索/预览/管理、多素材库支持（独立 SQLite）、插件化架构、实时 WebSocket 通信、Web 管理面板、n8n 自动化集成，以及跨平台桌面客户端（Electron）。

项目采用 pnpm workspace monorepo 结构，分为核心层（mira-app-core，含 SQLite 存储和 SDK）、服务层（mira-app-server）、客户端层（mira-client Electron）、管理面板（mira-dashboard-next）、工具（mira-scripts-core）和插件集合。

## 约定

- TypeScript strict mode；服务端 CommonJS，客户端 ESM
- API 统一响应格式 `{ code, data, message?, timestamp }`
- 插件必须导出 `init(inst)` 工厂函数，继承 `ServerPlugin`
- Vue 3 Composition API (`<script setup>`)；组件使用现有组件库组件
- Electron: Context Isolation 启用，Node Integration 禁用

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 项目总览、架构、技术栈 |
| [claude/conventions.md](claude/conventions.md) | 编码规范、API 约定、环境变量 |
| [claude/module-index.md](claude/module-index.md) | 所有模块详细索引 |
| [claude/file-map.md](claude/file-map.md) | 目录结构与文件地图 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 |

## 模块索引

| 模块 | 路径 | 版本 | 职责 |
|------|------|------|------|
| mira-app-core | [packages/mira-app-core](packages/mira-app-core/CLAUDE.md) | 1.0.24 | 核心库：事件管理、SQLite 存储、TypeScript SDK、共享类型 |
| mira-app-server | [packages/mira-app-server](packages/mira-app-server/CLAUDE.md) | 1.0.25 | 服务端：Express HTTP + WebSocket，15 个路由，CLI，ThumbnailService |
| mira-client | [packages/mira-client](packages/mira-client/CLAUDE.md) | 1.0.5 | Electron 桌面客户端：媒体管理、插件系统、Tab 导航 |
| mira-dashboard-next | [packages/mira-dashboard-next](packages/mira-dashboard-next/CLAUDE.md) | 0.0.0 | Web 管理面板：shadcn-vue + Tailwind CSS 4 |
| mira-scripts-core | [packages/mira-scripts-core](packages/mira-scripts-core/CLAUDE.md) | 1.0.5 | 脚本工具集：数据转换、文件导入 |
| mira-doc | [packages/mira-doc](packages/mira-doc/CLAUDE.md) | 1.0.0 | VitePress 文档站 |
| plugins | [plugins](plugins/CLAUDE.md) | -- | 服务端插件集合 (4 个活跃插件) |

## 运行与开发

```bash
pnpm install                      # 安装依赖
pnpm run start:server             # 构建并启动全部 (core + server + 插件)
pnpm run build:core               # 仅构建 mira-app-core
pnpm run build:server             # 仅构建 mira-app-server
```

## 扫描状态

- **时间戳**: 2026-06-09T11:59:31+08:00
- **覆盖率**: 12/12 模块已扫描 (100%)
- **详情**: 见 [.claude/index.json](.claude/index.json)
