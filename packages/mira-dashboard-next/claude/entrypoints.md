# 入口与启动流程

## 应用入口

`src/main.ts`：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

import 'vue-sonner/style.css'
import './assets/index.css'

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
```

启动顺序：创建 App → 安装 Pinia（状态）→ 安装 Router（含权限守卫）→ 安装 i18n → 挂载到 `#app`（见 `index.html`）。

## 根组件 `App.vue`

- 渲染全局 `<Toaster />`（vue-sonner）与 `<router-view />`。
- 在非 auth 页面（`route.meta.requiresAuth` 为 false，如登录/注册）右下角显示浮动按钮，点击弹出 Dialog 配置 API Base URL（调 `setApiBaseURL`，持久化到 `localStorage`，并提供恢复默认）。

## 构建命令

| 命令 | 实际执行 | 说明 |
|------|----------|------|
| `pnpm dev` | `vite` | 开发服务器。`host: 0.0.0.0`；代理 `/api`、`/health` -> `http://127.0.0.1:8081`（mira-app-server）；非 production 启用 `vite-plugin-vue-devtools` |
| `pnpm build` | `vue-tsc -b && vite build` | 先 `vue-tsc -b`（基于项目引用的类型检查，`tsconfig.tsbuildinfo`）再 `vite build`，输出到 `dist/` |
| `pnpm preview` | `vite preview` | 预览构建产物 |

无 test 脚本。

## 路由初始化（守卫）

`src/router/index.ts` 的 `router.beforeEach`：

1. 若 URL 带 `?token=`，写入 `localStorage.token` 与 `auth.token`，调用 `authApi.me()` 拉取用户并持久化，随后清除 `token` 查询参数。
2. 目标 `requiresAuth !== false` 且未登录 -> 重定向 `/login?redirect=<fullPath>`。
3. 目标为 `NotFound` 且已登录 -> 触发 `registerAllPluginRoutes(router)` 注册插件路由后重新解析；仍为 NotFound 则展示 404。
4. `meta.roles` 非空且当前角色不在列表 -> 重定向 `/overview`。
5. `meta.libraryId` 存在 -> 调 `useAppStore().setCurrentLibrary(libraryId)`。

## 插件运行时初始化

- 在首次注册插件路由时调用 `ensurePluginRuntime()`（见 `pluginRoutes.ts` -> `registerPluginRoutes`）。
- 该函数将 `getDashboardContext()` 挂到 `window.MiraDashboard`，将一批 shadcn-vue 组件挂到 `window.MiraDashboardUI`，供插件脚本通过这些全局对象渲染页面。
- 插件组件来源：`GET /plugin-routes/:libraryId` 返回的 `PluginRoute[]`；按 `builder()`（返回 HTML 模板字符串）或 `component`（拉取 `/plugins/:lib/:plugin/:comp` 脚本并 eval，结果存于 `window.MiraPluginComponents`）解析；失败回退到默认占位组件。
