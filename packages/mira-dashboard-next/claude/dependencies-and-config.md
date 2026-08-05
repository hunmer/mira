# 依赖与配置

## package.json 概要

- name: `mira-dashboard-next`
- version: `0.0.0`
- type: `module`
- private: `true`
- scripts: `dev` / `build` / `preview`（无 test/lint）。

## 运行时依赖（dependencies）

| 依赖 | 版本 | 用途 |
|------|------|------|
| vue | ^3.5.13 | 前端框架 |
| vue-router | ^4.6.4 | 路由（hash 模式） |
| pinia | ^3.0.4 | 状态管理 |
| vue-i18n | ^11.4.4 | 国际化 |
| axios | ^1.16.1 | HTTP |
| shadcn-vue | ^2.7.3 | UI 组件生成工具/CLI |
| reka-ui | ^2.9.7 | UI 无样式原语（shadcn-vue 底层） |
| @vueuse/core | ^14.3.0 | 组合式工具 |
| vee-validate | ^4.15.1 | 表单验证 |
| @vee-validate/zod | ^4.15.1 | vee-validate 的 zod 适配 |
| zod | 3.25.76 | Schema 校验 |
| @unovis/vue / @unovis/ts | ^1.6.5 | 数据可视化（图表，`components/ui/chart`） |
| @tanstack/vue-table | ^8.21.3 | 表格抽象 |
| class-variance-authority | ^0.7.1 | 组件变体（cva） |
| clsx | ^2.1.1 | 类名拼接 |
| tailwind-merge | 3.0.2 | Tailwind 类合并 |
| tw-animate-css | ^1.4.0 | 动画 |
| vue-sonner | ^2.0.9 | Toast |
| @remixicon/vue | ^4.9.0 | 图标（components.json 首选） |
| @lucide/vue | ^1.16.0 | 图标 |
| react-selectable-fast | ^3.4.0 | 可选（未在本仓 src 内发现明显使用，未扫描到消费点） |

> `react-selectable-fast` 为 React 包，与本 Vue 包语义不符，疑似遗留/误装（未在 src 中扫描到使用点）。

## 开发依赖（devDependencies）

| 依赖 | 版本 | 用途 |
|------|------|------|
| vite | ^6.0.0 | 构建器 |
| @vitejs/plugin-vue | ^5.2.1 | Vue SFC 支持 |
| vite-plugin-vue-devtools | ^8.1.2 | devtools（仅非 production） |
| tailwindcss | ^4.0.0 | Tailwind v4 |
| @tailwindcss/vite | ^4.0.0 | Tailwind v4 Vite 插件 |
| typescript | ^5.7.2 | TS |
| vue-tsc | ^2.2.0 | Vue 类型检查（build 前置） |

## Vite 配置（`vite.config.ts`）

- 插件：`vue()`、（非 production）`vueDevTools()`、`tailwindcss()`。
- resolve.alias：
  - `@` -> `<pkg>/src`
  - `vue` -> `vue/dist/vue.esm-bundler.js`（启用运行时模板编译，供插件路由动态模板使用）
- server.host: `0.0.0.0`。
- server.proxy：`/api`、`/health` -> `http://127.0.0.1:8081`（`changeOrigin: true`），指向 mira-app-server。

## TypeScript 配置（`tsconfig.json`）

- target ES2022，lib ES2022 + DOM，`strict`、`noUnusedLocals`、`noUnusedParameters`、`isolatedModules`、`noEmit`。
- `moduleResolution: bundler`，`paths: { "@/*": ["./src/*"] }`。
- include: `src/**/*.ts|tsx|vue`。构建增量信息见 `tsconfig.tsbuildinfo`。

## shadcn-vue 配置（`components.json`）

- `$schema`: shadcn-vue schema。
- style: `reka-mira`（自定义样式）。
- font: `inter`，baseColor: `zinc`，iconLibrary: `remixicon`，typescript: true，cssVariables: true，pointer: true，rtl: false。
- tailwind.css: `src/assets/index.css`。
- aliases: components=`@/components`，utils=`@/lib/utils`，ui=`@/components/ui`，lib=`@/lib`，composables=`@/composables`。

## 运行时 API Base URL

- 由 `src/api/client.ts` 管理，可运行时切换（App.vue 右下角弹窗）。
- 规则：取 `localStorage.api_base_url` || `VITE_API_BASE_URL` || `//<当前 host>:8081/api`，再 `normalizeBaseURL`（去末尾 `/` 和 `/api` 后补 `/api`）。
- 暴露：`setApiBaseURL(url)`、`getApiBaseURL()`、`getDefaultBaseURL()`。

## 环境变量

| 变量 | 默认（未设置时） | 说明 |
|------|------------------|------|
| `VITE_API_BASE_URL` | `//<host>:8081/api`（运行时拼装） | API 基础路径；可被 localStorage 同名键覆盖 |

## 与本仓 mira-client 的关系

本仓（mira monorepo）下还存在 `mira-client` 子包，二者均为前端但职责不同：mira-dashboard-next = Web 管理面板（shadcn-vue + Tailwind v4），mira-client = 客户端/用户侧前端（具体定位以该包 CLAUDE 文档为准）。本包迁移自旧 `mira-dashboard`（Vben Admin）。

## 其他文件

- `index.html`：HTML 模板（`<div id="app">`）。
- `public/`：静态公共资源。
- `dist/`：构建产物（gitignored）。
- `docs/`：项目文档目录（未深入扫描）。
- `.agents/`、`.gitignore`、`skills-lock.json`、`package-lock.json`：辅助文件（本包虽在 pnpm monorepo 中，但仍保留了一份 `package-lock.json`，未扫描其使用）。
