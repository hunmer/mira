# 公开接口

## 页面路由 (11 个功能页面 + 3 个认证页面)

| 路径 | 页面 | 权限 |
|------|------|------|
| `/login` | `views/auth/login.vue` | 公开 |
| `/register` | `views/auth/register.vue` | 公开 |
| `/overview` | `views/mira/overview/index.vue` | 登录用户 |
| `/library` | `views/mira/library/index.vue` | super, admin |
| `/plugin` | `views/mira/plugin/index.vue` | super, admin |
| `/admin` | `views/mira/admin/index.vue` | super |
| `/database` | `views/mira/database/index.vue` | super, admin |
| `/device` | `views/mira/device/index.vue` | super, admin |
| `/file-upload` | `views/mira/file-upload/index.vue` | -- |
| `/file-manager` | `views/mira/file-manager/index.vue` | super, admin |
| `/statistics` | `views/mira/statistics/index.vue` | super, admin |
| `/thumbnail` | `views/mira/thumbnail/index.vue` | super, admin |
| `/profile` | `views/mira/profile/index.vue` | 登录用户 |
| `/:pathMatch(.*)*` | `views/auth/not-found.vue` | -- |

## API 模块 (11 个)

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

## Pinia Store (2 个)

| Store | 文件 | 说明 |
|-------|------|------|
| authStore | `stores/auth.ts` | token, user, isLoggedIn, userRole |
| appStore | `stores/app.ts` | currentLibrary |

## 共享组件

| 组件 | 用途 |
|------|------|
| PathTreeSelect | 路径树选择器 |
| StatCard | 统计卡片 |
