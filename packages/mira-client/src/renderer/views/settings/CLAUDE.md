# src/renderer/views/settings - 设置页面

[根目录](../../../../CLAUDE.md) > [src/renderer](../../../CLAUDE.md) > [views](../CLAUDE.md) > **settings**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

设置页面目录包含应用设置相关的子页面组件。

## 组件列表

| 组件 | 行数 | 描述 |
|------|------|------|
| `GeneralPanel.vue` | 175 | 通用设置面板（主题/语言/启动选项） |
| `pluginPlan.vue` | 552 | 插件计划页面 |
| `SettingsImportExportDialog.vue` | 92 | 设置导入导出对话框 |
| `NotificationsPanel.vue` | 58 | 通知设置面板 |
| `OverviewPanel.vue` | 89 | 概览面板（应用信息/存储使用） |
| `UsersPanel.vue` | 28 | 用户设置面板 |

## 配置管理

- `settingsConfig.ts` (36 行): 设置面板配置
- 支持导入/导出设置

## 设置面板结构

```
SettingsView.vue (在 views/ 根目录)
├── GeneralPanel.vue
│   ├── 主题设置
│   ├── 语言设置
│   └── 启动选项
├── NotificationsPanel.vue
├── OverviewPanel.vue
└── UsersPanel.vue
```
