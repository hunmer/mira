# 公开接口

## 页面路由

路由采用 hash 模式（`createWebHashHistory`），表见 `src/router/index.ts`。

### 顶层路由

| 路径 | 组件 | 鉴权 |
|------|------|------|
| `/login` | `views/auth/login.vue` | 公开（`requiresAuth: false`） |
| `/register` | `views/auth/register.vue` | 公开 |
| `/` | `layouts/DefaultLayout.vue`（MainLayout） | 需登录；`/` -> 重定向 `/overview` |
| `/:pathMatch(.*)*` | `views/auth/not-found.vue` | NotFound；已登录时尝试匹配插件路由 |

### MainLayout 子路由（10 个业务页面）

| 路径 | name | 组件 | 角色限制 |
|------|------|------|----------|
| `/overview` | Overview | `views/mira/overview/index.vue` | 登录用户 |
| `/library` | Library | `views/mira/library/index.vue` | super, admin |
| `/plugin` | Plugin | `views/mira/plugin/index.vue` | super, admin |
| `/admin` | Admin | `views/mira/admin/index.vue` | super |
| `/database` | Database | `views/mira/database/index.vue` | super, admin |
| `/device` | Device | `views/mira/device/index.vue` | super, admin |
| `/file-manager` | FileManager | `views/mira/file-manager/index.vue` | super, admin |
| `/statistics` | Statistics | `views/mira/statistics/index.vue` | 登录用户 |
| `/thumbnail` | Thumbnail | `views/mira/thumbnail/index.vue` | super, admin |
| `/profile` | Profile | `views/mira/profile/index.vue` | 登录用户 |

> 注：`statistics`、`profile`、`overview` 未设置 `roles` meta（登录用户均可访问）。

### 动态插件路由

- 由 `src/router/pluginRoutes.ts` 在运行时通过 `router.addRoute('MainLayout', ...)` 注册。
- 来源：`GET /plugins/by-library`（列出各 library）+ `GET /plugin-routes/:libraryId`（取 `PluginRoute[]`）。
- 路由名形如 `plugin_<libraryId>_<route.name>`，meta 标记 `isPlugin: true`、`libraryId`。

## API 模块

统一经 `src/api/client.ts`（axios），baseURL 动态可配（见 dependencies-and-config）。`src/api/index.ts` 聚合导出。

| 导出名 | 文件 (`src/api/modules/`) | 主要端点（基于既有文档/扫描） |
|--------|---------------------------|--------------------------------|
| `authApi` | `auth.ts` | login, register, me, logout, changePassword, uploadAvatar |
| `adminApi` | `admin.ts` | list, create, update, delete |
| `libraryApi` | `library.ts` | list, get, create, update, delete, toggleStatus |
| `pluginApi` | `plugin.ts` | list, listByLibrary, get, updateStatus, configure, install, uninstall |
| `deviceApi` | `device.ts` | list, disconnect |
| `fileApi` | `file.ts` | upload, uploadProgress |
| `fileManagerApi` | `fileManager.ts` | list, move, remove |
| `statisticsApi` | `statistics.ts` | upload, daily, fileTypes, recentUploads |
| `systemApi` | `system.ts` | health, stats |
| `settingsApi` | `settings.ts` | get, update |
| `thumbnailApi` | `thumbnail.ts` | scan, progress, cancel, stats, sync |

## Pinia Store

| Store | 文件 | 关键状态/方法 |
|-------|------|----------------|
| `useAuthStore` (`auth`) | `stores/auth.ts` | `token`、`user`、`isLoggedIn`、`userRole`、`login(u,p)`、`logout()`；持久化到 localStorage |
| `useAppStore` (`app`) | `stores/app.ts` | `sidebarCollapsed`、`currentLibraryId`、`toggleSidebar()`、`setCurrentLibrary(id)`；并导出 `getDashboardContext()`（插件上下文）与 `MiraDashboardContext` 接口 |

## 共享组件

| 组件 | 路径 | 用途 |
|------|------|------|
| `PathTreeSelect` | `components/PathTreeSelect.vue` | 路径树选择器 |
| `PathTreeNode` | `components/PathTreeNode.vue` | 路径树节点 |
| `StatCard` | `components/common/StatCard.vue` | 统计卡片 |
| shadcn-vue 组件 | `components/ui/*`（27 个） | accordion, avatar, badge, breadcrumb, button, card, chart, dialog, dropdown-menu, form, input, label, popover, progress, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, stepper, switch, table, tabs, textarea, tooltip |

## 插件运行时全局对象（window）

| 全局对象 | 来源 | 用途 |
|----------|------|------|
| `window.MiraDashboard` | `getDashboardContext()` | `getLibraries()`、`getUser()`、`getApiBase()` |
| `window.MiraDashboardUI` | `pluginRuntime.ts` | 一批 shadcn-vue 组件，供插件页面直接使用 |
| `window.MiraPluginComponents` | 插件脚本 eval 写入 | `<pluginName>_<comp>` -> 组件定义，供 `resolvePluginComponent` 取用 |
