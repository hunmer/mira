# mira-plugin-ui 数据模型

组件库自身**无持久化状态**：不直接访问数据源（background 桥 / SDK / fetch），一切数据经宿主注入。类型分两处：`src/types.ts`（上传/保存/设备）与 `src/library/types.ts`（树体系）。

## 顶层（src/types.ts）

| 类型 | 说明 |
|------|------|
| `SaveLocation` | 保存结果：`{ libraryId, folderId?, tags?, url?, note?, fileName }`（url/note 存文件元数据 website/notes；tags 为标签 ID） |
| `BatchUploadFileMeta` | 每文件可编辑元数据：`{ fileName?, url?, note?, folderId?, tags? }`（tags 为**标签 ID**，2026-11 起语义变更） |
| `BatchUploadPayload` | 批量上传提交：`{ libraryId, folderId?, tags?, files: File[], metas?: BatchUploadFileMeta[] }`（与 files 同序） |
| `BatchUploadFileService` | `(item: { file, libraryId, folderId?, tags? } & BatchUploadFileMeta, onProgress(pct)) => Promise<unknown>`，传入则组件内并发上传 |

## library 树体系（src/library/types.ts）

### 节点形态

- `LibraryFlatItem`：后端 folder/tag 扁平项通用形态 `{ id, title, parent_id?, color?, description?, icon?(Material Icons 名), sort_index?, created_at?(ISO/毫秒), last_used_at?(毫秒,宿主自行记录) }`。
- `LibraryTreeNode`：`buildTree` 组装后的树节点 `{ id, title, color?, description?, icon?, parentId, level, children[], created_at?, last_used_at? }`（时间字段供排序）。
- `LibraryTreeKind = 'folder' | 'tag'`；`ROOT_ID = 0`（parent_id 0/undefined/孤儿/自指 均视为根）。
- `LibraryTreeSortMode = 'id' | 'title' | 'created_at' | 'last_used' | 'custom'`（LibraryTreeView 的 `sort` prop；custom=sort_index 拖拽顺序，唯一启用拖拽排序的模式）。
- `LibraryTreeCreatePayload`：`{ kind, parentId(0=根), title, description?, color?, icon? }`；`LibraryTreeUpdatePayload = CreatePayload & { id }`。

### 注入接口（宿主实现）

| 接口 | 方法 | 说明 |
|------|------|------|
| `LibraryTreeServices` | `listFolders/listTags(libraryId)`、`createNode`、`deleteNode(deleteFiles?)`、`updateNode?`、`updateSortIndex?`（提供且 sort=custom 才启用拖拽排序）、`moveNode?`（提供后启用跨层拖拽） | 数据 CRUD；扩展走 background 桥，其他宿主可走 SDK |
| `LibraryTreeDialog` | `alert` / `confirm` / `prompt` / `confirmCheck` | Promise 风格弹窗；跨层移动确认已改内置 AlertDialog，dialog 现主要用于错误 alert |
| `LibraryTreeUpload` | `files(File[], target?)`、`urls(string[], target?)`、`pick?(target?, files?, urls?)`（dialog 模式预填） | 上传路由；`LibraryTreeUploadTarget = { folderId?, tags?: string[] }`（tags 传**标签 ID**），缺省为库根目录 |
| `ServerManagerServices` | `add` / `edit` / `remove` / `test(serverURL, username, password) → { ok, error? }` / `activate(id) → boolean` | 受管服务器 `ManagedServer = { id, name, serverURL, username, password }` |
| `MediaBrowserServices` | `listFiles(filters?)`、`getThumbUrl?(item)`、`getMetadataByIds?(ids)`（提供后瀑布流按真实宽高布局，item.aspect 优先） | 文件浏览数据；分页一页 200（宿主返回 total 才显示翻页条） |
| `LibraryTreeT` | `(key, params?) => string` | i18n 函数（宿主 vue-i18n 接管；缺省回退包级 `src/i18n.ts` 词典，随 `setLocale` 切换） |

### 拖放上传（2026-11 重构）

- `LibraryTreeDropUploadMode = 'direct' | 'dialog'`：direct=直接 `upload.files/urls`；dialog=`upload.pick(target, files, urls)` 预填。
- `LibraryTreeFileDropPayload = { node?, files: File[], urls: string[], target?, event: DragEvent }`：`fileDrop` 回调载荷。
- 互斥规则：传了 `fileDrop` 且未显式 `useDefaultDropUpload=true` → 走回调；否则走 `defaultDropUpload`。File 优先于 URL（网页图片拖拽常同时携带两者，是同一资源，避免重复上传/防盗链 400）。

### MediaBrowser / FilterBar 相关

- `MediaBrowserItem`：后端 FileData 兼容子集（SDK getFiles 返回值可直接传入），`aspect?: "W:H"` 控制瀑布流卡片高度（缺省 1:1）。
- `MediaBrowserFilters`：`{ title?, category?, urls?, tags?(id 数组), sizeMin/Max?, metaDim/metaDur Min/Max?, dateStart?, dateEnd?, dateMode?: 'imported'|'fileCreated', sort?, order?, limit? }`。
- `FilterRule`（filterBar.ts）：8 类（folders/tags/category/urls/title/size/metadata/**date**）；date 规则含 `dateStart/dateEnd/dateMode`，快照（`applySnapshotToRule`）与重置（`resetFilterRule`）均覆盖；规则快照可在桌面端与插件宿主间互拷。
- `toApiFilters`：日期区间 → `imported_after/imported_before`（dateMode='imported'，默认）或 `created_after/created_before`（'fileCreated'）；ISO 字符串，起始 00:00:00.000、结束 23:59:59.999。
- `LibrarySelectOption = { id, name?, title? }`；`LibrarySelectServer = { id?, name?, title?, libraries[] }`（跨服务器分组，库 id 需全局唯一）。

### 其他

- `LibraryTreeDropPosition = 'before' | 'after' | 'inside'`：树内拖拽落点。
- `ParsedDrop`（drag-data）：`{ files: File[], urls: string[], hasContent }`；urls 解析含 DOMParser img 属性（src/data-src/data-original/data-lazy-src/data-image-url/srcset 最大档）与 Pinterest 专用拖拽数据（`previewImageUrl` 优先且独占）。
- 拖拽排序语义：`updateSortIndex(kind, libraryId, items: { id, sort_index }[])` 传该层**全部兄弟**的新顺序。
