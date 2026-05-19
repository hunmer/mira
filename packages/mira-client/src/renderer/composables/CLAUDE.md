# src/renderer/composables - 组合式 API

[根目录](../../../CLAUDE.md) > [src/renderer](../CLAUDE.md) > **composables**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航、完整文件清单 |

## 概述

组合式 API 目录包含可复用的 Vue 组合式函数，是整个应用的核心逻辑层。

## 核心系统

| 文件 | 行数 | 描述 |
|------|------|------|
| `useTabs.ts` | 809 | Tab 管理系统（创建/切换/关闭/持久化） |
| `TabRegistry.ts` | 156 | Tab 类型注册中心 |
| `TabTypes.ts` | 114 | Tab 类型基类 (BaseTabType / MediaViewTabType) |
| `TabSystem.ts` | 149 | Tab 系统核心 |
| `TabHistory.ts` | 190 | Tab 历史记录 |
| `TabPersistence.ts` | 176 | Tab 状态持久化 |
| `initTabSystem.ts` | 46 | Tab 系统初始化 |
| `useTabSystemInit.ts` | 184 | Tab 系统初始化 composable |

## 数据相关

| 文件 | 行数 | 描述 |
|------|------|------|
| `useMediaTabData.ts` | 330 | 媒体 Tab 数据加载 |
| `useMediaItem.ts` | 164 | 媒体项操作 |
| `useMediaOperations.ts` | 90 | 媒体操作（上传/删除等） |
| `useLibraryManagement.ts` | 107 | 库管理 |
| `useTabPagination.ts` | 151 | Tab 分页 |

## 功能模块

| 文件 | 行数 | 描述 |
|------|------|------|
| `useGlobalSearch.ts` | 310 | 全局搜索 |
| `useShortcuts.ts` | 345 | 快捷键管理 |
| `useVideoPreview.ts` | 141 | 视频预览 |
| `useInitializationState.ts` | 188 | 初始化状态 |
| `useFilters.ts` | 221 | 筛选器 |
| `useConfirm.ts` | 38 | 确认对话框 |
| `useToast.ts` | 34 | Toast 通知 |
| `useMiraClient.ts` | 200 | Mira 客户端连接 |

## UI 状态

| 文件 | 行数 | 描述 |
|------|------|------|
| `useViewModeConfig.ts` | 42 | 视图模式配置 |
| `useWindowAndNavigation.ts` | 89 | 窗口和导航 |

## 子目录

| 目录 | 文档 | 描述 |
|------|------|------|
| `tabs/` | [tabs/CLAUDE.md](./tabs/CLAUDE.md) | 7 种内置 Tab 类型定义 |

## 通用工具 (index.ts, 226 行)

`index.ts` 导出了多个通用 composable:
- `useNotification`: 通知消息
- `useLoading`: 加载状态
- `useWindowSize`: 窗口尺寸（响应式）
- `useLocalStorage`: 本地存储
- `useKeyboard`: 键盘快捷键
