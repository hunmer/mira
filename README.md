<div align="center">
  <img src="./app-icon.png" alt="Mira" width="160" height="160" />

  <h1>Mira TypeScript</h1>

  <p>一个基于 TypeScript 的现代化媒体资源管理系统，包含后端服务和前端管理面板。</p>

  <p>
    <a href="https://github.com/hunmer/mira/actions/workflows/docker.yml">
      <img src="https://github.com/hunmer/mira/actions/workflows/docker.yml/badge.svg" alt="Docker" />
    </a>
    <a href="https://github.com/hunmer/mira/actions/workflows/electron.yml">
      <img src="https://github.com/hunmer/mira/actions/workflows/electron.yml/badge.svg" alt="Electron Build" />
    </a>
    <a href="https://github.com/hunmer/mira/actions/workflows/landing-page.yml">
      <img src="https://github.com/hunmer/mira/actions/workflows/landing-page.yml/badge.svg" alt="Deploy Landing Page" />
    </a>
    <a href="https://github.com/hunmer/mira/actions/workflows/mira-doc.yml">
      <img src="https://github.com/hunmer/mira/actions/workflows/mira-doc.yml/badge.svg" alt="Deploy Mira Doc" />
    </a>
  </p>

  <p>
    <a href="https://github.com/hunmer/mira/stargazers">
      <img src="https://img.shields.io/github/stars/hunmer/mira?style=social" alt="Stars" />
    </a>
    <a href="https://github.com/hunmer/mira/releases">
      <img src="https://img.shields.io/github/v/release/hunmer/mira" alt="Release" />
    </a>
    <a href="https://github.com/hunmer/mira/issues">
      <img src="https://img.shields.io/github/issues/hunmer/mira" alt="Issues" />
    </a>
    <img src="https://img.shields.io/github/last-commit/hunmer/mira" alt="Last Commit" />
    <img src="https://img.shields.io/github/languages/top/hunmer/mira" alt="Top Language" />
    <img src="https://img.shields.io/github/repo-size/hunmer/mira" alt="Repo Size" />
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/hunmer/mira" alt="License" /></a>
  </p>
</div>

---

## 项目架构

```
mira_typescript/
├── packages/
│   ├── mira-app-core/          # 核心库（SDK / 存储 / 事件）
│   ├── mira-app-server/        # 后端服务（HTTP + WebSocket）
│   ├── mira-client/            # 桌面客户端（Electron）
│   ├── mira_mobile/            # 移动客户端（Flutter）
│   ├── mira-dashboard-next/    # Web 管理面板
│   ├── mira-browser-extension/ # 浏览器扩展（网页采集）
│   ├── mira-cep-panel/         # Adobe CEP 面板（Photoshop）
│   ├── mira-plugin-ui/         # 插件共享 UI 组件库
│   ├── mira-scripts-core/      # 数据处理工具集
│   ├── mira-doc/               # 系统文档
│   ├── grid-layout-plus/       # Vue 3 栅格拖拽布局组件
│   ├── vue-masonry/            # Vue 3 瀑布流组件
│   ├── vue-selection-box/      # Vue 3 框选组件
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
| [**mira_mobile**](./packages/mira_mobile/README.md) | 移动客户端。基于 Flutter 的移动端应用。 |
| [**mira-browser-extension**](./packages/mira-browser-extension/README.md) | 浏览器扩展。网页采集入口，支持截图、拖拽上传、资源嗅探，将网页素材快速归档到 Mira。 |
| [**mira-cep-panel**](./packages/mira-cep-panel/README.md) | Adobe CEP 面板。Photoshop 内的 Mira 素材库面板（兼容 CEP 9 / Chromium 61）。 |
| [**mira-plugin-ui**](./packages/mira-plugin-ui/README.md) | 插件共享 UI 组件库。构建产物自包含，可经 CDN 引入，不依赖宿主页面的组件库。 |
| [**mira-scripts-core**](./packages/mira-scripts-core/README.md) | 数据处理工具集。用于图书馆系统数据的转换与文件批量导入脚本。 |
| [**mira-doc**](./packages/mira-doc/index.md) | 系统文档。涵盖安装、CLI、MCP、技能等使用说明（基于 VitePress）。 |
| [**grid-layout-plus**](./packages/grid-layout-plus/README.md) | Vue 3 栅格拖拽布局组件。可拖拽、可缩放的可视化布局系统。 |
| [**vue-masonry**](./packages/vue-masonry/README.md) | Vue 3 瀑布流组件库。支持响应式列数、跨列跨行、宽高比、懒加载与动画。 |
| [**vue-selection-box**](./packages/vue-selection-box/README.md) | Vue 3 框选组件。拖拽矩形框选、快捷键加减选、边缘自动滚动，基于 `data-selectable-id` 协议零侵入。 |
| [**landing-page**](./packages/landing-page/README.md) | 项目官网落地页（Next.js）。对外展示 Mira 产品介绍与功能特性。 |

## 快速开始

### 前置要求
- Node.js 18+
- pnpm

### 1. 安装依赖
```bash
# 安装核心包依赖（core / server / client）
pnpm run install:deps

# 构建插件
pnpm run build:plugins
```

### 2. 启动开发环境
```bash
# 启动后端服务（HTTP + WebSocket）
cd packages/mira-app-server
pnpm run dev

# 在仓库根目录启动桌面客户端（Electron，另开终端）
pnpm run start:client:win   # Windows
pnpm run start:client:mac   # macOS

# 启动 Web 管理面板（另开终端）
cd packages/mira-dashboard-next
pnpm run dev
```

### 3. 访问应用
- **后端 API**: http://localhost:8081
- **WebSocket**: ws://localhost:8018
- **Web 管理面板**: http://localhost:5173（Vite 默认端口）
- **桌面客户端开发页**: http://localhost:3000
- **默认登录**: 用户名 `admin`，密码 `admin123`

## 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
