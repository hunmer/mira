# landing-page (mira-landing-page)

Mira 官方落地页 / 营销站(`mira-landing-page`,v0.1.0,private)。**独立技术栈:Next.js 16 + React 19 + shadcn + Tailwind v4**,与 Mira 主链路(TypeScript/Vue/Electron)**无运行时依赖**,使用独立的 `pnpm-lock.yaml`。

## 约定

- 框架:Next.js 16(App Router,`app/`),Turbopack 构建
- UI:React 19 + Radix UI + shadcn + Tailwind v4(`@tailwindcss/postcss`)
- 动画:`motion` v12
- 校验:`zod`
- 代码风格:Biome(`lint` / `format`),配合 ultracite
- 含 shadcn registry(`registry/`、`registry.json`、`scripts/build-registry.mts`)

## 命令

| 命令 | 作用 |
|------|------|
| `pnpm --filter mira-landing-page dev` | `next dev --turbopack` |
| `pnpm --filter mira-landing-page build` | `next build --turbopack` |
| `pnpm --filter mira-landing-page start` | `next start` |
| `pnpm --filter mira-landing-page lint` | `biome check` |
| `pnpm --filter mira-landing-page format` | `biome format --write` |
| `pnpm --filter mira-landing-page b:r` | 构建 shadcn registry(`tsx scripts/build-registry.mts && shadcn build`) |

## 文件结构(顶层)

```
packages/landing-page/
├── app/              # Next.js App Router 路由与页面
├── components/       # UI 组件(含 shadcn)
├── config/           # 站点配置
├── hooks/            # React hooks
├── lib/              # 工具(shadcn 的 cn 等)
├── registry/         # shadcn registry 源
├── registry.json     # registry 清单
├── scripts/          # build-registry.mts
├── public/
├── types/
├── next.config.ts
├── biome.json
├── postcss.config.mjs
├── components.json   # shadcn 配置
└── tsconfig.json
```

## 扫描状态

- **更新时间**: 2026-08-11
- **已扫描**:`package.json`(依赖/脚本全量)、顶层目录结构
- **定位**:独立营销站,**不参与** Mira core/server/client 的构建链路;`pnpm-workspace.yaml` 未显式声明此包,使用独立 lockfile
- **缺口**:`app/`、`components/`、`registry/` 内容未抽样;若需深度维护落地页再补 `claude/` 详情
