# src/renderer/components/business - 业务组件

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [components](../) > **business**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

业务组件目录包含与媒体管理核心功能相关的 Vue 组件，约 30+ 个组件。

## 核心组件

### 媒体展示

| 组件 | 描述 |
|------|------|
| `MediaGridComponent/` | 网格展示（含子组件和 composables） |
| `MediaListComponent.vue` | 列表展示 (353 行) |
| `FolderTreeComponent.vue` | 文件夹树 (1517 行) |
| `WaterfallComponent.vue` | 瀑布流布局 (273 行) |
| `MediaContentView.vue` | 媒体内容视图 (199 行) |
| `MediaDetailComponent.vue` | 媒体详情 (626 行) |

### 媒体预览

| 组件 | 描述 |
|------|------|
| `VideoPlayerComponent.vue` | 视频播放 (371 行) |
| `ImageViewerComponent.vue` | 图片查看 (298 行) |
| `VideoFileInfoComponent.vue` | 视频信息 (209 行) |
| `ImageInfoComponent.vue` | 图片信息 (206 行) |
| `VideoThumbnailListComponent.vue` | 视频缩略图 (99 行) |
| `ImageThumbnailListComponent.vue` | 图片缩略图 (57 行) |

### 对话框

| 组件 | 描述 |
|------|------|
| `FileDetailDialog.vue` | 文件详情 (614 行) |
| `FileUploadDialog.vue` | 文件上传 (803 行) |
| `FolderEditDialog.vue` | 文件夹编辑 (341 行) |
| `FolderMoveDialog.vue` | 文件夹移动 (197 行) |
| `ServerEditDialog.vue` | 服务器编辑 (730 行) |
| `ServerManagementDialog.vue` | 服务器管理 (227 行) |
| `PluginDetailDialog.vue` | 插件详情 (387 行) |
| `PluginsDialog.vue` | 插件列表 (596 行) |
| `ShortcutManagerDialog.vue` | 快捷键管理 (581 行) |
| `SettingsDialog.vue` | 设置对话框 (177 行) |
| `HotUpdateDialog.vue` | 热更新 (387 行) |
| `GlobalSearchDialog.vue` | 全局搜索 (85 行) |

### 集成

| 组件 | 描述 |
|------|------|
| `IntegrationsList.vue` | 集成列表 (705 行) |
| `IntegrationCard.vue` | 集成卡片 (273 行) |

## MediaGridComponent 子结构

```
MediaGridComponent/
├── MediaGridComponent.vue    # 主组件 (238 行)
├── MediaGridItem.vue         # 网格项 (198 行)
├── MediaItem.vue             # 媒体项 (225 行)
├── VideoPreviewContainer.vue # 视频预览容器 (144 行)
└── composables/
    ├── useSelection.ts       # 选择逻辑 (278 行)
    ├── useDragDrop.ts        # 拖拽逻辑 (229 行)
    ├── useContextMenu.ts     # 右键菜单 (90 行)
    └── useVideoHover.ts      # 视频悬停 (76 行)
```
