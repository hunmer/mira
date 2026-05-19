# src/renderer/components/search - 搜索组件

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [components](../) > **search**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

搜索组件目录包含全局搜索和搜索结果展示相关的组件。

## 组件列表

| 组件 | 行数 | 描述 |
|------|------|------|
| `GlobalSearchContent.vue` | 321 | 全局搜索内容区域 |
| `FileSearchResultTemplate.vue` | 242 | 文件搜索结果模板 |
| `FolderSearchResultTemplate.vue` | 179 | 文件夹搜索结果模板 |
| `TagSearchResultTemplate.vue` | 145 | 标签搜索结果模板 |
| `EmptySearchState.vue` | 138 | 空搜索状态 |

## 搜索流程

```
GlobalSearchDialog.vue (在 business/ 目录)
  -> GlobalSearchContent.vue
    -> FileSearchResultTemplate / FolderSearchResultTemplate / TagSearchResultTemplate
      -> EmptySearchState (无结果时)
```
