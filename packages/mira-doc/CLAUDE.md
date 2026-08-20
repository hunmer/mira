# mira-doc

Mira 项目文档站(v1.0.0),基于 VitePress `2.0.0-alpha.12`。当前聚焦 Mira 的安装、CLI、MCP、Skill 四类使用指南。部署 base 为 `/docs/`(2026-08-13 前为 `/mira-doc/`,已调整)。

## 约定

- 内容语言 `zh-CN`
- 入口配置:`.vitepress/config.mts`(导航/侧边栏/socialLinks/footer/editLink/lastUpdated/head)
- head 已配置 OG/Twitter 分享卡与 `site.webmanifest`、apple-touch-icon
- 编辑链接指向 `github.com/hunmer/mira/edit/main/packages/mira-doc/:path`
- `ignoreDeadLinks: true`(允许未完成链接)

## 命令

| 命令 | 作用 |
|------|------|
| `pnpm --filter mira-doc docs:dev` | 本地开发(热更) |
| `pnpm --filter mira-doc docs:build` | 构建静态站 |
| `pnpm --filter mira-doc docs:preview` | 预览构建产物 |
| `pnpm --filter mira-doc docs:serve` | serve 产物 |

## 文件结构

```
packages/mira-doc/
├── .vitepress/
│   └── config.mts       # 站点配置
├── index.md             # 首页(layout: home)
├── install.md           # 安装指南(约 170 行)
├── cli.md               # CLI 文档(约 70 行,mira-app-server CLI 全能力)
├── mcp.md               # MCP 文档(约 72 行,stdio + 约 50 个工具)
├── skill.md             # Skill 文档(约 47 行,SKILL.md 约定)
├── public/              # 站点图标与分享图:icon.webp、og.png、android-chrome-192/512、apple-touch-icon.png、site.webmanifest
└── package.json
```

## 扫描状态

- **更新时间**: 2026-08-20
- **已扫描**: `package.json`(v1.0.0)、`.vitepress/config.mts`(base 改为 `/docs/`,head 增 OG/Twitter 卡)、5 个 md 页面的标题与行数、`public/` 清单(新增 og.png / webp 图标 / manifest,原 icon.ico、logo.png 已不在)
- **缺口**: `install.md` / `cli.md` / `mcp.md` / `skill.md` 正文未逐字校对(均已成文,非占位);注意:config head 中 icon 链接仍指向 `/mira-doc/icon.ico`,而 public/ 现为 `icon.webp`,二者不一致(疑似遗留,可核实)
- 保持轻量,暂不建 `claude/` 详情目录
