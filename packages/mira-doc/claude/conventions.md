# 约定与规则

## 脚本约定

所有构建/开发命令定义在 `package.json` 的 `scripts` 字段，统一以 `docs:` 前缀命名，直接透传到 VitePress CLI：

| 脚本 | 命令 | 说明 |
|------|------|------|
| `docs:dev` | `vitepress dev` | 启动本地开发服务器，支持热更新 |
| `docs:build` | `vitepress build` | 构建静态站点，输出至 `.vitepress/dist/` |
| `docs:preview` | `vitepress preview` | 本地预览构建后的产物 |
| `docs:serve` | `vitepress serve` | 以静态服务方式提供构建产物 |

调用方式（在 monorepo 内）：

```bash
# 在 mira-doc 包目录下
pnpm docs:dev
pnpm docs:build
```

## VitePress 配置约定

- **配置文件位置**: `.vitepress/config.mts`（TypeScript + ESM）
- **导出方式**: `export default defineConfig({ ... })`
- **站点语言**: `zh-CN`
- **Base 路径**: `/mira-doc/`（用于 GitHub Pages 子路径部署）
- **`ignoreDeadLinks: true`** — 允许存在死链（部分文档尚未补全时不会构建失败）

> 注：配置中 `sidebar` 引用了若干尚未在文件系统中创建的 Markdown（如 `guide/file-management.md`、`api/file.md` 等），当前依赖 `ignoreDeadLinks` 跳过。新增文档时需注意补齐这些占位链接。

## 文档编写约定

- 所有文档使用 **中文** 撰写。
- 文件名使用小写英文 + 连字符（kebab-case），如 `quick-start.md`、`device-monitoring.md`。
- 导航与侧边栏文案大量使用 emoji 前缀（如 `🏠 首页`、`🔧 API 参考`），新增条目建议保持风格一致。
- 首页 `index.md` 使用 VitePress 的 `home` 布局，通过 frontmatter 定义 hero 与 features。
- GitHub 编辑链接通过 `editLink.pattern` 指向 `https://github.com/hunmer/mira_typescript/edit/main/mira-doc/:path`。

## 忽略规则（`.gitignore`）

```
node_modules/*
.vitepress/dist/
.vitepress/cache/
```

构建产物（`dist/`、`cache/`）与依赖（`node_modules/`）不纳入版本控制。

## 部署约定

- 通过 GitHub Actions 部署（`.github/workflows/deploy.yml`），目标为 GitHub Pages。
- 仓库地址：`https://github.com/hunmer/mira_typescript`
- `package.json` 中 `repository.url` 指向 `https://github.com/hunmer/mira-doc.git`（与 monorepo 主仓库不同，历史遗留字段）。

> 部署工作流细节未扫描。
