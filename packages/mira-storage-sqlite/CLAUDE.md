[根目录](../../CLAUDE.md) > [packages](..) > **mira-storage-sqlite**

# mira-storage-sqlite

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 增量更新 | 补充 getFiles 过滤条件详情、processingFiles 机制、findFolderByName 方法、文件导入模式说明 |
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

SQLite 存储实现模块，为 Mira 素材库提供数据库持久化能力。实现 `ILibraryServerData` 接口，提供文件/文件夹/标签的完整 CRUD 操作，包括：

- 文件管理：创建、更新、软删除/恢复、清空回收站、按条件查询（名称/日期/大小/评分/文件夹/标签/自定义字段）
- 文件夹管理：树形结构、递归删除、按名称查找
- 标签管理：树形结构、递归删除
- 文件导入：支持 copy/move/link 三种导入方式
- 事务管理：BEGIN/COMMIT/ROLLBACK
- 文件关联：文件-文件夹、文件-标签关联管理
- 文件处理：`processingFiles` 自动附加缩略图 URL、文件夹名称、自定义字段解析

## 入口与启动

- **入口文件**: `src/index.ts` -- 导出 `ILibraryServerData` 接口和 `LibraryServerDataSQLite` 实现类
- **构建产物**: `dist/index.js` + `dist/index.d.ts`
- **构建命令**: `tsc` / `pnpm run build` / `pnpm run rebuild`

本模块是纯库，不独立启动。由 `mira-app-server` 的 `LibraryStorage` 实例化。

## 对外接口

### ILibraryServerData (src/ILibraryServerData.ts)

核心存储接口，定义了所有数据操作契约：

| 方法分类 | 方法 | 说明 |
|----------|------|------|
| 文件操作 | `createFile`, `updateFile`, `deleteFile`, `recoverFile`, `emptyTrash`, `getFile`, `getFiles` | 完整文件生命周期管理 |
| 文件夹操作 | `createFolder`, `updateFolder`, `deleteFolder`, `getFolder`, `getFolders`, `findFolderByName` | 树形文件夹结构 |
| 标签操作 | `createTag`, `updateTag`, `deleteTag`, `getTag`, `getTags` | 树形标签结构 |
| 文件导入 | `createFileFromPath` | 从文件系统导入，支持 copy/move/link |
| 关联操作 | `getFileFolder`, `getFileTags`, `setFileFolder`, `setFileTags` | 文件-文件夹/标签关联 |
| 事务 | `beginTransaction`, `commitTransaction`, `rollbackTransaction` | SQLite 事务 |
| 查询 | `getAllTags`, `getAllFolders`, `queryFolder`, `queryTag`, `queryFile`, `queryLibrary` | 列表和条件查询 |
| 库信息 | `getLibraryId`, `getLibraryInfo`, `getStats`, `closeLibrary`, `createLibrary` | 元数据和统计 |
| 路径 | `getItemPath`, `getItemFilePath`, `getItemThumbPath`, `getPublicURL` | 文件路径管理 |

### getFiles 过滤条件

`getFiles` 支持以下 filters 参数：

| 过滤条件 | 说明 |
|----------|------|
| `recycled` | 回收站标记 (0/1) |
| `thumb` | 缩略图状态 (0/1) |
| `star` | 最低评分 |
| `name` | 名称模糊搜索 |
| `dateRange` | 日期范围 `{ start: Date, end: Date }` |
| `minSize` / `maxSize` | 文件大小范围 (KB) |
| `folder` | 文件夹 ID（`=null` 或 null 表示未分类） |
| `tags` | 标签 ID 数组（`=null` 或 null 表示无标签） |
| `custom_fields` | 自定义字段精确匹配（支持 `!=`, `>`, `<` 前缀操作符） |
| `sort` | 排序字段（imported_at, id, size, stars, folder_id, tags, name, custom_fields） |
| `order` | 排序方向 (asc/desc) |
| `limit` / `offset` | 分页参数 |

### 文件导入模式

`createFileFromPath` 支持三种导入类型：

| 模式 | 说明 |
|------|------|
| `copy` | 复制文件到库目录 |
| `move` | 移动文件到库目录（跨盘符时复制+删除） |
| `link` | 保持原文件位置不变，仅记录路径 |

### LibraryServerDataSQLite (src/LibraryServerDataSQLite.ts)

`ILibraryServerData` 的 SQLite 实现，核心特性：

- 使用 `sqlite3` 原生驱动
- 三张核心表：`files`、`folders`、`tags`
- 文件的 `tags` 字段存储 JSON 数组（标签 ID 列表），使用 `json_each` 查询
- `custom_fields` 字段存储 JSON 对象，使用 `json_extract` 查询
- 默认文件夹名：`未分类`（folder_id 为 null 时）
- 缩略图命名：`{hash}.png`（有哈希时）或 `{id}.png`

## 关键依赖与配置

- **依赖**: `mira-app-core` (workspace:*), `sqlite3` (^5.1.7)
- **peer 依赖**: `mira-app-core`
- **开发依赖**: `typescript`, `ts-node`, `@types/node`

构造函数接收 `config` 对象（含 `id`, `customFields.path`, `customFields.enableHash`, `customFields.useHttpFile` 等），`opts` 预留扩展。

## 数据模型

### files 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK AUTO | 自增主键 |
| name | TEXT NOT NULL | 文件名 |
| created_at | INTEGER NOT NULL | 创建时间戳 |
| imported_at | INTEGER NOT NULL | 导入时间戳 |
| size | INTEGER NOT NULL | 文件大小(bytes) |
| hash | TEXT NOT NULL | 文件哈希 |
| custom_fields | TEXT | JSON 自定义字段 |
| notes | TEXT | 备注 |
| stars | INTEGER DEFAULT 0 | 评分 |
| folder_id | INTEGER FK | 所属文件夹 |
| reference | TEXT | 引用路径 |
| path | TEXT | 文件系统路径 |
| thumb | INTEGER DEFAULT 0 | 缩略图状态 (0/1) |
| recycled | INTEGER DEFAULT 0 | 回收站标记 (0/1) |
| tags | TEXT | JSON 标签 ID 数组 |

### folders 表 / tags 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| title | TEXT NOT NULL | 名称 |
| parent_id | INTEGER FK | 父级 ID（支持树形） |
| color | INTEGER | 颜色值 |
| icon | TEXT/INTEGER | 图标 |

## 测试与质量

当前无独立测试文件。`getFiles` 方法有丰富的过滤条件构建逻辑（约 150 行），建议优先补充单元测试。

## 相关文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/index.ts` | 5 | 模块入口 |
| `src/ILibraryServerData.ts` | 78 | 存储接口定义 |
| `src/LibraryServerDataSQLite.ts` | 931 | SQLite 完整实现 |
| `package.json` | -- | 包配置 (v1.0.20) |
