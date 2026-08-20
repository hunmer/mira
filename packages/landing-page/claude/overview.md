# overview

- `mira-landing-page` v0.1.0(private):Mira 官方落地页 / 营销站,单页结构(`app/page.tsx` 按 section 组装)。
- **独立技术栈**:Next.js 16(App Router)+ React 19 + shadcn + Tailwind v4,与 Mira 主链路(TypeScript/Vue/Electron)**无运行时依赖**;不在 `pnpm-workspace.yaml` 内,使用独立 `pnpm-lock.yaml`(build 时 `pnpm install --ignore-workspace`)。
- **部署方式为纯静态导出**:`next.config.ts` 设 `output: "export"` + `basePath: "/introduction"`,`next build` 输出 `out/`,再由 `scripts/postbuild.mjs` 重命名为 `introduction/`,整目录放到服务器 `/introduction/` 路径下(产物目录未跟踪 git)。
- 站点身份见 `config/site.ts`:`SITE_NAME = "Mira"`、`SITE_DOMAIN = "efferd.com"`(部署域名)、`MY_HANDLE = "hunmer"`。
- 首页叙事顺序:Header → Hero(价值主张 + CTA)→ 手机截图轮播(PhoneMockupBasic)→ 桌面预览(Safari 外框 + 缩略图切换)→ Feature → LogoCloud → Testimonials → FAQs → Contact → Footer,全局叠加 MouseSpotlight 鼠标光效。
- 2026-08-11~13 曾围绕 Vercel 部署做多次修复,后转向静态导出方案(见 changelog.md)。
