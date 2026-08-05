# mira-doc

> 详细的 AI 上下文文档位于 [claude/](claude/) 目录。

## 项目简单介绍

mira-doc 是 Mira 系统的官方文档站，基于 **VitePress 2.0-alpha** 构建（中文站点，`lang: zh-CN`，`base: /mira-doc/`）。内容覆盖项目指南、API 参考、Dashboard 管理面板和 N8N 集成文档。属于 pnpm monorepo（`mira_typescript`）下的独立子包，`name=mira-doc`，`version=1.0.0`。

## 约定的规则

通过 `package.json` 的 scripts 驱动，所有命令均直接调用 `vitepress` CLI：

| 命令 | 等价于 | 用途 |
|------|--------|------|
| `pnpm docs:dev` | `vitepress dev` | 启动本地开发服务器（热更新） |
| `pnpm docs:build` | `vitepress build` | 构建静态站点到 `.vitepress/dist/` |
| `pnpm docs:preview` | `vitepress preview` | 预览构建产物 |
| `pnpm docs:serve` | `vitepress serve` | 提供构建产物的本地静态服务 |

部署通过 GitHub Actions（`.github/workflows/deploy.yml`）完成。Markdown 文档源位于包根的各类子目录（`guide/`、`api/`、`n8n/`、`dashboard/`）。

## 文件索引

| 相对路径 | 类型 | 说明 |
|----------|------|------|
| `package.json` | 配置 | 包元数据与 scripts |
| `pnpm-lock.yaml` | 锁文件 | 依赖锁定 |
| `.gitignore` | 配置 | 忽略 `node_modules/`、`.vitepress/dist/`、`.vitepress/cache/` |
| `index.md` | 文档 | 站点首页（VitePress `home` 布局，hero + features） |
| `quick-start.md` | 文档 | 快速开始指南 |
| `.vitepress/config.mts` | 配置 | VitePress 配置入口（导航/侧边栏/主题） |
| `.vitepress/cache/` | 产物 | VitePress 构建缓存（不提交） |
| `.vitepress/dist/` | 产物 | VitePress 构建输出（不提交） |
| `public/logo.svg` | 资源 | 静态资源（站点 logo） |
| `guide/` | 文档目录 | 基础指南与核心功能 |
| `api/` | 文档目录 | API 参考 |
| `n8n/` | 文档目录 | N8N 集成文档 |
| `dashboard/` | 文档目录 | 管理面板文档 |
| `.github/workflows/deploy.yml` | CI | GitHub Pages 部署工作流 |
| `claude/` | 文档 | AI 上下文文档（本目录） |

详见 [claude/file-map.md](claude/file-map.md)。

## 扫描状态

- **版本**: 1.0.0
- **VitePress**: 2.0.0-alpha.12
- **扫描时间**: 2026-08-05
- **扫描范围**: 顶层结构、`package.json`、`.vitepress/config.mts`（全文）、内容目录文件清单、`index.md`
- **未扫描**: 各 Markdown 正文内容（除 `index.md` 外未逐行读取）、`deploy.yml` 工作流细节、`pnpm-lock.yaml`、`node_modules/`
