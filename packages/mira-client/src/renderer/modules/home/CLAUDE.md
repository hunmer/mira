# src/renderer/modules/home - 首页模块

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [modules](../) > **home**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

首页模块将 HomeView.vue 的功能拆分为独立的处理器模块，每个模块负责特定的业务逻辑。

## 文件列表

| 文件 | 行数 | 描述 |
|------|------|------|
| `index.ts` | 83 | 模块入口，导出 `useHomeModules()` |
| `routeHandler.ts` | 400 | 路由处理（URL 参数解析/Tab 切换） |
| `folderHandler.ts` | 287 | 文件夹操作处理（创建/删除/重命名） |
| `tagHandler.ts` | 241 | 标签操作处理（创建/删除/编辑） |

## 通信机制

- 模块间通过 `CustomEvent` 进行通信
- 支持路由参数自动处理
- 统一的状态管理和错误处理

## 使用示例

```typescript
import { useHomeModules } from '@renderer/modules/home'

const { routeHandler, tagHandler, folderHandler, initializeAll } = useHomeModules()

onMounted(async () => {
  const cleanup = await initializeAll()
  onUnmounted(() => cleanup())
})
```
