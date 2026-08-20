# changelog

- 2026-08-20: 全量重扫并建档 `claude/`。移除已失效的 registry 文档(`registry/`、`registry.json`、`build-registry.mts`、`b:r` 命令均已删除,`zod` 依赖已移除);记录静态导出部署方案(`output: "export"` + `basePath: "/introduction"` + `postbuild.mjs`)与新增依赖(three、next-themes、@next/third-parties 等);CLAUDE.md 改为轻量索引。
- 2026-08-13: 8-11~13 密集修复期(约 23 个提交,多为部署相关 fix:Vercel prerender 崩溃、Tweets 网络失败、Turbopack 禁用),随后转向静态导出 + `/introduction/` 子路径的自托管方案。
- 2026-08-11: 初次扫描建档(CLAUDE.md):Next.js 16 + React 19 + shadcn + Tailwind v4,独立 lockfile,当时还含 shadcn registry 构建链。
