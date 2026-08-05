# 文件清单

> 扫描时间：2026-08-05。`node_modules/`、`.vitepress/cache/`、`.vitepress/dist/` 为生成物，不列入。

## 配置与元数据

| 相对路径 | 说明 |
|----------|------|
| `package.json` | 包元数据、scripts、依赖声明 |
| `pnpm-lock.yaml` | pnpm 依赖锁文件 |
| `.gitignore` | 忽略 node_modules、构建产物与缓存 |
| `.vitepress/config.mts` | VitePress 配置入口（站点/导航/侧边栏/主题） |
| `.github/workflows/deploy.yml` | GitHub Actions 部署工作流（内容未扫描） |

## 文档（Markdown）

### 根目录

| 相对路径 | 说明 |
|----------|------|
| `index.md` | 站点首页（VitePress `home` 布局，hero + 9 features） |
| `quick-start.md` | 快速开始指南 |

### `guide/` — 基础指南

| 相对路径 | 说明 |
|----------|------|
| `guide/introduction.md` | 项目介绍 |
| `guide/installation.md` | 安装与配置 |
| `guide/architecture.md` | 系统架构 |

> 侧边栏引用的 `file-management.md`、`library-management.md`、`plugin-system.md`、`user-management.md`、`device-monitoring.md` **未发现**，为占位链接。

### `api/` — API 参考

| 相对路径 | 说明 |
|----------|------|
| `api/overview.md` | API 概览 |

> 侧边栏引用的 `authentication.md`、`file.md`、`library.md`、`plugin.md`、`user.md`、`device.md`、`database.md` **未发现**，为占位链接。

### `n8n/` — N8N 集成

| 相对路径 | 说明 |
|----------|------|
| `n8n/overview.md` | 集成概览 |
| `n8n/installation.md` | 安装配置 |

> 侧边栏引用的 `mira-api-nodes.md`、`websocket-trigger.md`、`examples.md` **未发现**，为占位链接。

### `dashboard/` — 管理面板

| 相对路径 | 说明 |
|----------|------|
| `dashboard/README.md` | Dashboard 说明 |
| `dashboard/index.md` | 概览（侧边栏 `/dashboard/` 指向此） |
| `dashboard/api.md` | Dashboard API 接口 |
| `dashboard/deployment.md` | Dashboard 部署指南 |

## 静态资源

| 相对路径 | 说明 |
|----------|------|
| `public/logo.svg` | 站点 logo（首页 hero 引用） |

## AI 上下文文档（本目录）

| 相对路径 | 说明 |
|----------|------|
| `claude/overview.md` | 模块总览 |
| `claude/conventions.md` | 约定与规则 |
| `claude/entrypoints.md` | 入口与配置 |
| `claude/public-interfaces.md` | 导航与侧边栏结构 |
| `claude/dependencies-and-config.md` | 依赖与配置 |
| `claude/file-map.md` | 本文件 |
| `claude/changelog.md` | 变更记录 |

## 生成物（不列入版本控制）

- `node_modules/` — 依赖
- `.vitepress/cache/` — VitePress 构建缓存
- `.vitepress/dist/` — VitePress 构建产物
