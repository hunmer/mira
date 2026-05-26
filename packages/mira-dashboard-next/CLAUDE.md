[根目录](../../CLAUDE.md) > [packages](..) > **mira-dashboard-next**

# mira-dashboard-next

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-26 | 补扫更新 | 补充 11 个功能页面详细 API/组件/职责说明；认证流程确认 |
| 2026-05-26 | 初始化 | 首次生成模块文档（替代原 mira-dashboard / Vben Admin 版本） |

## 模块职责

Mira Web 管理面板（全新版本），替代原有的基于 Vben Admin 的 `mira-dashboard`。采用 shadcn-vue + Tailwind CSS 4 构建，提供对 Mira 服务端的 Web 管理能力。

核心功能：
1. **仪表盘概览**: 系统状态总览
2. **素材库管理**: CRUD + 启用/禁用
3. **插件管理**: 安装/卸载/配置
4. **管理员面板**: 用户管理（super 角色专属）
5. **数据库管理**: 数据库操作
6. **设备管理**: 连接设备查看/断开
7. **文件上传**: 文件上传功能
8. **文件管理**: 文件浏览/管理
9. **统计数据**: 上传统计/文件类型统计
10. **缩略图管理**: 缩略图生成/扫描/进度
11. **个人资料**: 用户个人信息
12. **认证**: 登录/注册页面，支持 URL Token 自动登录
13. **i18n**: 中英文双语支持（vue-i18n）
14. **插件路由**: 动态注册插件前端路由

## 入口与启动

- **入口文件**: `src/main.ts` -- 创建 Vue App + Pinia + Router + i18n
- **HTML 入口**: `index.html`
- **构建命令**: `vue-tsc -b && vite build`
- **开发命令**: `pnpm run dev` (Vite 开发服务器)
- **预览命令**: `pnpm run preview`

## 认证架构

认证已完全内置到服务端核心（`mira-app-server`），不依赖插件：
- `UserStorage` (431 行)：基于 SQLite 的用户管理、会话管理、密码哈希验证
- `AuthRouter` (402 行)：HTTP REST API 认证端点（login/register/logout/verify）
- `UserRouter` (246 行)：用户信息接口（符合 Vben 框架标准）
- `permission.ts` 中间件：统一 HTTP 权限控制，基于角色（super/admin/user）
- 旧 `mira_user` 插件已完全移除，仅 plugins.json 中保留 `enabled: false` 记录

权限体系：super（全部功能）、admin（除管理员管理外全部）、user（仅概览和个人资料）

## 对外接口

### 页面路由 (11 个功能页面 + 3 个认证页面)

| 路径 | 页面 | 权限 | 说明 |
|------|------|------|------|
| `/login` | `views/auth/login.vue` | 公开 | 登录页 |
| `/register` | `views/auth/register.vue` | 公开 | 注册页 |
| `/overview` | `views/mira/overview/index.vue` | 登录用户 | 系统概览 |
| `/library` | `views/mira/library/index.vue` | super, admin | 素材库管理 |
| `/plugin` | `views/mira/plugin/index.vue` | super, admin | 插件管理 |
| `/admin` | `views/mira/admin/index.vue` | super | 管理员面板 |
| `/database` | `views/mira/database/index.vue` | super, admin | 数据库管理 |
| `/device` | `views/mira/device/index.vue` | super, admin | 设备管理 |
| `/file-upload` | `views/mira/file-upload/index.vue` | super, admin | 文件上传 |
| `/file-manager` | `views/mira/file-manager/index.vue` | super, admin | 文件管理 |
| `/statistics` | `views/mira/statistics/index.vue` | super, admin | 统计数据 |
| `/thumbnail` | `views/mira/thumbnail/index.vue` | super, admin | 缩略图管理 |
| `/profile` | `views/mira/profile/index.vue` | 登录用户 | 个人资料 |
| `/:pathMatch(.*)*` | `views/auth/not-found.vue` | -- | 404 页面 |

### API 模块 (11 个)

| 模块 | 文件 | 主要端点 |
|------|------|---------|
| auth | `api/modules/auth.ts` | login, register, me, logout, changePassword, uploadAvatar |
| admin | `api/modules/admin.ts` | list, create, update, delete |
| library | `api/modules/library.ts` | list, get, create, update, delete, toggleStatus |
| plugin | `api/modules/plugin.ts` | list, listByLibrary, get, updateStatus, configure, install, uninstall |
| device | `api/modules/device.ts` | list, disconnect |
| file | `api/modules/file.ts` | upload, uploadProgress |
| fileManager | `api/modules/fileManager.ts` | list, move, remove |
| statistics | `api/modules/statistics.ts` | upload, daily, fileTypes, recentUploads |
| system | `api/modules/system.ts` | health, stats |
| settings | `api/modules/settings.ts` | get, update |
| thumbnail | `api/modules/thumbnail.ts` | scan, progress, cancel, stats, sync |

