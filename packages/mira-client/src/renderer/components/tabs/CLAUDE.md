# src/renderer/components/tabs - Tab 视图组件

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [components](../) > **tabs**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

Tab 视图组件目录包含 Tab 系统的视图层实现。

## 组件列表

| 组件 | 行数 | 描述 |
|------|------|------|
| `HomeTabView.vue` | 196 | 首页 Tab 视图 |
| `MediaTabListView.vue` | 1178 | 媒体列表 Tab 视图（核心，最大的视图组件） |

## Tab 视图架构

```
TabViewRenderer.vue (在 common/ 目录, 通用渲染器)
  ├── HomeTabView.vue (首页)
  │   └── 展示统计、快捷操作、功能卡片
  └── MediaTabListView.vue (媒体列表)
      ├── 网格/列表视图切换
      ├── 筛选工具栏
      └── 分页/无限滚动
```

## Tab 类型对应关系

| TabType | 视图组件 |
|---------|----------|
| `HomeTabType` | `HomeTabView.vue` |
| `AllTabType` | `MediaTabListView.vue` |
| `FolderTabType` | `MediaTabListView.vue` |
| `TagTabType` | `MediaTabListView.vue` |
| `TrashTabType` | `MediaTabListView.vue` |
| `UncategorizedTabType` | `MediaTabListView.vue` |
| `UntaggedTabType` | `MediaTabListView.vue` |
