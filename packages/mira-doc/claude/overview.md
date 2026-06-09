# mira-doc 总览

## 模块职责

Mira 系统完整文档站，使用 VitePress 驱动。提供项目文档、API 文档、使用指南等内容。

## 入口

- **开发**: `pnpm run docs:dev` -- VitePress 开发服务器
- **构建**: `pnpm run docs:build` -- 生成静态站点
- **预览**: `pnpm run docs:preview`

## 文档结构

| 路径 | 说明 |
|------|------|
| `index.md` | 首页 |
| `quick-start.md` | 快速开始 |
| `guide/introduction.md` | 项目介绍 |
| `guide/installation.md` | 安装指南 |
| `guide/architecture.md` | 架构说明 |
| `api/overview.md` | API 概览 |
| `dashboard/index.md` | Dashboard 文档 |
| `dashboard/api.md` | Dashboard API |
| `dashboard/deployment.md` | Dashboard 部署 |
| `n8n/overview.md` | n8n 集成概览 |
| `n8n/installation.md` | n8n 安装指南 |

## 依赖

- VitePress 2.0.0-alpha.12
