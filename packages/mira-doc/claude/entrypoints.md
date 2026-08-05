# 入口与配置

## 包入口

`package.json` 中 `main` 字段指向 `index.js`，但该文件**在文件系统中未发现**（属于遗留字段，文档站无运行时入口）。mira-doc 的真正"入口"是 VitePress 配置与 Markdown 文档。

## VitePress 配置入口

**文件**: `.vitepress/config.mts`（TypeScript + ESM）

```ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Mira 文档",
  description: "Mira 系统完整指南 - 让你轻松上手文件管理与自动化",
  lang: 'zh-CN',
  base: '/mira-doc/',
  ignoreDeadLinks: true,
  themeConfig: { /* nav / sidebar / socialLinks / footer / editLink / lastUpdated */ }
})
```

### 站点级配置

| 字段 | 值 | 说明 |
|------|----|------|
| `title` | `Mira 文档` | 站点标题 |
| `description` | `Mira 系统完整指南...` | SEO 描述 |
| `lang` | `zh-CN` | 站点语言 |
| `base` | `/mira-doc/` | 部署子路径 |
| `ignoreDeadLinks` | `true` | 忽略死链（部分文档占位未补全） |

### 主题配置（`themeConfig`）

- `nav` — 顶部导航（详见 [public-interfaces.md](public-interfaces.md)）
- `sidebar` — 侧边栏（按路径分组，详见 [public-interfaces.md](public-interfaces.md)）
- `socialLinks` — GitHub 图标，指向 `https://github.com/hunmer/mira_typescript`
- `footer` — `message: '基于 MIT 许可证发布'`，`copyright: 'Copyright © 2025 Mira 项目'`
- `editLink` — `pattern: '.../edit/main/mira-doc/:path'`，文本 `在 GitHub 上编辑此页`
- `lastUpdated` — 显示最后更新时间，格式 `short` / `medium`

## 命令入口

VitePress CLI 通过 `package.json` scripts 调用，无自定义脚本逻辑：

| 脚本 | 调用 |
|------|------|
| `docs:dev` | `vitepress dev` |
| `docs:build` | `vitepress build` |
| `docs:preview` | `vitepress preview` |
| `docs:serve` | `vitepress serve` |

> VitePress 默认将 `.vitepress/config.{js,ts,mjs,mts}` 作为配置入口自动加载，无需在命令中显式指定。
