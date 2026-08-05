# 数据模型（Pinia Store 与类型）

> 前端无本地数据库，数据模型 = Pinia store + TypeScript 类型 + 服务端实体镜像。扫描于 2026-08-05。

## Pinia Store

### `useAuthStore` —— `src/stores/auth.ts`

setup-style store。

| 成员 | 类型 | 说明 |
|------|------|------|
| `token` | `Ref<string>` | JWT，初始化自 `localStorage.token` |
| `user` | `Ref<User \| null>` | 当前用户，初始化自 `localStorage.user`（JSON.parse） |
| `isLoggedIn` | `ComputedRef<boolean>` | `!!token` |
| `userRole` | `ComputedRef<string>` | `user?.role \|\| ''` |
| `login(username, password)` | `(string,string) => Promise<void>` | 调 `authApi.login`，取 `data.accessToken` 持久化 token；优先用响应中的 `data.user`，否则再调 `authApi.me()` 补全；失败抛错 |
| `logout()` | `() => void` | 清空 token/user 与 localStorage |

### `useAppStore` —— `src/stores/app.ts`

setup-style store。

| 成员 | 类型 | 说明 |
|------|------|------|
| `sidebarCollapsed` | `Ref<boolean>` | 侧栏折叠状态（默认 false） |
| `currentLibraryId` | `Ref<string>` | 当前选中素材库 id |
| `toggleSidebar()` | `() => void` | 切换折叠 |
| `setCurrentLibrary(id)` | `(string) => void` | 设置当前 library |

附带导出（非 store 成员）：

- `MiraDashboardContext` 接口：`getLibraries(): Promise<Library[]>`、`getUser(): { id; username; role; ... } | null`、`getApiBase(): string`。
- `getDashboardContext(): MiraDashboardContext`：返回挂到 `window.MiraDashboard` 的插件上下文实现（`getLibraries` 调 `libraryApi.list`，`getUser` 读 `useAuthStore().user`，`getApiBase` 固定返回 `'/api'`）。

## 持久化键（localStorage）

| 键 | 写入处 | 内容 |
|----|--------|------|
| `token` | auth store / 路由守卫 | JWT accessToken |
| `user` | auth store | User 对象 JSON |
| `locale` | i18n（未在 `i18n/index.ts` 中显式写入，仅读取） | 语言代码（如 `zh-CN`） |
| `api_base_url` | `setApiBaseURL` | 自定义 API 基础地址 |

## TypeScript 类型

### `src/types/auth.ts`

- `User`：用户实体（含 `id`、`username`、`email`、`role`、`createdAt`、`updatedAt` 等；具体字段以文件为准）。`auth` store 在登录失败兜底时构造 `{ id:'', username, email:'', role:'user', createdAt:'', updatedAt:'' }`。

### `src/types/mira.ts`

- 业务实体镜像（服务端模型的前端类型）：
  - `Library`：素材库（被 `useAppStore`/`getDashboardContext` 引用）
  - `ServerSettings`：服务端设置（`overview` 页使用：`authRequired`、`allowRegistration`、`dashboardPort` 等）
  - 其他：Plugin / 统计 / 设备 / 文件管理 / 缩略图等相关类型（具体以文件为准，未逐一展开扫描）

## 权限角色（来自路由守卫与服务端）

| 角色 | 可访问 |
|------|--------|
| `super` | 全部 |
| `admin` | 除 `/admin`（管理员管理）外的受保护页 |
| `user` | `/overview`、`/statistics`、`/profile` |
| 未登录 | 仅 `/login`、`/register`（其他跳转登录） |

## 服务端数据来源

所有业务数据来自 mira-app-server 的 REST API（见 public-interfaces 的 API 模块表），前端不持有独立数据存储。文件上传/缩略图等通过对应 API 模块与服务端交互。
