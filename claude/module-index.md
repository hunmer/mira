# 模块索引详情

## 活跃模块

### mira-app-core (v1.0.24)

**路径**: `packages/mira-app-core`
**语言**: TypeScript
**职责**: 核心库 -- 提供事件管理器 (EventManager)、库列表管理、共享类型定义
**内含子模块**:
- `src/storage/sqlite/` -- SQLite 存储实现 (ILibraryServerData, LibraryServerDataSQLite, 文件/文件夹/标签 CRUD、事务、统计)
- `src/shared/sdk/` -- TypeScript SDK (MiraClient, HttpClient, WebSocketClient, 10 个 API 模块)
**入口**: `src/index.ts`
**测试**: 无

### mira-app-server (v1.0.25)

**路径**: `packages/mira-app-server`
**语言**: TypeScript
**职责**: 独立服务端 -- Express HTTP + WebSocket 服务，15 个路由模块，CLI 工具，用户认证，内置 ThumbnailService
**入口**: `src/index.ts` | CLI: `src/cli.ts`
**测试**: Jest (`sdk/` 目录)

### mira-client (v1.0.5)

**路径**: `packages/mira-client`
**语言**: TypeScript / Vue 3
**职责**: Electron 桌面客户端 -- 媒体浏览/预览/管理，插件系统，Tab 导航，11 个 Pinia Store
**入口**: `src/main/main.ts` (主进程), `src/renderer/` (渲染进程)
**测试**: 无独立测试，依赖 `pnpm run type-check`

### mira-dashboard-next (v0.0.0)

**路径**: `packages/mira-dashboard-next`
**语言**: TypeScript / Vue 3
**职责**: Web 管理面板 -- shadcn-vue + Tailwind CSS 4，11 个功能页面 + 认证页面，i18n 支持
**入口**: `src/main.ts`
**测试**: 无

### mira-scripts-core (v1.0.5)

**路径**: `packages/mira-scripts-core`
**语言**: TypeScript
**职责**: 脚本工具集 -- 数据转换 (convertLibraryData)、文件导入 (pathFilesToLibrary)
**入口**: `index.ts`
**测试**: 无

### mira-doc (v1.0.0)

**路径**: `packages/mira-doc`
**语言**: Markdown / VitePress
**职责**: 项目文档站 -- VitePress 2.0 驱动
**入口**: `.vitepress/`
**测试**: 无

## 插件

### mira_thumb (v1.0.19) -- 旧版目录

**路径**: `plugins/old_plugins/mira_thumb`
**职责**: 缩略图生成 (ffmpeg)，支持图片/视频
**状态**: 位于 old_plugins/，可能被服务端内置 ThumbnailService 替代

### mira_n8n (v1.0.7)

**路径**: `plugins/plugins/mira_n8n`
**职责**: n8n Webhook 集成，独立 WebSocket 服务器转发事件

### mira_thumb_imagemagick (v1.0.0)

**路径**: `plugins/plugins/mira_thumb_imagemagick`
**职责**: ImageMagick 缩略图生成，支持 PSD/AI/EPS/SVG/TIFF/DNG/HEIC 等专业格式

### mira_duplicate_scanner (v1.0.0)

**路径**: `plugins/plugins/mira_duplicate_scanner`
**职责**: 重复文件扫描与删除，支持 quick 模式扫描
**HTTP 路由**: POST `/duplicate/scan`, POST `/duplicate/delete`
**前端路由**: `/tools/duplicate-scanner`

## 已移除模块

| 模块 | 原路径 | 说明 |
|------|--------|------|
| mira-storage-sqlite | `packages/mira-storage-sqlite` | 已合并到 mira-app-core |
| mira-server-sdk | `packages/mira-server-sdk` | 已合并到 mira-app-core |
| mira-server-sdk-examples | `packages/mira-server-sdk-examples` | 已从 workspace 移除 |
| n8n-nodes-mira-ws-trigger | `packages/n8n-nodes-mira-ws-trigger` | 已从 workspace 移除 |
| mira-dashboard | `packages/mira-dashboard` | 已替换为 mira-dashboard-next |
| mira_user | `plugins/plugins/mira_user` | 源码移除，功能内置于服务端 |
| upload_statistics | `plugins/plugins/upload_statistics` | 源码移除，功能内置于服务端 |
