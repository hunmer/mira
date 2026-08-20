# src/renderer/stores - 状态管理

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > **stores**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | Store 10→15:新增 dashboard.ts、dashboardLayout.ts、homeSidebarLayout.ts、urlImport.ts、viewHistory.ts(v2.x) |
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航、Store 详情 |

## 概述

Pinia 状态管理目录，包含所有应用状态。全部 Store 支持持久化到 localStorage。

## Store 列表

| Store | 描述 |
|-------|------|
| `media.ts` | 媒体文件核心状态（文件列表/选择/过滤） |
| `auth.ts` | 用户认证、会话管理、登录/登出 |
| `plugin.ts` | 插件市场、安装/卸载/启用/禁用 |
| `settings.ts` | 应用配置、服务器设置、主题 |
| `serverList.ts` | 服务器列表管理 |
| `tag.ts` | 标签管理 |
| `folder.ts` | 文件夹管理 |
| `uploadHistory.ts` | 上传历史记录 |
| `library.ts` | 媒体库管理 |
| `appState.ts` | 应用全局状态 |
| `dashboard.ts` | Dashboard Web URL 管理（v2.x 新增） |
| `dashboardLayout.ts` | Dashboard 布局持久化（多 layout 版本，v2.x 新增） |
| `homeSidebarLayout.ts` | Home 侧边栏已启用模块的有序列表持久化（v2.x 新增） |
| `urlImport.ts` | 「从 URL 导入」全局对话框状态（UrlImportDialog 挂 App.vue 根，v2.x 新增） |
| `viewHistory.ts` | 预览路由浏览历史（详情面板「最近查看」，v2.x 新增） |
| `index.ts` | 导出入口 + `initializeStores()` + `clearAllStores()` |

## 状态持久化

所有 Store 使用 Pinia 持久化插件自动持久化到 localStorage。

## 使用方式

```typescript
import { useAuthStore } from '@renderer/stores/auth'
import { useMediaStore } from '@renderer/stores/media'

const auth = useAuthStore()
const media = useMediaStore()
```

## 初始化

通过 `index.ts` 的 `initializeStores()` 函数按顺序初始化所有 Store:

1. DataMigration.autoMigrate()
2. settingsStore.initialize()
3. serverListStore.initializeServerList()
4. authStore.restoreAuthState()
5. libraryStore.restoreLibraryState()
6. mediaStore.restoreMediaState()
7. pluginStore.restorePluginState()
