# landing-page (mira-landing-page)

Mira 官方落地页 / 营销站(`mira-landing-page`,v0.1.0,private),站点域 `efferd.com`(`config/site.ts`)。**独立技术栈:Next.js 16(App Router)+ React 19 + shadcn + Tailwind v4**,与 Mira 主链路(TypeScript/Vue/Electron)无运行时依赖;不在 `pnpm-workspace.yaml` 内,使用独立 `pnpm-lock.yaml`。

单页站点,静态导出部署:`next build`(`output: "export"`)产物由 `scripts/postbuild.mjs` 从 `out/` 改名为 `introduction/`,部署于服务器 `/introduction/` 子路径。

## 约定(速览)

- UI:React 19.2 + Radix + shadcn(new-york)+ Tailwind v4;主题 next-themes,默认 dark
- 动画 `motion` v12;WebGL `three`;代码风格 Biome + ultracite
- 部署在子路径:绕过 `next/image` 的硬编码资源路径必须用 `lib/asset.ts` 的 `withBasePath()`
- 区块模式:`components/sections/*.tsx` 一区块一文件,由 `app/page.tsx` 组装

## 常用命令(在 `packages/landing-page` 目录内执行)

| 命令 | 作用 |
|------|------|
| `pnpm dev` | `next dev --turbopack` |
| `pnpm build` | 安装(忽略 workspace)+ 静态导出 + `postbuild.mjs` 落位 `introduction/` |
| `pnpm preview` | `serve .` 预览产物 |
| `pnpm lint` / `pnpm format` | `biome check` / `biome format --write` |

> monorepo 根的 `pnpm --filter mira-landing-page ...` 不生效(不在 workspace 内),需 cd 到包目录执行。

## 文件索引

| 文件 | 内容 |
|------|------|
| [claude/overview.md](claude/overview.md) | 定位、独立栈、静态导出、站点身份、首页叙事 |
| [claude/conventions.md](claude/conventions.md) | 框架/UI/主题/动画/lint 约定、basePath 规则、区块模式、i18n |
| [claude/entrypoints.md](claude/entrypoints.md) | layout/page 入口、metadata、robots/sitemap、配置入口 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖清单、scripts、next.config、shadcn/Biome/PostCSS 配置 |
| [claude/file-map.md](claude/file-map.md) | 目录地图与近期变更热点 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 |

## 扫描状态

- **更新时间**: 2026-08-25（增量核对，上次 2026-08-20）
- **已扫描**: package.json、next.config.ts、config/site.ts、app/ 与 components/ 结构、git log（08-20 以来 6 文件变更）
- **定位**: 独立营销站,不参与 Mira core/server/client 构建链路
- **本次变更**: 新增隐私政策页（`app/privacy/page.tsx` + `components/sections/privacy-section.tsx`，sitemap 与 site-footer 加 /privacy 链接）；contact-section 隐藏 QQ 群二维码入口
- **缺口**: sections/ui 内各组件实现未逐个细读;`lib/i18n` 语言切换能力疑似建设中(layout 为 `lang="en"`);`public/r` 目录用途未核实
