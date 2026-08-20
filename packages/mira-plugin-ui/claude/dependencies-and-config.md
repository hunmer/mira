# mira-plugin-ui 依赖与配置

## package.json（v1.1.0，private，type: module）

peerDependencies：`vue ^3.5.0`（唯一 external）。

dependencies（构建时全部打进 bundle，消费方无需安装）：

| 依赖 | 用途 |
|------|------|
| `@hunmer/vue-masonry`（workspace:*） | MediaBrowser 瀑布流 |
| `@hunmer/vue-selection-box`（workspace:*） | BatchUploadForm / MediaBrowser 框选 |
| `@lucide/vue ^1.32.0` | UI 图标 |
| `@vueuse/core ^14.4.0` | 组合式工具 |
| `class-variance-authority ^0.7.1` / `clsx ^2.1.1` / `tailwind-merge ^3.3.0` | shadcn cva/cn 体系 |
| `motion-v ^2.2.1` | 动效 |
| `reka-ui ^2.9.7` | 无头组件底层 |

devDependencies：`@tailwindcss/vite` + `tailwindcss ^4.3.3`（v4）、`tw-animate-css`、`@vitejs/plugin-vue ^5.2.3`、`vite ^6.3.2`、`vite-plugin-vue-devtools`（仅 dev）、`typescript ~5.8.3`、`vue 3.5.13`（锁定版本）。

## vite.config.ts 要点

- lib 模式：entry `src/index.ts`，formats es+umd，name `MiraPluginUI`，`exports: 'named'`。
- external 仅 `['vue']`（globals: `vue → Vue`）；其余依赖入 bundle。
- `cssCodeSplit: false`；`assetsInlineLimit: 100000000`（material-icons.woff2 内联进 CSS，dist 自包含）。
- `assetFileNames: 'mira-plugin-ui.[ext]'` → CSS 固定名 `mira-plugin-ui.css`。
- alias：`@ → ./src`；demo 用 `mira-app-core/shared/sdk → ../mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs`。
- dev 代理 `/mira-api → http://127.0.0.1:8081`（server 无 CORS）。
- vueDevTools `apply: 'serve'` 仅 dev；Windows/macOS 自动探测 VS Code 路径供 launchEditor。

## components.json（shadcn-vue CLI）

style `new-york`、typescript、tailwind css 指向 `src/assets/tailwind.css`、baseColor neutral、cssVariables true、iconLibrary lucide；aliases：components `@/components`、utils `@/lib`、ui `@/components/ui`。

## src/assets/tailwind.css（Tailwind v4）

- `@import "tailwindcss"` + `@import "tw-animate-css"`。
- `@source "../"` 显式扫描**整个 src**（顶层业务组件 + components + library，避免新增顶层组件漏扫导致宿主缺类）。
- `@custom-variant dark (&:is(.dark *))`：暗色跟随宿主 `.dark` 类。
- `@theme inline` 把 oklch token 映射为 tailwind 颜色（取值与 mira-client / mira_tiptap_format 一致，宿主同名变量互不干扰）。

## 其他

- `tsconfig.json`：strict TypeScript（未逐项核对编译选项）。
- 根 `ui_rule.md`：本包样式规则的权威来源。
- 包内含 `package-lock.json`（npm 形态，历史遗留；monorepo 主体用 pnpm）。
