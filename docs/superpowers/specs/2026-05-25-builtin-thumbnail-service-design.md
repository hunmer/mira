# 内置缩略图服务设计

## 概述

将 `mira_thumb` 插件的核心功能内置到 `mira-app-server`，作为全局单例的 `ThumbnailService`。同时提供 `ThumbnailGenerator` 接口，允许插件为自定义文件格式（PDF、3D 等）注册缩略图生成器。在 `mira-dashboard-next` 中新增缩略图管理路由页面。

## 决策记录

- **服务层级**：全局单例，一个共享队列处理所有库的文件
- **扩展方式**：接口注册（`ThumbnailGenerator`），插件通过 `ThumbnailService.registerGenerator()` 注册
- **旧插件**：从 `plugins.json` 移除，保留源码目录

## 1. 服务端：ThumbnailService

**文件**：`packages/mira-app-server/src/services/ThumbnailService.ts`

### ThumbnailGenerator 接口

```typescript
export interface ThumbnailGenerator {
  name: string                     // 如 'image', 'video', 'pdf'
  supportedExtensions: string[]    // 如 ['jpg','png'], ['mp4','mov']
  generate(srcPath: string, destPath: string): Promise<void>
}
```

### 核心职责

- 全局共享 Queue（concurrency: 5）
- 维护 `ext -> generator` 映射
- ffmpeg 初始化（`FFMPEG_PATH` 环境变量或 PATH 自动查找）
- 内置两个生成器：`ImageThumbnailGenerator`（图片缩放到 200px 宽）、`VideoThumbnailGenerator`（从第 1 秒截图 200px 宽）

### 关键方法

```typescript
class ThumbnailService {
  registerGenerator(generator: ThumbnailGenerator): void
  unregisterGenerator(name: string): void
  getGenerators(): ThumbnailGenerator[]
  scheduleThumbnail(libraryId: string, file: any): void
  scanPending(libraryId: string, dbService: ILibraryServerData): void
  cancelScan(): void
  getProgress(): { totalPending, queueLength, processing, completed, progress }
  onFileCreated(libraryId: string, event: EventArgs): void
  onFileDeleted(libraryId: string, file: any, dbService: ILibraryServerData): void
}
```

### 初始化位置

- `MiraServer.start()` 中创建实例
- `LibraryStorage.load()` 中为每个活跃库注册 `file::created` / `file::deleted` 事件监听

### Generator 注册时机

插件在库加载后才初始化，缩略图扫描也在库加载时触发。内置生成器立即可用；插件注册的 Generator 在后续 `file::created` 事件中生效。

## 2. 服务端：ThumbRouter

**文件**：`packages/mira-app-server/src/routes/ThumbRouter.ts`

注册到 `/api/thumb`，所有接口需要 `libraryId` 查询参数。

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/thumb/scan` | GET | 触发指定库的缩略图扫描 |
| `/api/thumb/progress` | GET | 查询处理进度 |
| `/api/thumb/cancel` | GET | 取消任务 |
| `/api/thumb/stats` | GET | 统计信息 |
| `/api/thumb/generators` | GET | 列出已注册的生成器 |

## 3. 环境变量

在 `packages/mira-app-server/.env` 增加 `FFMPEG_PATH=`。

## 4. 前端：缩略图管理页面

- **路由**：`/thumbnail`
- **组件**：`packages/mira-dashboard-next/src/views/mira/thumbnail/index.vue`
- **导航**：在 `DefaultLayout.vue` 的 `navItems` 中添加，图标 `RiImageLine`
- **权限**：`['super', 'admin']`
- **功能**：复刻 `ThumbnailManager.js` 的全部 UI 和逻辑，改为 Vue 3 SFC + Composition API

## 5. 旧插件处理

从 `plugins.json` 配置中移除 `mira_thumb`，保留 `plugins/plugins/mira_thumb` 源码目录。

## 已知局限

- 全局队列：一个库的大批量扫描可能占满并发，其他库排队
- 插件 Generator 不参与首次扫描，仅在首次扫描后的 `file::created` 事件中生效

## 变更范围

### 新增文件

| 文件 | 说明 |
|------|------|
| `packages/mira-app-server/src/services/ThumbnailService.ts` | 缩略图服务核心 |
| `packages/mira-app-server/src/routes/ThumbRouter.ts` | 缩略图 API 路由 |
| `packages/mira-dashboard-next/src/views/mira/thumbnail/index.vue` | 前端缩略图管理页面 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `packages/mira-app-server/.env` | 增加 `FFMPEG_PATH` |
| `packages/mira-app-server/src/MiraServer.ts` | 初始化 ThumbnailService |
| `packages/mira-app-server/src/HttpServer.ts` | 注册 ThumbRouter |
| `packages/mira-app-server/src/index.ts` | 导出 ThumbnailService |
| `packages/mira-app-server/src/LibraryStorage.ts` | 每个库加载时接入缩略图事件 |
| `packages/mira-dashboard-next/src/layouts/DefaultLayout.vue` | 添加导航项 |
| `packages/mira-dashboard-next/src/router/index.ts` | 添加路由 |
