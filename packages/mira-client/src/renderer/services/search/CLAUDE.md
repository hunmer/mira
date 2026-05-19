# src/renderer/services/search - 搜索服务

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [services](../) > **search**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

搜索服务目录包含针对不同维度的搜索实现。

## 服务列表

| 服务 | 行数 | 描述 |
|------|------|------|
| `FileSearchService.ts` | 100 | 文件搜索服务 |
| `FolderSearchService.ts` | 99 | 文件夹搜索服务 |
| `TagSearchService.ts` | 90 | 标签搜索服务 |
| `index.ts` | 48 | 服务导出 |

## 搜索流程

```
SearchComponent.vue
  -> GlobalSearchDialog.vue
  -> SearchHandlers.ts (599 行，在 services/ 根目录)
  -> FileSearchService / FolderSearchService / TagSearchService
  -> 渲染搜索结果模板
```
