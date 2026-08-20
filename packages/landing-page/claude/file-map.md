# file-map

包内 git 跟踪文件共 153 个(2026-08-20 统计,不含 node_modules 与未跟踪的 `introduction/` 构建产物)。

```
packages/landing-page/
├── app/                     # 路由:layout.tsx / page.tsx / not-found.tsx / robots.ts / sitemap.ts / globals.css / icon.png / apple-icon.png
├── components/
│   ├── sections/            # 首页区块(9 个):hero / feature / desktop-preview / testimonials / faqs / contact / logo-cloud / site-header / site-footer
│   ├── ui/                  # shadcn 单文件组件(accordion/button/badge/input/label/separator/tooltip 等)+ 展示型子目录:media-waterfall、phone-mockups-1(+utils)、safari-browser、coverflow-carousel、iris-lens-card、theme-switch-flow、mask-view-transition-theme-toggle、mira-home-layout、web-gl-shader.tsx、infinite-slider 等
│   ├── kibo-ui/             # kibo-ui registry 组件(tree)
│   └── 根组件               # providers.tsx / logo.tsx / icons.tsx / theme-toggle.tsx / language-toggle.tsx / menu-toggle-icon.tsx / mouse-spotlight.tsx / sheard.tsx
├── config/site.ts           # 站点常量(SITE_DOMAIN = efferd.com)
├── hooks/                   # use-copy-to-clipboard / use-media-query / use-optimized-iframe / use-scroll
├── lib/
│   ├── asset.ts             # withBasePath():静态导出子路径补前缀
│   ├── fonts.ts / metadata.ts
│   ├── utils/               # code.tsx / index.ts(cn 等)
│   └── i18n/                # i18n-provider.tsx / translations.ts
├── public/                  # media/、screenshots/、mobile_screenshots/(产品截图素材)、og.jpeg、qq-group-code.jpg、shaban.webp、site.webmanifest、android-chrome / apple-touch 图标、r/、theme-switch-flow/
├── scripts/postbuild.mjs    # out/ → introduction/
├── introduction/            # (构建产物,未跟踪 git)
├── next.config.ts / biome.json / postcss.config.mjs / components.json / tsconfig.json
├── pnpm-lock.yaml           # 独立 lockfile
├── README.md / LICENCE.md / CLAUDE.md / claude/
```

近期变更热点(2026-08-11 以来,按目录):`components/sections`(32 次)、`public/media`(18)、包根(14)、`components/ui` 及其子目录(约 25)、`app`(6)。
