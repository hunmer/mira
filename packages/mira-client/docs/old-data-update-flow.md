# file::updated 事件 old_data 机制

## 概述

当文件的标签、文件夹等属性变更时，客户端需要同时刷新**来源**和**目标**两个 Tab（如从 folderA 移到 folderB，两个 Tab 的文件计数都要更新）。为此，`file::updated` 事件携带 `old_data` 字段，保存变更前的完整文件记录。

## 事件数据结构

```json
{
  "eventName": "file::updated",
  "data": {
    "libraryId": "1778657429682",
    "fileId": 60,
    "folder_id": 2,
    "name": "example.mp4",
    "path": "G:\\test_library\\b\\example.mp4",
    "old_data": {
      "id": 60,
      "folder_id": 1,
      "tags": "[\"3\"]",
      "path": "G:\\test_library\\a\\example.mp4",
      "...": "其他数据库字段"
    }
  }
}
```

`old_data` 是 UPDATE 前的完整数据库行快照，由存储层在更新时自动获取。

## 存储层实现

`mira-storage-sqlite` 的三个写入方法统一返回 `{ success, oldData }`：

| 方法 | 文件 | 返回值 |
|------|------|--------|
| `updateFile(id, data)` | `mixins/FileOperations.ts` | `{ success: boolean, oldData: Record \| null }` |
| `setFileFolder(fileId, folderId)` | `mixins/FileImport.ts` | `{ success: boolean, oldData: Record \| null }` |
| `setFileTags(fileId, tagIds)` | `mixins/FileImport.ts` | `{ success: boolean, oldData: Record \| null }` |

实现原理（以 `updateFile` 为例）：

```typescript
async updateFile(id, fileData) {
  const oldData = await this.getFile(id);  // UPDATE 前 SELECT
  if (!oldData) return { success: false, oldData: null };
  // ... 执行 UPDATE
  return { success: result.changes > 0, oldData };
}
```

**设计原则**：old_data 由存储层统一管理，上层调用方不需要手动 `getFile` 取旧数据。

## 服务端广播点

所有产生 `file::updated` 事件的代码路径都会附带 `old_data`：

| 入口 | 文件 | 广播方式 |
|------|------|---------|
| HTTP `POST /api/files/upload`（元数据更新） | FileRoutes.ts | `broadcastLibraryEvent` + `broadcastPluginEvent` |
| HTTP `POST /api/files/upload`（文件+元数据更新） | FileRoutes.ts | `broadcastLibraryEvent` + `broadcastPluginEvent` |
| HTTP `POST /api/files/rename` | FileRoutes.ts | `broadcastFileEvent` 辅助方法 |
| HTTP `POST /api/files/update` | FileRoutes.ts | `broadcastFileEvent` 辅助方法 |
| HTTP `POST /api/folders/file/set` | FolderRouter.ts | `broadcastFolderEvent('file::updated', ...)` |
| WS `file/update` | FileHandler.ts | `broadcastLibraryEvent` |
| WS `folder/file_set` | FolderHandler.ts | `broadcastLibraryEvent('file::setFolder', ...)` |
| WS `tag/file_set` | TagHandler.ts | `broadcastLibraryEvent('file::setTag', ...)` |
| LibraryWatcher 检测移动 | LibraryWatcher.ts | `broadcastLibraryEvent` |

## LibraryWatcher 忽略机制

API 操作（如 `POST /api/folders/file/set`）会物理移动文件，LibraryWatcher 会检测到这次移动并广播冗余事件。为避免重复处理：

1. API 移动文件前，调用 `watcher.ignorePath(oldPath)` 注册旧路径
2. 移动完成后，调用 `watcher.ignorePath(newPath)` 注册新路径
3. Watcher 的 `handleUnlink` 和 `handleNewFile` 检查路径是否在忽略列表中，命中则跳过
4. 忽略条目 10 秒后自动过期清除

```typescript
// FolderRouter.ts
const watcher = this.backend.libraries!.getLibrary(libraryId)?.watcher;
if (oldFile && watcher) {
  watcher.ignorePath(oldFilePath);  // 移动前
}
await db.setFileFolder(fileId, folderId);
if (watcher) watcher.ignorePath(newFilePath);  // 移动后
```

## 客户端 Tab 匹配

### FolderTabType

同时匹配新 `folder_id` 和旧 `old_data.folder_id`：

