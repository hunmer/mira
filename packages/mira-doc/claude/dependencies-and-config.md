# 依赖与配置

## 运行时依赖

mira-doc 为纯文档站，**无 `dependencies`**，仅有 `devDependencies`：

| 依赖 | 版本 | 类型 | 用途 |
|------|------|------|------|
| `vitepress` | `2.0.0-alpha.12` | devDependency | 静态站点生成器（含 Vite + Vue 3） |

## package.json 关键字段

| 字段 | 值 |
|------|----|
| `name` | `mira-doc` |
| `version` | `1.0.0` |
| `description` | `Mira 系统完整文档 - 智能文件管理与自动化平台` |
| `main` | `index.js`（**文件不存在，遗留字段**） |
| `license` | `MIT` |
| `author` | `Mira Team` |
| `keywords` | `mira`, `file-management`, `automation`, `n8n`, `documentation`, `vitepress` |
| `repository.url` | `https://github.com/hunmer/mira-doc.git` |
| `repository.directory` | `mira-doc` |
| `homepage` | `https://github.com/hunmer/mira-doc/tree/main/mira-doc` |
| `scripts` | 见 [entrypoints.md](entrypoints.md) |

> 注：`repository.url` 与 `homepage` 指向独立的 `mira-doc` 仓库，与 monorepo 主仓库 `hunmer/mira_typescript` 不同。`editLink` 与 `socialLinks` 中实际使用的是 `mira_typescript` 仓库。

## VitePress 配置摘要

详见 [entrypoints.md](entrypoints.md)。关键项：

- `lang: zh-CN`，`base: /mira-doc/`
- `ignoreDeadLinks: true`（容忍占位链接）
- `themeConfig.lastUpdated` 启用（short 日期 / medium 时间）

## CI / 部署

- **平台**: GitHub Actions
- **工作流**: `.github/workflows/deploy.yml`（**未扫描内容**）
- **目标**: 推测为 GitHub Pages（基于 `base: /mira-doc/` 配置）

## 忽略规则

`.gitignore`：

- `node_modules/*`
- `.vitepress/dist/`（构建产物）
- `.vitepress/cache/`（构建缓存）

## 包管理器

- 使用 **pnpm**（monorepo），包内含独立的 `pnpm-lock.yaml`。
