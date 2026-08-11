# mira-doc

Mira 项目文档站,基于 VitePress 2.0-alpha。当前聚焦 Mira 的安装、CLI、MCP、Skill 四类使用指南。部署 base 为 `/mira-doc/`(GitHub Pages 子路径)。

## 约定

- 内容语言 `zh-CN`
- 入口配置:`.vitepress/config.mts`(导航/侧边栏/socialLinks/editLink/lastUpdated)
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
├── index.md             # 首页
├── install.md           # 安装指南
├── cli.md               # CLI 文档(导航声明,内容待补)
├── mcp.md               # MCP 文档(导航声明,内容待补)
├── skill.md             # Skill 文档(导航声明,内容待补)
├── public/
│   └── icon.ico
└── package.json
```

## 扫描状态

- **更新时间**: 2026-08-11
- **已扫描**: `package.json`、`.vitepress/config.mts`、`index.md`、`install.md`(新增)
- **缺口**: `cli.md`、`mcp.md`、`skill.md` 内容存在性未逐字核对(导航声明但可能未完成),建议下一步逐页校对
