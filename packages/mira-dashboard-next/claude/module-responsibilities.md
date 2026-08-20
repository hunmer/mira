# 模块职责

> 按 `src/` 顶层目录划分。更新于 2026-08-20。

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
| `api/` | API 层。`client.ts`=axios 实例 + baseURL/token 运行时配置（现为配置源）；`index.ts`=模块聚合导出；`modules/`=13 个业务 API 模块（12 个内部调 `lib/miraClient` 的 SDK）。新增：`cookieSites.ts`（cookie 站点）、`download.ts`（批量 URL 导入，`batchImportFromUrls`） |
| `assets/` | 静态资源：`index.css`（Tailwind 入口 + CSS 变量）、`fonts/` |
| `components/` | 组件。`ui/`=30 个 shadcn-vue 组件（新增 combobox/input-group/alert-dialog）；`common/`=StatCard、PageLoading；根目录 `PathTreeSelect/PathTreeNode`、`LibraryTreeSelect/LibraryTreeNode`（素材库文件夹/标签树选择） |
| `composables/` | 组合式函数：`useTheme`、`useLibrary`、`useBroadcast`、`useConfirmDialog`、`usePluginSources` |
| `i18n/` | vue-i18n 配置与语言包（`locales/zh-CN.ts`、`locales/en.ts`） |
| `layouts/` | 布局：`DefaultLayout.vue`（侧边栏 Sidebar + 顶栏主布局，为 `MainLayout` 路由组件） |
| `lib/` | 工具：`utils.ts`（`cn` 类名合并等）；`miraClient.ts`（**mira-app-core SDK 单例** `getMiraClient()`，token/baseURL 运行时注入，变更自动重建） |
| `router/` | 路由。`index.ts`=路由表（11 个业务子路由）+ 权限守卫 + URL token 自动登录；`pluginRoutes.ts`=插件动态路由注册（拉取 `/plugin-routes/:libraryId`，eval 插件脚本，挂到 `window.MiraPluginComponents`） |
| `stores/` | Pinia stores：`auth`（token/user/login/logout）、`app`（sidebar 折叠、当前 library、`getDashboardContext` 插件接口） |
| `types/` | TypeScript 类型：`auth.ts`（User）、`mira.ts`（业务实体：Library/Plugin/...） |
| `views/` | 页面视图。`auth/`=登录、注册、404；`mira/`=11 个业务页面（overview/library/plugin/admin/database/device/file-manager/statistics/media/profile/settings；原 thumbnail 已并入 media） |

## 路由层级与布局

- 顶层路由：`/login`、`/register`（公开）、`/:pathMatch(.*)*`（404）。
- 主框架：`/` -> `DefaultLayout.vue`（`requiresAuth: true`），其 `children` 为 11 个业务页面（见 public-interfaces 路由表）。`/` 重定向到 `/overview`。
- 插件路由：动态 `addRoute('MainLayout', ...)`，路径为相对子路径，meta 标记 `isPlugin: true` 与 `libraryId`。
