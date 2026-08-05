# 总览

## 项目定位

mira-dashboard-next 是 Mira 项目的 Web 管理面板（pnpm monorepo 子包，`private: true`）。基于 Vue 3.5 + Tailwind CSS 4 + shadcn-vue（reka-ui）构建，替代旧版基于 Vben Admin 的实现。作为纯前端 SPA 与后端服务 mira-app-server（默认 `127.0.0.1:8081`）通过 REST API 通信。

## 核心功能

1. **仪表盘概览**: 系统状态卡片、系统信息、最近活动、服务端设置（认证/注册开关）
2. **素材库管理**: CRUD + 启用/禁用
3. **插件管理**: 安装/卸载/启用/配置/商店
4. **管理员面板**: 用户管理（super 角色专属）
5. **数据库预览**: 表浏览、数据查看
6. **设备管理**: 连接设备查看/断开
7. **文件管理**: 文件浏览/移动/删除
8. **统计数据**: 上传统计/每日统计/文件类型/最近上传
9. **缩略图管理**: 扫描/进度/取消/统计/同步
10. **个人资料**: 用户信息、改密、头像
11. **认证**: 登录/注册 + URL `?token=` 自动登录
12. **i18n**: 中文（zh-CN，默认）/英文，运行时切换
13. **插件前端路由**: 动态注册插件提供的页面（eval 插件脚本，挂载到 `window.MiraPluginComponents`）

## 入口

- 应用入口: `src/main.ts` —— createApp + Pinia + Router + i18n，挂载 `#app`
- 根组件: `src/App.vue` —— 全局 Toaster + `router-view` + 非 auth 页面右下角 API Base URL 配置弹窗
- 构建: `vue-tsc -b && vite build`（类型检查 + 打包）
- 开发: `pnpm run dev`（Vite，代理 `/api`、`/health` 到 mira-app-server）

## 认证架构

认证由服务端核心（mira-app-server）实现：

- UserStorage：基于 SQLite 的用户管理
- AuthRouter：HTTP REST 认证端点（login/register/me/logout/changePassword/uploadAvatar）
- Token：JWT Bearer，存于 `localStorage`，由 axios 请求拦截器注入
- 权限体系（三级）：`super`（全部）、`admin`（除管理员管理外全部）、`user`（仅概览、统计、个人资料）
- 路由守卫：未登录跳 `/login`；角色不符跳 `/overview`；URL `?token=` 自动登录

## 关键依赖

| 依赖 | 用途 |
|------|------|
| vue ^3.5 | 前端框架 |
| shadcn-vue ^2.7 / reka-ui ^2.9 | UI 组件库（基础原语） |
| tailwindcss ^4 + @tailwindcss/vite | 原子化 CSS（v4 Vite 插件） |
| tw-animate-css | 动画工具 |
| pinia ^3.0 | 状态管理 |
| vue-router ^4.6 | 路由（hash 模式） |
| vue-i18n ^11 | 国际化 |
| axios ^1.16 | HTTP 客户端 |
| vee-validate ^4.15 + @vee-validate/zod + zod 3.25 | 表单验证 |
| @unovis/vue + @unovis/ts ^1.6 | 数据可视化（图表） |
| @tanstack/vue-table ^8.21 | 表格 |
| @vueuse/core ^14.3 | 组合式工具 |
| @remixicon/vue + @lucide/vue | 图标库 |
| class-variance-authority + clsx + tailwind-merge | 样式变体与合并（`cn`） |
| vue-sonner ^2.0 | Toast 通知 |
| vite ^6 + @vitejs/plugin-vue + vue-tsc ^2.2 | 构建/类型 |

## 迁移关系

本包替代旧版 `mira-dashboard`（Vben Admin 实现）。本仓另存在 `mira-client`（见 packages 下其他子包）—— 两者均为前端但定位不同：mira-dashboard-next 是 Web 管理面板，mira-client 通常为客户端/用户侧前端（具体职责以各自 CLAUDE 文档为准）。shadcn-vue 在本包作为唯一 UI 库使用。
