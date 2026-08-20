# 文件清单

> 基于实际目录扫描，更新于 2026-08-20。相对 `mira-dashboard-next/` 包根。

## 根目录

| 路径 | 说明 |
|------|------|
| `package.json` | 包元数据与脚本 |
| `package-lock.json` | npm 锁文件（monorepo 下保留，未深究） |
| `pnpm` 依赖通过 workspace 安装 | — |
| `tsconfig.json` | TS 配置（strict、`@/*` 别名） |
| `tsconfig.tsbuildinfo` | vue-tsc 增量构建信息 |
| `vite.config.ts` | Vite 配置（vue/tailwind 插件、alias、proxy） |
| `index.html` | HTML 入口模板 |
| `components.json` | shadcn-vue 生成配置 |
| `README.md` | 项目说明 |
| `skills-lock.json` | 技能锁文件（辅助） |
| `.gitignore` | git 忽略规则 |
| `.agents/` | agent 配置目录（未深扫） |
| `docs/` | 项目文档目录（未深扫） |
| `dist/` | 构建产物（gitignored） |
| `public/` | 静态公共资源 |
| `node_modules/` | 依赖 |

## src/ 核心

| 路径 | 说明 |
|------|------|
| `src/main.ts` | 应用入口 |
| `src/App.vue` | 根组件（Toaster + router-view + API Base 配置弹窗） |
| `src/pluginRuntime.ts` | 插件运行时（暴露 MiraDashboard / MiraDashboardUI 全局对象） |
| `src/env.d.ts` | Vite 环境类型声明 |

## src/router

| 路径 | 说明 |
|------|------|
| `src/router/index.ts` | 路由表（hash 模式） + 权限守卫 + URL token 自动登录 |
| `src/router/pluginRoutes.ts` | 动态注册插件路由（拉取/eval 插件脚本） |

## src/stores

| 路径 | 说明 |
|------|------|
| `src/stores/auth.ts` | 认证 store（token/user/login/logout） |
| `src/stores/app.ts` | 应用 store（sidebar/currentLibrary） + getDashboardContext |

## src/api

| 路径 | 说明 |
|------|------|
| `src/api/client.ts` | axios 实例（拦截器、token、动态 baseURL；现为 baseURL/token 配置源） |
| `src/api/index.ts` | 模块聚合导出 |
| `src/lib/miraClient.ts` | **mira-app-core SDK 单例** `getMiraClient()`（token/baseURL 运行时注入）（新增） |
| `src/api/modules/auth.ts` | 认证 API |
| `src/api/modules/admin.ts` | 管理员 API |
| `src/api/modules/library.ts` | 素材库 API |
| `src/api/modules/plugin.ts` | 插件 API |
| `src/api/modules/device.ts` | 设备 API |
| `src/api/modules/file.ts` | 文件上传 API |
| `src/api/modules/fileManager.ts` | 文件管理 API |
| `src/api/modules/statistics.ts` | 统计 API |
| `src/api/modules/system.ts` | 系统 API |
| `src/api/modules/settings.ts` | 服务端设置 API |
| `src/api/modules/thumbnail.ts` | 缩略图 API（由 /media 页消费） |
| `src/api/modules/cookieSites.ts` | cookie 站点 API（新增） |
| `src/api/modules/download.ts` | 批量 URL 导入 API（新增） |

## src/components

