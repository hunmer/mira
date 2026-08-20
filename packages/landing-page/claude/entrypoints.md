# entrypoints

## 路由入口(app/)

- `app/layout.tsx`:根布局。加载 `globals.css`、三套字体(`lib/fonts.ts`:fontSans/fontHeading/fontMono),`constructMetadata()`(`lib/metadata.ts`)生成 SEO 元数据(manifest 指向 `/site.webmanifest`);`RootProviders`(`components/providers.tsx`)包裹 next-themes;尾部按 `GOOGLE_ANALYTICS` 环境变量注入 `@next/third-parties` 的 GoogleAnalytics。
- `app/page.tsx`:首页唯一页面,组装顺序:MouseSpotlight → SiteHeaderSection → HeroSection → PhoneMockupBasic(移动端手机壳轮播)→ DesktopPreviewSection(Safari 浏览器外框 + 缩略图切换)→ FeatureSection → LogoCloudSection → TestimonialsSection → FaqsSection → ContactSection → SiteFooterSection。
- `app/not-found.tsx`:404 页。
- `app/robots.ts` / `app/sitemap.ts`:SEO 元文件(静态导出时生成 robots.txt / sitemap.xml)。
- `app/icon.png` / `apple-icon.png`:Next 约定式 favicon 源。

## 配置入口

- `config/site.ts`:站点常量单一来源(SITE_NAME/SITE_DOMAIN(efferd.com)/SITE_DESCRIPTION/SITE_HOME_URL/MY_HANDLE)。
- `lib/metadata.ts`:`constructMetadata()` 构建 canonical/OG 等元数据。

## 服务/构建入口

- `scripts/postbuild.mjs`:build 后把 `out/` 重命名为 `introduction/`(静态导出产物落位)。
- 无 API 路由、无 middleware、无自定义 server。
