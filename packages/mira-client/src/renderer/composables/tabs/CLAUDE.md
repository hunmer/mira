# src/renderer/composables/tabs - Tab 类型定义

[根目录](../../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [composables](../CLAUDE.md) > **tabs**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

Tab 类型定义目录包含所有内置 Tab 类型的实现。

## Tab 类型列表

| 类型 | 文件 | 行数 | 描述 |
|------|------|------|------|
| 首页 | `HomeTabType.ts` | 49 | 欢迎页面、功能卡片 |
| 全部 | `AllTabType.ts` | 49 | 显示所有媒体文件（可关闭） |
| 文件夹 | `FolderTabType.ts` | 67 | 按文件夹筛选 |
| 标签 | `TagTabType.ts` | 95 | 按标签筛选 |
| 回收站 | `TrashTabType.ts` | 50 | 已删除文件 |
| 未分类 | `UncategorizedTabType.ts` | 51 | 未分类文件 |
| 未标记 | `UntaggedTabType.ts` | 51 | 未添加标签的文件 |

## TabType 接口

```typescript
interface TabTypeDefinition {
  name: string          // 唯一标识
  displayName: string   // 显示名称
  icon: string          // 图标
  closable: boolean     // 是否可关闭

  getViewConfig(context: TabContext): TabViewConfig

  onInit?(context: TabContext): void
  onActive?(context: TabContext): void
  onInactive?(context: TabContext): void
  onClose?(context: TabContext): void
}
```

## 导出

`index.ts` (90 行) 导出 `initializeBuiltInTabTypes()` 和 `isTabTypesInitialized()` 函数。
