# 文件清单

## 核心文件

| 文件 | 说明 |
|------|------|
| `src/main.ts` | 应用入口 |
| `src/App.vue` | 根组件 |
| `src/env.d.ts` | 环境类型声明 |
| `src/pluginRuntime.ts` | 插件运行时 |
| `src/vite.config.ts` | Vite 构建配置 |

## 路由

| 文件 | 说明 |
|------|------|
| `src/router/index.ts` | 路由配置 + 权限守卫 |
| `src/router/pluginRoutes.ts` | 插件动态路由 |

## Store

| 文件 | 说明 |
|------|------|
| `src/stores/auth.ts` | 认证 Store |
| `src/stores/app.ts` | 应用 Store |

## API

| 文件 | 说明 |
|------|------|
| `src/api/client.ts` | axios 封装 |
| `src/api/index.ts` | API 模块聚合 |
| `src/api/modules/*.ts` | 11 个 API 模块 |

## 视图

| 文件 | 说明 |
|------|------|
| `src/views/auth/login.vue` | 登录页 |
| `src/views/auth/register.vue` | 注册页 |
| `src/views/auth/not-found.vue` | 404 页面 |
| `src/views/mira/overview/index.vue` | 概览 |
| `src/views/mira/library/index.vue` | 素材库管理 |
| `src/views/mira/library/LibraryFormDialog.vue` | 素材库表单对话框 |
| `src/views/mira/plugin/index.vue` | 插件管理 |
| `src/views/mira/admin/index.vue` | 管理员面板 |
| `src/views/mira/database/index.vue` | 数据库管理 |
| `src/views/mira/device/index.vue` | 设备管理 |
| `src/views/mira/file-manager/index.vue` | 文件管理 |
| `src/views/mira/statistics/index.vue` | 统计数据 |
| `src/views/mira/thumbnail/index.vue` | 缩略图管理 |
| `src/views/mira/profile/index.vue` | 个人资料 |

## 其他

| 文件 | 说明 |
|------|------|
| `src/layouts/DefaultLayout.vue` | 主布局 |
| `src/composables/useLibrary.ts` | 素材库组合式函数 |
| `src/composables/useTheme.ts` | 主题管理 |
| `src/composables/useBroadcast.ts` | 广播通信 |
| `src/i18n/index.ts` | 国际化配置 |
| `src/i18n/locales/zh-CN.ts` | 中文翻译 |
| `src/i18n/locales/en.ts` | 英文翻译 |
| `src/types/auth.ts` | 认证类型 |
| `src/types/mira.ts` | 业务类型 |
| `src/lib/utils.ts` | 工具函数 |
| `src/components/common/` | 业务组件 |
| `src/components/ui/` | shadcn-vue 组件 (~150+ 自动生成) |