### 页面 API 调用详情

| 页面 | 调用端点 |
|------|---------|
| 概览 | GET /libraries, GET /plugins, GET /admins, GET /health, GET/PUT /settings |
| 素材库 | GET/POST /libraries, PUT/DELETE /libraries/{id}, PATCH /libraries/{id}/status |
| 插件 | GET /plugins/by-library, GET /plugins/{name}, POST /plugins/toggle-status, PUT /plugins/{name}/config, POST /plugins/install, DELETE /plugins/{name}, GET /plugin-routes/{libraryId}, POST /plugins/upload |
| 管理员 | GET/POST /admins, PUT/DELETE /admins/{id} |
| 数据库 | GET /database/tables, GET /database/tables/{name}/data, POST /database/query |
| 设备 | GET /devices, POST /devices/{id}/disconnect |
| 文件上传 | POST /files/upload |
| 文件管理 | GET /fs/list, POST /fs/move, POST /fs/remove |
| 统计 | GET /statistics/{libraryId}/upload/daily, GET /statistics/{libraryId}/upload, GET /statistics/{libraryId}/file-types, GET /statistics/{libraryId}/recent-uploads |
| 缩略图 | GET /thumb/stats, GET /thumb/scan, GET /thumb/progress, GET /thumb/cancel, GET /thumb/sync |
| 个人资料 | GET /user/info, POST /user/avatar, PUT /user/change-password |

### 共享业务组件

| 组件 | 文件 | 用途 |
|------|------|------|
| PathTreeSelect | `components/PathTreeSelect.vue` | 路径树选择器（素材库路径、插件目录、移动目标） |
| PathTreeNode | `components/PathTreeNode.vue` | 路径树节点 |
| StatCard | `components/common/StatCard.vue` | 统计卡片（概览页面） |

### Pinia Store (2 个)

| Store | 文件 | 说明 |
|-------|------|------|
| authStore | `stores/auth.ts` | 认证状态：token, user, isLoggedIn, userRole |
| appStore | `stores/app.ts` | 应用状态：currentLibrary |

### 布局

- `src/layouts/DefaultLayout.vue` -- 主布局（侧边栏 + 内容区）

## 关键依赖与配置

- **UI 框架**: Vue 3.5 + shadcn-vue 2.7 + reka-ui 2.9
- **样式**: Tailwind CSS 4 + tw-animate-css
- **状态管理**: Pinia 3.0
- **路由**: Vue Router 4.6
- **表单**: vee-validate + zod (表单验证)
- **图表**: @unovis/vue (数据可视化)
- **表格**: @tanstack/vue-table
- **图标**: @lucide/vue, @remixicon/vue
- **HTTP**: axios
- **i18n**: vue-i18n 11
- **通知**: vue-sonner
- **构建**: Vite 6 + TypeScript 5.7
- **devtools**: vite-plugin-vue-devtools

## 数据模型

本模块不直接管理数据库，通过 API 调用 `mira-app-server` 的 HTTP 接口。

类型定义：
- `src/types/auth.ts` -- 认证相关类型
- `src/types/mira.ts` -- Mira 业务类型

## 测试与质量

当前未配置测试框架。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/main.ts` | 应用入口 |
| `src/App.vue` | 根组件 |
| `src/router/index.ts` | 路由配置 + 权限守卫 |
| `src/router/pluginRoutes.ts` | 插件动态路由注册 |
| `src/stores/auth.ts` | 认证 Store |
| `src/stores/app.ts` | 应用 Store |
| `src/api/client.ts` | API 客户端（axios 封装） |
| `src/api/index.ts` | API 模块聚合 |
| `src/api/modules/*.ts` | 13 个 API 模块 |
| `src/views/mira/*/index.vue` | 11 个功能页面 |
| `src/views/auth/*.vue` | 3 个认证页面 |
| `src/layouts/DefaultLayout.vue` | 主布局 |
| `src/composables/useLibrary.ts` | 素材库组合式函数 |
| `src/composables/useTheme.ts` | 主题管理 |
| `src/i18n/index.ts` | 国际化配置 |
| `src/i18n/locales/zh-CN.ts` | 中文翻译 |
| `src/i18n/locales/en.ts` | 英文翻译 |
| `src/components/common/StatCard.vue` | 统计卡片组件 |
| `src/components/PathTreeNode.vue` | 路径树节点 |
| `src/components/PathTreeSelect.vue` | 路径树选择器 |
| `src/components/ui/` | shadcn-vue UI 组件库 |
| `src/pluginRuntime.ts` | 插件运行时 |
| `package.json` | 包配置 (v0.0.0, private) |
| `vite.config.ts` | Vite 构建配置 |
