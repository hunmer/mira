# src/renderer/components/common - 通用组件

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [components](../) > **common**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

通用组件目录包含可复用的 UI 组件，被业务组件和页面组件引用。

## 组件列表

### 核心渲染组件

| 组件 | 行数 | 描述 |
|------|------|------|
| `TabViewRenderer.vue` | 180 | Tab 视图动态渲染器（核心） |
| `SelectionBox.vue` | — | 已封装为独立包 `@hunmer/vue-selection-box`(packages/vue-selection-box) |
| `MediaCardComponent.vue` | 532 | 媒体卡片 |
| `ResponsiveLayoutComponent.vue` | 562 | 响应式布局 |
| `AnimationComponent.vue` | 512 | 动画组件 |

### 媒体相关

| 组件 | 行数 | 描述 |
|------|------|------|
| `VideoPreview.vue` | 383 | 视频预览 |
| `VideoPreviewPopover.vue` | 420 | 视频预览弹出层 |
| `LazyImageComponent.vue` | 349 | 懒加载图片 |

### 导航与布局

| 组件 | 行数 | 描述 |
|------|------|------|
| `SidebarNavComponent.vue` | 315 | 侧边栏导航 |
| `VirtualScrollComponent.vue` | 253 | 虚拟滚动 |
| `ThemeSwitcherComponent.vue` | 339 | 主题切换器 |

### 搜索

| 组件 | 行数 | 描述 |
|------|------|------|
| `SearchComponent.vue` | 337 | 搜索组件 |

### 文件上传

| 组件 | 行数 | 描述 |
|------|------|------|
| `MultiTabFileUpload.vue` | 971 | 多标签文件上传（最大的通用组件） |
| `MultiTabFileUploadExample.vue` | 312 | 上传示例 |

### 其他

| 组件 | 描述 |
|------|------|
| `ToolbarComponent.vue` | 工具栏 (115 行) |
| `PopoverComponent.vue` | 弹出层 (93 行) |
| `AccessibilityProvider.vue` | 无障碍支持 (386 行) |
| `index.ts` | 组件导出索引 |
