# src/renderer/stores - 状态管理

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > **stores**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航、Store 详情 |

## 概述

Pinia 状态管理目录，包含所有应用状态。全部 Store 支持持久化到 localStorage。

## Store 列表

| Store | 行数 | 描述 |
|-------|------|------|
| `media.ts` | 1100 | 媒体文件核心状态（文件列表/选择/过滤） |
| `auth.ts` | 808 | 用户认证、会话管理、登录/登出 |
| `plugin.ts` | 899 | 插件市场、安装/卸载/启用/禁用 |
| `settings.ts` | 595 | 应用配置、服务器设置、主题 |
| `serverList.ts` | 397 | 服务器列表管理 |
| `tag.ts` | 387 | 标签管理 |
| `folder.ts` | 298 | 文件夹管理 |
| `uploadHistory.ts` | 223 | 上传历史记录 |
| `library.ts` | 274 | 媒体库管理 |
| `appState.ts` | 94 | 应用全局状态 |
| `index.ts` | 186 | 导出入口 + `initializeStores()` + `clearAllStores()` |

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
