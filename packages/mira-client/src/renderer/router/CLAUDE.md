# src/renderer/router - 路由配置

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > **router**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航、路由守卫说明 |

## 概述

路由配置目录，使用 Vue Router 的 Hash 模式。

## 文件

| 文件 | 行数 | 描述 |
|------|------|------|
| `index.ts` | 273 | Vue Router 配置 |

## 路由结构

| 路径 | 名称 | 视图 | 认证 | 连接 |
|------|------|------|------|------|
| `/` | Home | HomeView/index.vue | 是 | 是 |
| `/file-preview` | FilePreview | FilePreviewView.vue | 否 | 否 |
| `/image-preview/:id?` | ImagePreview | ImagePreview.vue | 否 | 否 |
| `/video-preview/:id?` | VideoPreview | VideoPreview.vue | 否 | 否 |
| `/settings` | Settings | SettingsView.vue | 否 | 否 |
| `/login` | Login | LoginView.vue | 否 | 否 |
| `/*` | NotFound | NotFoundView.vue | 否 | 否 |

## 路由守卫

- `requiresAuth`: 需要登录认证
- `requiresConnection`: 需要服务器连接
- `hideInNav`: 不在导航菜单中显示

## 路由模式

使用 `createWebHashHistory` Hash 模式，配合 Tab 系统实现无刷新页面切换。
