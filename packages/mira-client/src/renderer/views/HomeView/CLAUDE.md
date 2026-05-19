# src/renderer/views/HomeView - 首页视图

[根目录](../../../../CLAUDE.md) > [src/renderer](../../../CLAUDE.md) > [views](../CLAUDE.md) > **HomeView**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

首页视图模块是应用的主页面，包含 Tab 管理和数据初始化。通过组合式 API 拆分为多个模块。

## 文件列表

| 文件 | 行数 | 描述 |
|------|------|------|
| `index.vue` | 538 | 首页主组件 |
| `useHomeTabManagement.ts` | 354 | Tab 管理（创建/切换/关闭/恢复） |
| `useHomeEventHandlers.ts` | 177 | 事件处理（菜单事件/路由事件） |
| `useHomeInit.ts` | 122 | 初始化逻辑（连接服务器/加载数据） |
| `useHomeLibraryManagement.ts` | 89 | 库管理（切换库/创建库） |
| `useHomeUIState.ts` | 67 | UI 状态管理 |

## 使用方式

```typescript
// 在 index.vue 中
import { useHomeInit } from './useHomeInit'
import { useHomeTabManagement } from './useHomeTabManagement'
import { useHomeEventHandlers } from './useHomeEventHandlers'
import { useHomeUIState } from './useHomeUIState'
import { useHomeLibraryManagement } from './useHomeLibraryManagement'
```

## 功能

- **useHomeInit**: 应用初始化、连接服务器、加载数据
- **useHomeTabManagement**: Tab 创建、切换、关闭、恢复
- **useHomeEventHandlers**: 用户事件处理（菜单/路由/快捷键）
- **useHomeUIState**: 界面状态管理（侧边栏/加载状态）
- **useHomeLibraryManagement**: 媒体库管理（切换/创建/删除）
