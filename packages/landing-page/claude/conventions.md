# conventions

- 框架:Next.js 16.0.7 App Router(`app/`),dev 用 Turbopack;静态导出(`output: "export"`)。
- UI:React 19.2 + Radix UI 原语 + shadcn(new-york 风格,zinc 基色,见 `components.json`);Tailwind v4(`@tailwindcss/postcss`,CSS 变量)+ `tw-animate-css`。
- 主题:`next-themes`(class 策略,默认 dark,见 `RootProviders`);带 theme-switch-flow / mask-view-transition-theme-toggle 切换动效组件。
- 动画:`motion` v12;3D/WebGL:`three`(`web-gl-shader.tsx`)。
- 代码风格:Biome 2(`lint`/`format`)+ ultracite;无 ESLint/Prettier。
- **basePath 约定**:静态导出部署在 `/introduction/` 子路径,`next/image`/`next/link` 自动补前缀;绕过它们的硬编码资源路径(`<img src>`、`url()`)必须用 `lib/asset.ts` 的 `withBasePath()` 补前缀。
- 页面区块模式:一个 section 一个文件(`components/sections/*.tsx`),由 `app/page.tsx` 统一组装;展示型复合组件放 `components/ui/` 下的子目录。
- 组件来源 registry:`components.json` 声明 `@kibo-ui` 与 `@magicui` 远程 registry(`components/kibo-ui/` 为 kibo-ui 组件);仓库内已无本地 registry 构建(`registry/`、`build-registry.mts` 均已删除)。
- 路径别名:`@/*` → 包根(`tsconfig.json`)。
- 文案:`app/layout.tsx` `lang="en"`(英文站),但存在 `lib/i18n/`(i18n-provider + translations)与 `language-toggle.tsx`,中英切换能力在建设中。
- 图标:app 目录内 `icon.png` / `apple-icon.png` 由 Next 约定生成 favicon;静态导出下 `images.unoptimized: true`(无服务端图片优化)。