| 路径 | 说明 |
|------|------|
| `src/components/PathTreeSelect.vue` | 路径树选择器 |
| `src/components/PathTreeNode.vue` | 路径树节点 |
| `src/components/LibraryTreeSelect.vue` / `LibraryTreeNode.vue` | 素材库文件夹/标签树选择（新增） |
| `src/components/common/StatCard.vue` | 统计卡片 |
| `src/components/common/PageLoading.vue` | 页面加载态（新增） |
| `src/components/ui/accordion/` | shadcn-vue accordion |
| `src/components/ui/alert-dialog/` | alert-dialog（新增） |
| `src/components/ui/avatar/` | avatar |
| `src/components/ui/badge/` | badge |
| `src/components/ui/breadcrumb/` | breadcrumb |
| `src/components/ui/button/` | button |
| `src/components/ui/card/` | card |
| `src/components/ui/chart/` | chart（@unovis） |
| `src/components/ui/combobox/` | combobox（新增，12 个子组件） |
| `src/components/ui/dialog/` | dialog |
| `src/components/ui/dropdown-menu/` | dropdown-menu |
| `src/components/ui/form/` | form（vee-validate 集成） |
| `src/components/ui/input/` | input |
| `src/components/ui/input-group/` | input-group（新增，7 个子组件） |
| `src/components/ui/label/` | label |
| `src/components/ui/popover/` | popover |
| `src/components/ui/progress/` | progress |
| `src/components/ui/scroll-area/` | scroll-area |
| `src/components/ui/select/` | select |
| `src/components/ui/separator/` | separator |
| `src/components/ui/sheet/` | sheet |
| `src/components/ui/sidebar/` | sidebar |
| `src/components/ui/skeleton/` | skeleton |
| `src/components/ui/sonner/` | sonner（toast） |
| `src/components/ui/stepper/` | stepper |
| `src/components/ui/switch/` | switch |
| `src/components/ui/table/` | table |
| `src/components/ui/tabs/` | tabs |
| `src/components/ui/textarea/` | textarea |
| `src/components/ui/tooltip/` | tooltip |

## src/views

| 路径 | 说明 |
|------|------|
| `src/views/auth/login.vue` | 登录页 |
| `src/views/auth/register.vue` | 注册页 |
| `src/views/auth/not-found.vue` | 404 页面 |
| `src/views/mira/overview/index.vue` | 概览（统计/系统信息/最近活动/设置） |
| `src/views/mira/library/index.vue` | 素材库管理 |
| `src/views/mira/library/LibraryFormDialog.vue` | 素材库表单对话框 |
| `src/views/mira/library/ShareDialog.vue` | 素材库分享对话框（qrcode）（新增） |
| `src/views/mira/plugin/index.vue` | 插件管理 |
| `src/views/mira/plugin/InstallTerminalDialog.vue` | 插件安装终端对话框（新增） |
| `src/views/mira/admin/index.vue` | 管理员面板（super） |
| `src/views/mira/admin/TokenManageDialog.vue` | Token 管理对话框（新增） |
| `src/views/mira/database/index.vue` | 数据库预览 |
| `src/views/mira/device/index.vue` | 设备管理 |
| `src/views/mira/file-manager/index.vue` | 文件管理 |
| `src/views/mira/statistics/index.vue` | 统计数据 |
| `src/views/mira/media/index.vue` | 媒体维护页（新增；ThumbnailCard/MetadataCard/DatabaseScanCard） |
| `src/views/mira/settings/index.vue` | 服务端设置 + cookie 站点管理（新增） |
| `src/views/mira/profile/index.vue` | 个人资料 |

> 注：原 `src/views/mira/thumbnail/` 目录与 `/thumbnail` 路由已移除（缩略图管理并入 `/media`）。

## 其他 src/ 目录

| 路径 | 说明 |
|------|------|
| `src/layouts/DefaultLayout.vue` | 主布局（Sidebar + 顶栏） |
| `src/composables/useTheme.ts` | 主题（浅色/深色/跟随系统） |
| `src/composables/useLibrary.ts` | 素材库组合式函数 |
| `src/composables/useBroadcast.ts` | 广播通信 |
| `src/composables/useConfirmDialog.ts` | 确认对话框（新增） |
| `src/composables/usePluginSources.ts` | 插件源（新增） |
| `src/i18n/index.ts` | vue-i18n 配置（legacy:false，默认 zh-CN） |
| `src/i18n/locales/zh-CN.ts` | 中文翻译 |
| `src/i18n/locales/en.ts` | 英文翻译 |
| `src/types/auth.ts` | 认证类型（User） |
| `src/types/mira.ts` | 业务类型（Library/ServerSettings 等） |
| `src/lib/utils.ts` | 工具（`cn` 等） |
| `src/assets/index.css` | Tailwind 入口 + CSS 变量 |
| `src/assets/fonts/` | 字体文件 |
