# mira-plugin-ui 数据模型

组件库自身**无持久化状态**：不直接访问数据源（background 桥 / SDK / fetch），一切数据经宿主注入。类型分两处：`src/types.ts`（上传/保存）与 `src/library/types.ts`（树体系）。

## 顶层（src/types.ts）

| 类型 | 说明 |
|------|------|
| `SaveLocation` | 保存结果：`{ libraryId, folderId?, tags?, url?, note?, fileName }`（url/note 存文件元数据 website/notes） |
| `BatchUploadFileMeta` | 每文件可编辑元数据：`{ fileName?, url?, note?, folderId?, tags? }` |
| `BatchUploadPayload` | 批量上传提交：`{ libraryId, folderId?, tags?, files: File[], metas?: BatchUploadFileMeta[] }`（与 files 同序） |
| `BatchUploadFileService` | `(item: { file, libraryId, folderId?, tags? } & BatchUploadFileMeta, onProgress(pct)) => Promise<unknown>`，传入则组件内并发上传 |

## library 树体系（src/library/types.ts）

### 节点形态

- `LibraryFlatItem`：后端 folder/tag 扁平项通用形态 `{ id, title, parent_id?, color?, description?, icon?(Material Icons 名), sort_index? }`。
- `LibraryTreeNode`：`buildTree` 组装后的树节点 `{ id, title, color?, description?, icon?, parentId, level, children[] }`。
- `LibraryTreeKind = 'folder' | 'tag'`；`ROOT_ID = 0`（parent_id 0/undefined/孤儿/自指 均视为根）。
- `LibraryTreeCreatePayload`：`{ kind, parentId(0=根), title, description?, color?, icon? }`；`LibraryTreeUpdatePayload = CreatePayload & { id }`。

### 注入接口（宿主实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `LibraryTreeServices` | `listFolders/listTags(libraryId)`、`createNode`、`deleteNode(deleteFiles?)`、`updateNode?`、`updateSortIndex?`（提供后启用拖拽排序）、`moveNode?`（提供后启用跨层拖拽） | 数据 CRUD；扩展走 background 桥，其他宿主可走 SDK |
| `LibraryTreeDialog` | `alert` / `confirm` / `prompt` / `confirmCheck` | Promise 风格弹窗（与扩展 useDialog 子集对齐） |
| `LibraryTreeUpload` | `files(File[], target?)`、`urls(string[], target?)`、`pick?(target?)` | 上传路由；`LibraryTreeUploadTarget = { folderId? , tags? }`，缺省为库根目录 |
| `ServerManagerServices` | `add` / `edit` / `remove` / `test(serverURL, username, password) → { ok, error? }` / `activate(id) → boolean` | 受管服务器 `ManagedServer = { id, name, serverURL, username, password }` |
| `MediaBrowserServices` | `listFiles(filters?)`、`getThumbUrl?(item)`、`getMetadataByIds?(ids)`（提供后瀑布流按真实宽高布局，item.aspect 优先） | 文件浏览数据 |
| `LibraryTreeT` | `(key, params?) => string` | i18n 函数（vue-i18n 风格，缺省内置中文） |

### MediaBrowser 相关

- `MediaBrowserItem`：后端 FileData 兼容子集（SDK getFiles 返回值可直接传入），`aspect?: "W:H"` 控制瀑布流卡片高度（缺省 1:1）。
- `MediaBrowserFilters`：`{ title?, category?: 'image'|'video'|'audio', sort?: 'imported_at'|'name'|'size', order?: 'asc'|'desc' }`。
- `LibrarySelectOption = { id, name?, title? }`；`LibrarySelectServer = { id?, name?, title?, libraries[] }`（跨服务器分组，库 id 需全局唯一）。

### 其他

- `LibraryTreeDropPosition = 'before' | 'after' | 'inside'`：树内拖拽落点。
- `ParsedDrop`（drag-data）：`{ files: File[], urls: string[], hasContent }`。
- 拖拽排序语义：`updateSortIndex(kind, libraryId, items: { id, sort_index }[])` 传该层**全部兄弟**的新顺序。
