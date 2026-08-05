# mira-doc 总览

## 项目定位

mira-doc 是 **Mira 系统**（智能文件管理与自动化平台）的官方文档站，属于 `mira_typescript` pnpm monorepo 中的一个独立子包。

- **包名 / 版本**: `mira-doc` @ `1.0.0`
- **技术栈**: VitePress `2.0.0-alpha.12`（基于 Vite + Vue 3 的静态站点生成器）
- **语言**: 站点为中文（`lang: 'zh-CN'`）
- **Base 路径**: `/mira-doc/`（适配 GitHub Pages 子路径部署）
- **License**: MIT
- **仓库**: [github.com/hunmer/mira_typescript](https://github.com/hunmer/mira_typescript)，文档源码目录为 `mira-doc/`

## 模块职责

单一职责：**生成 Mira 项目的静态文档站点**。不包含运行时代码、不含业务逻辑，仅承载以下内容：

1. **首页与快速开始** — 项目介绍、安装、特性概览
2. **基础指南（`guide/`）** — 介绍、安装配置、系统架构、核心功能
3. **API 参考（`api/`）** — 各模块 API 文档（认证、文件、库、插件、用户、设备、数据库）
4. **管理面板（`dashboard/`）** — Dashboard 概览、部署、API 接口
5. **N8N 集成（`n8n/`）** — 集成概览、安装、Mira API 节点、WebSocket 触发器、示例

## 文档结构（顶层）

```
mira-doc/
├── index.md              # 首页（home 布局）
├── quick-start.md        # 快速开始
├── guide/                # 基础指南与核心功能
├── api/                  # API 参考
├── n8n/                  # N8N 集成
├── dashboard/            # 管理面板
├── public/               # 静态资源（logo.svg）
├── .vitepress/
│   ├── config.mts        # VitePress 配置（导航/侧边栏/主题）
│   ├── cache/            # 构建缓存（不提交）
│   └── dist/             # 构建产物（不提交）
├── .github/workflows/    # CI（deploy.yml）
├── claude/               # AI 上下文文档（本目录）
└── package.json
```

## 入口与命令

| 命令 | VitePress CLI | 用途 |
|------|---------------|------|
| `pnpm docs:dev` | `vitepress dev` | 本地开发服务器 |
| `pnpm docs:build` | `vitepress build` | 生成静态站点 |
| `pnpm docs:preview` | `vitepress preview` | 预览构建产物 |
| `pnpm docs:serve` | `vitepress serve` | 静态文件服务 |

详见 [entrypoints.md](entrypoints.md)。

## 相关文档

- [conventions.md](conventions.md) — 编写约定与规则
- [public-interfaces.md](public-interfaces.md) — 导航与侧边栏结构
- [dependencies-and-config.md](dependencies-and-config.md) — 依赖与配置
- [file-map.md](file-map.md) — 完整文件清单
- [changelog.md](changelog.md) — 变更记录
