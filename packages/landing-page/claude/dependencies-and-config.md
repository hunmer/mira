# dependencies-and-config

## package.json(v0.1.0, private, type: module)

关键 dependencies:

| 依赖 | 版本 | 用途 |
|------|------|------|
| next | 16.0.7 | 框架(App Router,静态导出) |
| react / react-dom | 19.2.0 | UI |
| motion | ^12.23.24 | 动画 |
| three | ^0.185.1 | WebGL shader 背景 |
| next-themes | ^0.4.6 | 暗色主题 |
| @radix-ui/react-*(accordion/aspect-ratio/label/navigation-menu/separator/slot/tooltip) | ^1.x | 无头 UI 原语 |
| @next/third-parties | ^16.0.1 | Google Analytics |
| lucide-react / clsx / tailwind-merge / class-variance-authority | — | 图标与样式工具 |
| react-resizable-panels / react-use-measure | ^3.x / ^2.x | 布局测量 |

关键 devDependencies:`@biomejs/biome` 2.3.4 + `ultracite` 6.3.2(lint)、`tailwindcss` ^4.1.17 + `@tailwindcss/postcss`、`tw-animate-css`、`typescript` ^5.9.3、`tsx`、`serve` ^14.2.4(preview)、`rimraf`。

> 已移除(勿再引用):`zod`(校验,旧文档曾记载)、shadcn registry 构建链(`registry/`、`registry.json`、`scripts/build-registry.mts`、`b:r` 脚本)。

## scripts

| 命令(在包目录内执行) | 作用 |
|------|------|
| `pnpm dev` | `next dev --turbopack` |
| `pnpm build` | `pnpm install --ignore-workspace && next build && node scripts/postbuild.mjs`(静态导出到 `introduction/`) |
| `pnpm preview` | `serve .`(本地起静态服务预览产物) |
| `pnpm start` | `next start`(注:静态导出模式下仅适用于非 export 构建) |
| `pnpm lint` | `biome check` |
| `pnpm format` | `biome format --write` |

包不在 workspace 内,monorepo 根的 `pnpm --filter mira-landing-page ...` 不生效,需 `cd packages/landing-page` 后执行。

## next.config.ts

- `output: "export"`(静态导出,产物固定 `out/`)
- `basePath = "/introduction"`,同时通过 `env.NEXT_PUBLIC_BASE_PATH` 暴露给运行时(供 `lib/asset.ts` 的 `withBasePath()` 使用)
- `images.unoptimized: true`(静态导出无服务端图片优化)

## 其他配置文件

- `components.json`:shadcn 配置(new-york / zinc / cssVariables;远程 registry:`@kibo-ui`、`@magicui`)
- `biome.json`:Biome lint/format 规则
- `postcss.config.mjs`:挂载 `@tailwindcss/postcss`
- `tsconfig.json`:`@/*` → 包根;`strictNullChecks: true`
- 根目录另有 `README.md`(GitHub 徽章 + 项目介绍)与 `LICENCE.md`(MIT)
