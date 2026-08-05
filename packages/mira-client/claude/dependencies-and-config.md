# mira-client 依赖与配置

## package.json 概要

- name:`mira-web`,version `1.0.5`,license MIT,engines node >=18
- main:`dist-main/main.js`,homepage `./`

## 关键 dependencies(UI / 框架相关)

| 依赖 | 版本 | 用途 |
|------|------|------|
| vue | 3.5.13 | 框架 |
| electron(注入) | ^38.8.6 | 桌面平台(devDep) |
| pinia | ^3.0.3 | 状态管理 |
| vue-router | ^4.5.1 | 路由 |
| tailwindcss | 4.0.17 | 样式(v4) |
| @tailwindcss/vite | 4.0.17 | Vite 集成 |
| @tailwindcss/postcss | ^4.0.17 | PostCSS 集成(devDep) |
| reka-ui | ^2.9.7 | shadcn-vue 无头层 |
| radix-vue | ^1.9.17 | **残留**,仅 2 处直引待清理 |
| tw-animate-css | ^1.4.0 | 弹出层动画 |
| class-variance-authority | ^0.7.1 | 组件变体 |
| clsx + tailwind-merge | 3.0.2 | `cn()` 类名合并 |
| vue-sonner | ^2.0.9 | Toast(sonner 组件) |
| motion-v | ^2.2.1 | 动画 |
| @lucide/vue + lucide-vue-next | ^1.17 / ^1.0 | 图标 |
| @internationalized/date | ^3.12.3 | calendar 日期 |
| @tanstack/vue-table | ^8.21.3 | table 高级用法 |
| vaul-vue | ^0.4.1 | Drawer(shadcn 用) |
| plyr / v-viewer / viewerjs | -- | 媒体预览 |
| filepond + vue-filepond + 插件 | -- | 上传 |
| mira-app-core | workspace:* | 后端 SDK |

## 关键 devDependencies

electron ^38.8.6、electron-builder ^26、vite ^6.2、vite-plugin-electron ^0.29、vue-tsc ^2.2.4、typescript ~5.7.2、eslint ^9.35、typedoc、dependency-cruiser、vite-bundle-analyzer。

## 配置文件

| 文件 | 作用 | 备注 |
|------|------|------|
| `components.json` | shadcn-vue 配置 | style=new-york, baseColor=neutral, cssVariables=true, iconLibrary=lucide, tailwind.css=src/renderer/assets/main.css, aliases 见下 |
| `src/renderer/assets/main.css` | **真实主题源** | Tailwind v4 `@theme inline` + shadcn 语义 token(oklch),含 `--animate-in/out` 覆盖 |
| `tailwind.config.js` | **死文件** | v3 遗留,未被引用,勿在此改样式 |
| `vite.renderer.config.ts` | 渲染构建 | 全局注入 scss variables/mixins |
| `vite.main.config.ts` | 主进程构建 | |
| `vite.preload.config.ts` | 预加载构建 | |
| `electron-builder.*` | 打包配置 | win/mac |

## components.json aliases

```
components  → @/components
utils       → @/lib
ui          → @/components/ui
lib         → @/lib
composables → @/renderer/composables
```

## SCSS 与 Tailwind 并存

`vite.renderer.config.ts` 的 `css.preprocessorOptions.scss` 全局注入 `assets/scss/variables.scss` 与 `mixins.scss`,与 Tailwind v4 体系并存,非迁移阻塞项。
