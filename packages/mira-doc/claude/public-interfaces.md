# 导航与侧边栏结构

> 来源：`.vitepress/config.mts` 的 `themeConfig.nav` 与 `themeConfig.sidebar`。

## 顶部导航（nav）

6 个主入口：

| 文本 | 链接 |
|------|------|
| 🏠 首页 | `/` |
| 📚 指南 | `/guide/introduction` |
| 🎨 管理面板 | `/dashboard/` |
| 🔧 API 参考 | `/api/overview` |
| 🚀 快速开始 | `/quick-start` |
| 🔗 N8N 集成 | `/n8n/overview` |

## 侧边栏（sidebar）

按路径前缀分组，共 4 个分区。

### `/guide/` — 指南

**📖 基础指南**
| 文本 | 链接 | 文件存在? |
|------|------|----------|
| 🎯 介绍 | `/guide/introduction` | 是 |
| ⚙️ 安装与配置 | `/guide/installation` | 是 |
| 🏗️ 系统架构 | `/guide/architecture` | 是 |

**🔧 核心功能**
| 文本 | 链接 | 文件存在? |
|------|------|----------|
| 📁 文件管理 | `/guide/file-management` | **否（占位）** |
| 📚 库管理 | `/guide/library-management` | **否（占位）** |
| 🔌 插件系统 | `/guide/plugin-system` | **否（占位）** |
| 👥 用户管理 | `/guide/user-management` | **否（占位）** |
| 📊 设备监控 | `/guide/device-monitoring` | **否（占位）** |

### `/api/` — API 参考

**🔗 API 文档**
| 文本 | 链接 | 文件存在? |
|------|------|----------|
| 📋 API 概览 | `/api/overview` | 是 |
| 🔐 认证授权 | `/api/authentication` | **否（占位）** |
| 📁 文件 API | `/api/file` | **否（占位）** |
| 📚 库 API | `/api/library` | **否（占位）** |
| 🔌 插件 API | `/api/plugin` | **否（占位）** |
| 👥 用户 API | `/api/user` | **否（占位）** |
| 📊 设备 API | `/api/device` | **否（占位）** |
| 💾 数据库 API | `/api/database` | **否（占位）** |

> 注：实际 `api/` 目录下当前仅有 `overview.md`，其余依赖 `ignoreDeadLinks: true` 跳过。

### `/n8n/` — N8N 集成

**🔗 N8N 集成**
| 文本 | 链接 | 文件存在? |
|------|------|----------|
| 📋 集成概览 | `/n8n/overview` | 是 |
| 📦 安装配置 | `/n8n/installation` | 是 |
| 🔧 Mira API 节点 | `/n8n/mira-api-nodes` | **否（占位）** |
| ⚡ WebSocket 触发器 | `/n8n/websocket-trigger` | **否（占位）** |
| 📖 使用示例 | `/n8n/examples` | **否（占位）** |

### `/dashboard/` — 管理面板

**🎨 管理面板**
| 文本 | 链接 | 文件存在? |
|------|------|----------|
| 📖 概览 | `/dashboard/` | 是（`index.md`） |
| 🚀 部署指南 | `/dashboard/deployment` | 是 |
| 🌐 API 接口 | `/dashboard/api` | 是 |

## 首页 Hero / Features

首页（`index.md`，`layout: home`）：

- **Hero**: name=`Mira`, text=`智能文件管理与自动化平台`
- **Actions**: 快速开始（brand）/ 管理面板 / 阅读指南 / GitHub
- **Features**（9 项）: 现代化管理面板、智能文件管理、灵活库管理、丰富插件生态、完善用户系统、实时事件推送、N8N 无缝集成、安全可靠、设备监控

## 外部链接

- **社交链接**: GitHub → `https://github.com/hunmer/mira_typescript`
- **编辑链接**: `https://github.com/hunmer/mira_typescript/edit/main/mira-doc/:path`
- **首页正文引用**: GitHub Discussions / Issues / Repository
