# 模块职责

> 按 `src/` 顶层目录划分。扫描于 2026-08-05。

## 顶层文件

| 文件 | 职责 |
|------|------|
| `main.ts` | 应用入口：创建 Vue App，注册 Pinia/Router/i18n，挂载 `#app`；载入全局样式（`vue-sonner/style.css`、`assets/index.css`） |
| `App.vue` | 根组件：全局 `Toaster` + `<router-view/>`；在非 auth 页面提供右下角浮动按钮，弹窗配置 API Base URL（setApiBaseURL/getApiBaseURL/getDefaultBaseURL） |
| `pluginRuntime.ts` | 插件运行时：`ensurePluginRuntime()` 将 dashboard 上下文（`window.MiraDashboard` = getDashboardContext）与一批 shadcn-vue 组件（`window.MiraDashboardUI`）暴露给插件组件使用 |
| `env.d.ts` | Vite 环境类型声明 |

## 目录职责

| 目录 | 职责 |
|------|------|
| `api/` | API 客户端。`client.ts`=axios 实例（拦截器/token/动态 baseURL），`index.ts`=模块聚合导出，`modules/`=11 个业务 API 模块 |
| `assets/` | 静态资源：`index.css`（Tailwind 入口 + CSS 变量）、`fonts/` |
| `components/` | 组件。`ui/`=27 个 shadcn-vue 自动生成组件；`common/`=业务公共组件（StatCard）；根目录下 `PathTreeSelect.vue`、`PathTreeNode.vue`=路径树选择器 |
| `composables/` | 组合式函数：`useTheme`（主题）、`useLibrary`（素材库）、`useBroadcast`（广播通信） |
| `i18n/` | vue-i18n 配置与语言包（`locales/zh-CN.ts`、`locales/en.ts`） |
| `layouts/` | 布局：`DefaultLayout.vue`（侧边栏 Sidebar + 顶栏主布局，为 `MainLayout` 路由组件） |
| `lib/` | 工具：`utils.ts`（`cn` 类名合并等） |
| `router/` | 路由。`index.ts`=路由表 + 权限守卫 + URL token 自动登录；`pluginRoutes.ts`=插件动态路由注册（拉取 `/plugin-routes/:libraryId`，eval 插件脚本，挂到 `window.MiraPluginComponents`） |
| `stores/` | Pinia stores：`auth`（token/user/login/logout）、`app`（sidebar 折叠、当前 library、`getDashboardContext` 插件接口） |
| `types/` | TypeScript 类型：`auth.ts`（User）、`mira.ts`（业务实体：Library/Plugin/...） |
| `views/` | 页面视图。`auth/`=登录、注册、404；`mira/`=10 个业务页面（overview/library/plugin/admin/database/device/file-manager/statistics/thumbnail/profile） |

## 路由层级与布局

- 顶层路由：`/login`、`/register`（公开）、`/:pathMatch(.*)*`（404）。
- 主框架：`/` -> `DefaultLayout.vue`（`requiresAuth: true`），其 `children` 为 10 个业务页面（见 public-interfaces 路由表）。`/` 重定向到 `/overview`。
- 插件路由：动态 `addRoute('MainLayout', ...)`，路径为相对子路径，meta 标记 `isPlugin: true` 与 `libraryId`。
