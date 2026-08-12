# Mira TypeScript

一个基于 TypeScript 的现代化媒体资源管理系统，包含后端服务和前端管理面板。

## 项目架构

```
mira_typescript/
├── packages/
│   ├── mira-app-core/          # 核心库（SDK / 存储 / 事件）
│   ├── mira-app-server/        # 后端服务（HTTP + WebSocket）
│   ├── mira-client/            # 桌面客户端（Electron）
│   ├── mira-dashboard-next/    # Web 管理面板（新版）
│   ├── mira-browser-extension/ # 浏览器扩展（网页采集）
│   ├── mira-scripts-core/      # 数据处理工具集
│   ├── mira-doc/               # 系统文档
│   ├── vue-masonry/            # Vue 3 瀑布流组件
│   └── landing-page/           # 项目官网落地页
├── plugins/                    # 插件目录
├── data/                       # 数据目录
└── .vscode/                    # VS Code 配置
```

## Packages 概览

| Package | 说明 |
|---------|------|
| [**mira-app-core**](./packages/mira-app-core/README.md) | 项目核心库（TypeScript）。提供共享的客户端 SDK（Http/WebSocket）、SQLite 存储抽象与事件管理，供 server / client / 扩展复用。 |
| [**mira-app-server**](./packages/mira-app-server/README.md) | 后端服务。基于 HTTP + WebSocket 的独立 server，负责资源库管理、插件系统、用户认证、缩略图与元数据等。 |
| [**mira-client**](./packages/mira-client/README.md) | 桌面客户端（Electron）。Mira 媒体库的桌面端应用，提供本地化的浏览与管理体验。 |
| [**mira-dashboard-next**](./packages/mira-dashboard-next/README.md) | Web 管理面板（新版）。基于 Vue 3 + shadcn-vue + Tailwind CSS 4，包含系统概览、资源库/插件/管理员/设备管理、数据库预览等。 |
| [**mira-browser-extension**](./packages/mira-browser-extension/README.md) | 浏览器扩展。网页采集入口，支持截图、拖拽上传、资源嗅探，将网页素材快速归档到 Mira。 |
| [**mira-scripts-core**](./packages/mira-scripts-core/README.md) | 数据处理工具集。用于图书馆系统数据的转换与文件批量导入脚本。 |
| [**mira-doc**](./packages/mira-doc/index.md) | 系统文档。涵盖安装、CLI、MCP、技能等使用说明（基于 VitePress）。 |
| [**vue-masonry**](./packages/vue-masonry/README.md) | Vue 3 瀑布流组件库。支持响应式列数、跨列跨行、宽高比、懒加载与动画。 |
| [**landing-page**](./packages/landing-page/README.md) | 项目官网落地页（Next.js）。对外展示 Mira 产品介绍与功能特性。 |

## 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn

### 1. 安装依赖
```bash
# 安装所有包的依赖
npm run install-all
```

### 2. 启动开发环境

#### 方式一：启动完整全栈（推荐）
```bash
# Windows
./start-full-stack.bat

# PowerShell
./start-full-stack.ps1

# 或使用 VS Code 任务
# Ctrl+Shift+P -> Tasks: Run Task -> start-full-stack
```

#### 方式二：分别启动服务
```bash
# 启动后端服务
cd packages/mira-app-server
npm run dev

# 启动前端管理面板
cd packages/mira-dashboard-next
npm run dev
```

### 3. 访问应用
- **后端API**: http://localhost:8081
- **WebSocket**: ws://localhost:8018
- **前端管理面板**: http://localhost:3999
- **默认登录**: 用户名 `admin`，密码 `admin123`

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
