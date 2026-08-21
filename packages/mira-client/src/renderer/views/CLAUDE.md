# src/renderer/views - 页面视图

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > **views**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | UITestView 移除、新增 PlaygroundView(/playground);settings/ 新增 LibraryPanel 与 playground/ 演练场(6 个组件);HomeView 新增 ImportDropdown |
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

页面视图目录包含应用的顶层页面组件。

## 视图列表

| 视图 | 行数 | 描述 |
|------|------|------|
| `HomeView/` | - | 首页完整模块（详见 HomeView/CLAUDE.md） |
| `LoginView/` | - | 登录页面完整模块（详见 LoginView/CLAUDE.md） |
| `SettingsView.vue` | 168 | 设置页面 |
| `FileUploadView.vue` | 492 | 文件上传 |
| `FilePreviewView.vue` | 243 | 文件预览 |
| `PlaygroundView.vue` | 41 | UI Playground 入口（/playground，v2.x 替代原 UITestView） |
| `NotFoundView.vue` | 41 | 404 页面 |

## 子目录

| 目录 | 文档 | 描述 |
|------|------|------|
| `HomeView/` | [HomeView/CLAUDE.md](./HomeView/CLAUDE.md) | 首页完整实现 |
| `LoginView/` | [LoginView/CLAUDE.md](./LoginView/CLAUDE.md) | 登录页面完整实现 |
| `settings/` | [settings/CLAUDE.md](./settings/CLAUDE.md) | 设置子面板（General/Data/Library/Network/Notifications/FloatingBall/Import/Overview/Playground 等 Panel + playground/ 组件演练场：Components/Form/Glow/Notification/PageSlide/Toast） |
