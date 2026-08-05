# 工程约定

## 包管理与脚本

- pnpm monorepo 子包，`private: true`，`type: module`。
- 脚本（`package.json`）：
  - `dev`: `vite`
  - `build`: `vue-tsc -b && vite build`（先做类型检查再打包）
  - `preview`: `vite preview`
- 无 `test`/`lint` 脚本（未发现测试与 lint 配置）。

## 路径别名

- `@/*` -> `src/*`（同时配置于 `tsconfig.json` 的 `paths` 与 `vite.config.ts` 的 `resolve.alias`）。
- Vue 使用运行时 + 编译器 bundle：vite alias `'vue' -> 'vue/dist/vue.esm-bundler.js'`（支持运行时模板编译，供插件路由 `builder`/动态模板使用）。

## TypeScript

- 目标 ES2022，`strict: true`，`noUnusedLocals`/`noUnusedParameters` 开启。
- `moduleResolution: bundler`，`isolatedModules: true`，`noEmit: true`（类型检查由 vue-tsc 完成，产物由 Vite 输出）。
- 仅包含 `src/**/*.ts|tsx|vue`。

## UI 与样式

- 仅 shadcn-vue（基于 reka-ui），不引入其他 UI 框架。
- `components.json`：style=`reka-mira`，baseColor=`zinc`，css=`src/assets/index.css`，iconLibrary=`remixicon`，`cssVariables: true`，启用 typescript。
- shadcn-vue 组件生成到 `src/components/ui/<component>/`（当前约 27 个），别名：components=`@/components`，utils=`@/lib/utils`，ui=`@/components/ui`。
- 样式：Tailwind CSS 4（`@tailwindcss/vite` 插件 + `src/assets/index.css`，含 CSS 变量）；动画用 `tw-animate-css`。
- 类名合并：`cn()` = `clsx + tailwind-merge`（`src/lib/utils.ts`）。
- 图标：`@remixicon/vue`（首选，配合 components.json）+ `@lucide/vue`。

## 表单

- vee-validate + `@vee-validate/zod` + zod 做校验。

## 路由

- `vue-router`，hash 模式（`createWebHashHistory`）。
- 路由 meta：`requiresAuth?: boolean`、`roles?: string[]`、`isPlugin?: boolean`、`libraryId?: string`（在 `src/router/index.ts` 通过 `declare module 'vue-router'` 增强 `RouteMeta`）。
- 权限守卫在 `router.beforeEach` 中实现：未登录跳登录、角色不符跳 `/overview`、URL `?token=` 自动登录。
- 插件路由：通过 `router.addRoute('MainLayout', ...)` 动态注册（见 entrypoints / module-responsibilities）。

## API 与鉴权

- 统一经由 `src/api/client.ts` 的 axios 实例。
- 请求拦截器注入 `Authorization: Bearer <token>`（token 存 `localStorage`）。
- `baseURL` 规范化：去掉末尾 `/` 与 `/api` 后追加 `/api`；可在运行时通过 `App.vue` 右下角弹窗或 `setApiBaseURL()` 修改（持久化到 `localStorage.api_base_url`），默认取 `VITE_API_BASE_URL` 或 `//<host>:8081/api`。
- dev 下 Vite 代理 `/api`、`/health` -> `http://127.0.0.1:8081`（mira-app-server）。

## 状态

- Pinia（setup-store 风格）。认证态持久化到 `localStorage`（`token`、`user`、`locale`）。

## i18n

- vue-i18n 11，`legacy: false`，默认 locale `zh-CN`（从 `localStorage.locale` 读取），fallback `zh-CN`。
- 翻译文件：`src/i18n/locales/zh-CN.ts`、`en.ts`。

## 文件/目录命名

- 目录与 `.vue`/`.ts` 一律小写 kebab-case（如 `file-manager/`、`not-found.vue`、`useLibrary.ts`）。
- Vue 组件文件名 PascalCase（如 `DefaultLayout.vue`、`StatCard.vue`、`PathTreeSelect.vue`）。
