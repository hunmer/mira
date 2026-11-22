# src/renderer/views/settings - 设置页面

[根目录](../../../../CLAUDE.md) > [src/renderer](../../../CLAUDE.md) > [views](../CLAUDE.md) > **settings**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-11-21 | 增量更新 | v3.0.2 全量核对:面板清单重写(补 Browser/Data/Extensions/FileShare/FloatingBall/Library/Network/Playground/Screenshot,删已不存在的 UsersPanel);按 settingsConfig.ts 校正为 7 分区(general/library/notifications/extensions/plugins/network/data);说明 SettingsDialog 为真正宿主、ExtensionsPanel 为子面板枢纽 |
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

设置子面板组件目录。注意:实际承载设置 UI 的宿主是 `components/business/SettingsDialog.vue`(HomeView 内对话框),它按 `settingsConfig.ts` 的 7 分区映射本目录面板;`/settings` 路由的 `SettingsView.vue`(views/ 根)只映射 overview/general/notifications/plugins 四个分区,其余回落 OverviewPanel。

## 组件列表

| 组件 | 行数 | 所属分区 | 描述 |
|------|------|----------|------|
| `GeneralPanel.vue` | 379 | general | 通用设置(主题/语言/启动选项;v3.0.2 含上传限额 uploadMax* 等设置项) |
| `LibraryPanel.vue` | 446 | library | 媒体库设置 |
| `NotificationsPanel.vue` | 104 | notifications | 通知设置(v3.0.2 含同屏通知数 maxVisibleNotifications) |
| `ExtensionsPanel.vue` | 36 | extensions | 扩展枢纽:子页签 screenshot/file-share/floating-ball/browser |
| `ScreenshotPanel.vue` | 27 | extensions.screenshot | 截图设置 |
| `FileSharePanel.vue` | 39 | extensions.file-share | 设备间文件分享设置(v3.0.0) |
| `FloatingBallPanel.vue` | 142 | extensions.floating-ball | 悬浮球设置 |
| `BrowserPanel.vue` | 94 | extensions.browser | 内置浏览器设置 |
| `pluginPlan.vue` | 356 | plugins | 插件市场/计划页面 |
| `NetworkPanel.vue` | 155 | network | 网络设置 |
| `DataPanel.vue` | 126 | data | 数据管理(导入导出等) |
| `OverviewPanel.vue` | 88 | overview | 概览面板(应用信息/存储使用;SettingsView 默认页) |
| `PlaygroundPanel.vue` | 60 | (PlaygroundView) | Playground 入口面板(/playground 消费) |
| `SettingsImportExportDialog.vue` | 111 | (通用) | 设置导入导出对话框 |

## 配置管理

- `settingsConfig.ts` (30 行): 设置分区配置 `settingSections`(7 分区)+ 语言/主题选项
- 支持导入/导出设置(SettingsImportExportDialog)

## 设置面板结构

```
SettingsDialog.vue (components/business/,真正宿主,HomeView 打开)
├── general      → GeneralPanel.vue
├── library      → LibraryPanel.vue
├── notifications → NotificationsPanel.vue
├── extensions   → ExtensionsPanel.vue
│   ├── screenshot    → ScreenshotPanel.vue
│   ├── file-share    → FileSharePanel.vue
│   ├── floating-ball → FloatingBallPanel.vue
│   └── browser       → BrowserPanel.vue
├── plugins      → pluginPlan.vue
├── network      → NetworkPanel.vue
└── data         → DataPanel.vue

SettingsView.vue (/settings 路由,独立页)
└── overview/general/notifications/plugins 四分区映射,其余回落 OverviewPanel

playground/ (6 个演练场组件:Components/Form/Glow/Notification/PageSlide/Toast)
```
