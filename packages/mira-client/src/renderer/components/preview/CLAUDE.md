# src/renderer/components/preview - 预览组件

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > [components](../) > **preview**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

预览组件目录包含各种媒体类型的预览功能组件。

## 组件列表

| 组件 | 行数 | 描述 |
|------|------|------|
| `VideoPreview.vue` | 217 | 视频预览 |
| `ImagePreview.vue` | 214 | 图片预览 |
| `AudioPreview.vue` | 104 | 音频预览 |
| `DocumentPreview.vue` | 215 | 文档预览 |
| `DefaultPreview.vue` | 241 | 默认预览（不支持的格式） |

## 支持的文件类型

```
├── 视频: mp4, webm, mov, avi 等
├── 图片: jpg, png, gif, webp, svg 等
├── 音频: mp3, wav, ogg 等
└── 文档: pdf, txt 等
```
