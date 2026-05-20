[根目录](../../CLAUDE.md) > [packages](..) > **mira-storage-sqlite**

# mira-storage-sqlite

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

SQLite 存储实现模块，为 Mira 素材库提供数据库持久化能力。实现 `ILibraryServerData` 接口，提供文件/文件夹/标签的完整 CRUD 操作，包括：

- 文件管理：创建、更新、软删除/恢复、清空回收站、按条件查询（名称/日期/大小/评分/文件夹/标签/自定义字段）
- 文件夹管理：树形结构、递归删除、按名称查找
- 标签管理：树形结构、递归删除
- 文件导入：支持 copy/move/link 三种导入方式
- 事务管理：BEGIN/COMMIT/ROLLBACK
- 文件关联：文件-文件夹、文件-标签关联管理

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
| 文件夹操作 | `createFolder`, `updateFolder`, `deleteFolder`, `getFolder`, `getFolders` | 树形文件夹结构 |
| 标签操作 | `createTag`, `updateTag`, `deleteTag`, `getTag`, `getTags` | 树形标签结构 |
| 文件导入 | `createFileFromPath` | 从文件系统导入，支持 copy/move/link |
| 关联操作 | `getFileFolder`, `getFileTags`, `setFileFolder`, `setFileTags` | 文件-文件夹/标签关联 |
| 事务 | `beginTransaction`, `commitTransaction`, `rollbackTransaction` | SQLite 事务 |
| 查询 | `getAllTags`, `getAllFolders`, `queryFolder`, `queryTag` | 列表和条件查询 |
| 库信息 | `getLibraryId`, `getLibraryInfo`, `getStats`, `closeLibrary` | 元数据和统计 |

### LibraryServerDataSQLite (src/LibraryServerDataSQLite.ts)

`ILibraryServerData` 的 SQLite 实现，核心特性：

- 使用 `sqlite3` 原生驱动
- 三张核心表：`files`、`folders`、`tags`
- `files` 表字段：id, name, created_at, imported_at, size, hash, custom_fields, notes, stars, folder_id, reference, path, thumb, recycled, tags
- `folders` 表字段：id, title, parent_id, color, icon
- `tags` 表字段：id, title, parent_id, color, icon
- 文件的 `tags` 字段存储 JSON 数组（标签 ID 列表）
- `custom_fields` 字段存储 JSON 对象，支持 `json_extract` 查询

## 关键依赖与配置

- **依赖**: `mira-app-core` (workspace:*), `sqlite3` (^5.1.7)
- **peer 依赖**: `mira-app-core`
- **开发依赖**: `typescript`, `ts-node`, `@types/node`

构造函数接收 `config` 对象（含 `id`, `customFields.path` 等），`opts` 预留扩展。

## 数据模型

### files 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 文件名 |
| created_at | INTEGER | 创建时间戳 |
| imported_at | INTEGER | 导入时间戳 |
| size | INTEGER | 文件大小(bytes) |
| hash | TEXT | 文件哈希 |
| custom_fields | TEXT | JSON 自定义字段 |
| notes | TEXT | 备注 |
| stars | INTEGER | 评分 (0起) |
| folder_id | INTEGER FK | 所属文件夹 |
| reference | TEXT | 引用路径 |
| path | TEXT | 文件系统路径 |
| thumb | INTEGER | 缩略图状态 (0/1) |
| recycled | INTEGER | 回收站标记 (0/1) |
| tags | TEXT | JSON 标签 ID 数组 |

### folders 表 / tags 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| title | TEXT | 名称 |
| parent_id | INTEGER FK | 父级 ID（支持树形） |
| color | INTEGER | 颜色值 |
| icon | TEXT/INTEGER | 图标 |

## 测试与质量

当前无独立测试文件。`getFiles` 方法有丰富的过滤条件构建逻辑，建议优先补充单元测试。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 模块入口 |
| `src/ILibraryServerData.ts` | 存储接口定义 (79 行) |
| `src/LibraryServerDataSQLite.ts` | SQLite 实现 (~930 行) |
| `package.json` | 包配置 (name: mira-storage-sqlite, v1.0.20) |
