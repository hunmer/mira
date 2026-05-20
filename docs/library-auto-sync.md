# 素材库文件自动同步

## 概述

服务端启动时为每个活跃的本地素材库启动文件监听（基于 chokidar），自动将文件夹内的文件变更同步到数据库。

默认开启，可在 Dashboard 编辑素材库时通过「启用自动同步」开关控制。

## 触发场景

| 操作 | 处理方式 |
|------|---------|
| 新增文件 | 按子目录结构查找/创建 folder，导入 DB，广播 `file::created` |
| 移动文件 | 匹配 unlink+add（按文件大小），更新已有记录的 path/name/folder_id，保留元数据 |
| 重命名文件 | 同移动逻辑，更新 name 和 path |
| 删除文件 | 3 秒内无匹配 add 则从 DB 删除记录，广播 `file::deleted` |

## 启动时初始同步

`ignoreInitial: true` 跳过 chokidar 的初始事件，由 `initialSync()` 单独扫描整个库文件夹，将未入库的文件逐条导入并广播。

## 忽略规则

以下路径不会被监听和同步：

- `thumbs/` 目录（缩略图）
- `.db` / `.db-journal` / `.db-wal` / `.db-shm`（SQLite 文件）
- `.` 开头的隐藏文件/目录
- `.tmp` / `.temp` 临时文件
- 0 字节空文件

## 配置

存储在 `librarys.json` 的 `customFields.enableAutoSync` 字段，默认 `true`。

```json
{
  "customFields": {
    "enableAutoSync": true
  }
}
```

## 相关文件

| 文件 | 职责 |
|------|------|
| `packages/mira-app-server/src/LibraryWatcher.ts` | 监听核心：chokidar 配置、文件事件处理、初始扫描 |
| `packages/mira-app-server/src/LibraryStorage.ts` | 生命周期：load/enable/disable 时启停 watcher |
| `packages/mira-app-server/src/routes/LibraryRoutes.ts` | 配置传递：创建/更新库时处理 enableAutoSync 字段 |
