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
| `HomeTabView.vue` | - | 首页 Tab 视图（基于 grid-layout-plus 的可自定义卡片仪表盘） |
| `MediaTabListView.vue` | 1178 | 媒体列表 Tab 视图（核心，最大的视图组件） |

## Tab 视图架构

```
TabViewRenderer.vue (在 common/ 目录, 通用渲染器)
  ├── HomeTabView.vue (首页仪表盘)
  │   ├── 基于 grid-layout-plus 的可拖拽 / 缩放卡片网格
  │   ├── 右上角「添加卡片」菜单 + 「编辑模式」开关
  │   └── dashboard/ 子目录：
  │       ├── CardRegistry.ts        # 卡片类型注册管理器（单例）
  │       ├── DashboardCardShell.vue # 卡片外壳（标题栏 + 拖拽/删除按钮）
  │       └── cards/                 # 内置卡片（如 HitokotoCard.vue）
  └── MediaTabListView.vue (媒体列表)
      ├── 网格/列表视图切换
      ├── 筛选工具栏
      └── 分页/无限滚动
```

### Dashboard 卡片扩展机制

- 新增卡片：调用 `cardRegistry.register({ type, title, component, size, ... })`，
  component 可为异步组件（`defineAsyncComponent`）。第三方插件可运行时注册。
- 布局持久化：`stores/dashboardLayout.ts` 负责保存 LayoutItem[] 与 instance→type 映射到 ConfigStorage。
- 编辑模式：HomeTabView 右上角「编辑」开关，开启后卡片展示拖拽 handle 与删除按钮。
- 卡片配置（声明式表单）：卡片可声明 `configFields: SchemaField[]` + `configSchema: z.ZodType`
  （复用 `@/renderer/components/business/SchemaForm`），「添加卡片」菜单的「小组件配置」区
  或卡片编辑态齿轮按钮会打开 `CardConfigDialog`，由 SchemaForm 自动渲染并校验。
- 内置卡片：`dashboard/cards/` 下有 `HitokotoCard.vue`（一言）与 `AlbumCard.vue`
  （相册，shadcn-vue Carousel，数据源参考 HistoryPanel）。

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
