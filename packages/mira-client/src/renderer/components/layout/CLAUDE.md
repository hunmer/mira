# src/renderer/components/layout - 布局组件

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [components](../) > **layout**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

布局组件目录包含应用整体布局相关的组件。

## 组件列表

| 组件 | 描述 |
|------|------|
| `ContentToolbar.vue` | 内容区域工具栏 (68 行) |

## 布局结构

```
App.vue
├── Sidebar (Volt 组件)
│   └── 侧边导航
├── Main Content
│   ├── ContentToolbar.vue (顶部工具栏)
│   │   ├── 视图切换 (网格/列表)
│   │   ├── 排序选项
│   │   └── 筛选按钮
│   └── TabViewRenderer.vue (Tab 内容区)
└── StatusBar (可选)
```
