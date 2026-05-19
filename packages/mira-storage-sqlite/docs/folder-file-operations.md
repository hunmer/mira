# 文件夹与文件关联操作

## 存储模型

文件的物理路径由 `folder_id` 决定：

```
<libraryPath>/
├── 未分类/              ← folder_id 为 NULL
│   └── photo.png
├── 项目素材/            ← folder_id 指向 title="项目素材" 的 folder
│   └── asset.mp4
└── thumbs/
    ├── <hash>.png
    └── <id>.png
```

- `getFolderName(folderId)`: 有值返回 `folders.title`，无值返回 `"未分类"`
- `getItemFilePath(file)`: 返回 `<libraryPath>/<folderName>/<file.name>`

## 设置文件文件夹 (`setFileFolder`)

调用链：

```
FolderHandler (action: file_set)
  → ILibraryServerData.setFileFolder(fileId, folderId)
    → beginTransaction
      → _moveFileToFolder(fileId, folderId)
    → commitTransaction

FolderRouter POST /api/folders/file/set
  → BaseRouter.handleFileAssociation
    → ILibraryServerData.setFileFolder(fileId, folderId)
```

### `_moveFileToFolder(fileId, folderId)` — 核心逻辑

无事务包装的内部方法，供 `setFileFolder` 和 `deleteFolder` 复用。

1. 查询文件当前信息（`folder_id`, `name`）
2. 计算源目录名（`getFolderName(file.folder_id)`）和目标目录名（`getFolderName(folderId)`）
3. 如果目录不同：
   - `fs.renameSync` 移动物理文件
   - 自动创建目标目录（`mkdirSync recursive`）
4. `UPDATE files SET folder_id = ? WHERE id = ?`

`folderId` 传 `null` 表示移至未分类。

### 事务管理

- `setFileFolder` 自行管理事务，适合独立调用
- `deleteFolder` 在外层事务内直接调 `_moveFileToFolder`，避免嵌套 commit 冲突

## 删除文件夹 (`deleteFolder`)

调用链：

```
FolderHandler (action: delete, data: { id, deleteFiles })
  → ILibraryServerData.deleteFolder(id, deleteFiles)

FolderRouter DELETE /api/folders/delete
  → BaseRouter.handleCrudOperation → deleteFolder(id, deleteFiles)
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 文件夹 ID |
| `deleteFiles` | boolean? | `true` = 同时删除文件，`false/undefined` = 文件移至未分类 |

### 流程

```
deleteFolder(id, deleteFiles)
  ├── beginTransaction
  ├── 递归: deleteFolder(child.id, deleteFiles)  // 子文件夹
  ├── 获取 folderName（必须在删 folder 记录前拿到）
  ├── SELECT * FROM files WHERE folder_id = id
  ├── if deleteFiles:
  │     for each file:
  │       ├── fs.unlinkSync(物理文件)
  │       ├── fs.unlinkSync(缩略图)  // thumbs/<hash>.png
  │       └── DELETE FROM files WHERE id = ?
  ├── else:
  │     for each file:
  │       └── _moveFileToFolder(fileId, null)  // 移至未分类
  ├── DELETE FROM folders WHERE id = ?
  ├── 清理空目录（rmdirSync）
  └── commitTransaction
```

### 注意事项

1. **必须先拿 folderName**: 删 folders 记录后 `getFolderName(id)` 会返回 `"未分类"`，导致路径计算错误
2. **递归会提前 commit 事务**: 子文件夹的 `deleteFolder` 会 commit 外层事务，所以当前文件夹的文件操作需在递归之后、用 `SELECT *` 重新查询
3. **物理文件清理**: `deleteFiles=true` 时需手动删除物理文件和缩略图，`deleteFile()` 方法只删 DB 记录
4. **`_moveFileToFolder` 不开事务**: 供 `deleteFolder` 在外层事务内安全调用

## 前端对话框

`FolderTreeComponent` 通过 `useFolderOperations` composable 管理删除流程：

1. 右键菜单点"删除" → `handleDelete(type, item)` → 打开 `AlertDialog`
2. 对话框含 Checkbox: "同时删除文件夹内的文件"（默认关闭）
3. 确认 → `confirmDelete()` → `miraSDKService.deleteFolder(libraryId, folderId, deleteWithFiles)`
4. SDK 将 `deleteFiles` 传至后端 `DeleteFolderRequest`
