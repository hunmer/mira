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

### MainLayout 子路由（11 个业务页面）

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
| `/media` | Media | `views/mira/media/index.vue`（ThumbnailCard/MetadataCard/DatabaseScanCard；原 `/thumbnail` 页已并入） | super, admin |
| `/profile` | Profile | `views/mira/profile/index.vue` | 登录用户 |
| `/settings` | Settings | `views/mira/settings/index.vue`（服务端设置 + cookie 站点管理） | 登录用户 |

> 注：`statistics`、`profile`、`overview`、`settings` 未设置 `roles` meta（登录用户均可访问）。

### 动态插件路由

- 由 `src/router/pluginRoutes.ts` 在运行时通过 `router.addRoute('MainLayout', ...)` 注册。
- 来源：`GET /plugins/by-library`（列出各 library）+ `GET /plugin-routes/:libraryId`（取 `PluginRoute[]`）。
- 路由名形如 `plugin_<libraryId>_<route.name>`，meta 标记 `isPlugin: true`、`libraryId`。

## API 层（axios → mira-app-core SDK）

- **主通道**：`src/lib/miraClient.ts` 的 `getMiraClient()`（mira-app-core `MiraClient` 单例；token 取 `localStorage.token`，baseURL 跟随 `api/client.ts` 运行时配置，变更自动重建）。
- `src/api/modules/*`（13 个）为薄封装，12 个内部调 SDK；`src/api/client.ts` 保留 axios 实例 + `setApiBaseURL/getApiBaseURL/getDefaultBaseURL`（baseURL 规范化与持久化）。`src/api/index.ts` 聚合导出。

| 导出名 | 文件 (`src/api/modules/`) | 主要端点/能力 |
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
| `thumbnailApi` | `thumbnail.ts` | scan, progress, cancel, stats, sync（由 `/media` 页消费） |
| `cookieSiteApi` | `cookieSites.ts` | cookie 站点 CRUD（下载用，2026-08-11 后新增） |
| `downloadApi` | `download.ts` | `batchImportFromUrls` 批量 URL 导入 + DownloadProgress（新增） |

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
| `LibraryTreeSelect` / `LibraryTreeNode` | `components/LibraryTree*.vue` | 素材库文件夹/标签树选择（新增） |
| `StatCard` | `components/common/StatCard.vue` | 统计卡片 |
| `PageLoading` | `components/common/PageLoading.vue` | 页面加载态（新增） |
| shadcn-vue 组件 | `components/ui/*`（30 个） | accordion, alert-dialog, avatar, badge, breadcrumb, button, card, chart, combobox, dialog, dropdown-menu, form, input, input-group, label, popover, progress, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, stepper, switch, table, tabs, textarea, tooltip |

## 插件运行时全局对象（window）

| 全局对象 | 来源 | 用途 |
|----------|------|------|
| `window.MiraDashboard` | `getDashboardContext()` | `getLibraries()`、`getUser()`、`getApiBase()` |
| `window.MiraDashboardUI` | `pluginRuntime.ts` | 一批 shadcn-vue 组件，供插件页面直接使用 |
| `window.MiraPluginComponents` | 插件脚本 eval 写入 | `<pluginName>_<comp>` -> 组件定义，供 `resolvePluginComponent` 取用 |