```typescript
shouldUpdateForEvent(tabData, eventData) {
  if (tabData.libraryId !== eventData.libraryId) return false;
  const tabFolderId = tabData.id || tabData.folderId;
  if (String(tabFolderId) === String(eventData.folder_id)) return true;       // 目标
  if (String(tabFolderId) === String(eventData.old_data?.folder_id)) return true; // 来源
  return false;
}
```

### TagTabType

同时匹配新 `tags` 和旧 `old_data.tags`（兼容 JSON 字符串和数组）：

```typescript
shouldUpdateForEvent(tabData, eventData) {
  if (tabData.libraryId !== eventData.libraryId) return false;
  // 检查新标签
  if (eventData.tags) {
    const tags = typeof eventData.tags === 'string' ? JSON.parse(eventData.tags) : eventData.tags;
    if (matchTags(tags)) return true;
  }
  // 检查旧标签
  if (eventData.old_data?.tags) {
    const oldTags = typeof eventData.old_data.tags === 'string' ? JSON.parse(eventData.old_data.tags) : eventData.old_data.tags;
    if (matchTags(oldTags)) return true;
  }
  return false;
}
```

## 数据流完整示例

文件从 folderA (id=1) 移到 folderB (id=2)：

```
客户端调用 POST /api/folders/file/set { fileId: 60, folder: 2 }
    │
    ▼
FolderRouter
    ├── watcher.ignorePath("G:\test_library\a\file.mp4")
    ├── db.setFileFolder(60, 2)
    │     └── getFile(60) → { folder_id: 1, ... }   ← oldData
    │     └── UPDATE files SET folder_id = 2 WHERE id = 60
    │     └── return { success: true, oldData: { folder_id: 1, ... } }
    ├── watcher.ignorePath("G:\test_library\b\file.mp4")
    └── broadcastLibraryEvent('file::updated', {
          ...newFile, folder_id: 2,
          old_data: { folder_id: 1, ... }
        })
    │
    ▼
客户端收到 file::updated
    ├── markTabsForEvent() 遍历所有 Tab
    │     ├── folder-1 Tab: old_data.folder_id === 1 → needUpdate ✓
    │     └── folder-2 Tab: folder_id === 2 → needUpdate ✓
    └── 活跃 Tab 立即刷新，非活跃 Tab 懒加载
    │
    ▼
LibraryWatcher 检测到物理文件移动
    └── isIgnored(newPath) === true → 跳过
```

## 涉及文件

### 存储层

| 文件 | 改动 |
|------|------|
| `mira-storage-sqlite/src/ILibraryServerData.ts` | `updateFile`/`setFileFolder`/`setFileTags` 返回类型改为 `{ success, oldData }` |
| `mira-storage-sqlite/src/mixins/FileOperations.ts` | `updateFile` 内部先 `getFile` 取旧数据 |
| `mira-storage-sqlite/src/mixins/FileImport.ts` | `setFileFolder`/`setFileTags` 内部先 `getFile` 取旧数据 |
| `mira-storage-sqlite/src/mixins/types.ts` | `CoreAccessible` 接口补充 `getFile` |

### 服务端

| 文件 | 改动 |
|------|------|
| `mira-app-server/src/routes/FileRoutes.ts` | 4 处 `updateFile` 调用解构 `oldData`，删除手动 `getFile` |
| `mira-app-server/src/routes/FolderRouter.ts` | `/file/set` 路由重写，注册 Watcher 忽略 + 广播 `file::updated` |
| `mira-app-server/src/routes/TagRouter.ts` | `setFileTags` 返回值解构 `oldData` |
| `mira-app-server/src/routes/BaseRouter.ts` | `handleFileAssociation` 增加 `onSuccess` 回调选项 |
| `mira-app-server/src/handlers/FileHandler.ts` | `update` case 解构 `oldData`，广播含 `old_data` |
| `mira-app-server/src/handlers/FolderHandler.ts` | `file_set` case 解构 `oldData`，广播含 `old_data` |
| `mira-app-server/src/handlers/TagHandler.ts` | `file_set` case 解构 `oldData`，广播含 `old_data` |
| `mira-app-server/src/services/ThumbnailService.ts` | `updateFile` 返回值未使用，注释标注 |
| `mira-app-server/src/LibraryWatcher.ts` | 新增 `ignoredPaths` 集合 + `ignorePath`/`isIgnored` 方法 |

### 客户端

| 文件 | 改动 |
|------|------|
| `composables/tabs/FolderTabType.ts` | `shouldUpdateForEvent` 同时匹配新旧 `folder_id` |
| `composables/tabs/TagTabType.ts` | `shouldUpdateForEvent` 同时匹配新旧 `tags`，兼容 JSON 字符串 |
