# mira-plugin-ui 公共接口

## 根入口导出（src/index.ts）

业务组件（具名导出）：

| 组件 | 说明 |
|------|------|
| `BatchUploadDialog` | 批量上传对话框（组合 Form，可组件内并发上传） |
| `BatchUploadForm` | 批量上传表单（库/文件夹/标签选择 + 文件队列） |
| `FileInfoForm` | 文件元数据表单（文件名/URL/注释） |
| `SaveLocationDialog` | 保存位置对话框（保存文档场景，`.tiptap` 后缀） |
| `SaveLocationForm` | 保存位置表单 |
| `LibrarySelect` | 素材库选择（自 library 转出） |

基础组件 13 族（`export *`，shadcn-vue 官方）：`AlertDialog*`、`Attachment*`、`Button`、`Combobox*`、`Dialog*`、`IconPicker`、`Input`、`Label`、`Popover*`、`Progress`、`Select*`、`Tabs*`、`TagsInput*`。

默认导出：Vue plugin，`app.use()` 后按原名全局注册以上全部组件（CDN/UMD 用）。

类型导出：`BatchUploadFileService` / `BatchUploadFileMeta` / `BatchUploadPayload` / `SaveLocation` / `LibrarySelectOption` / `LibrarySelectServer`。

## library 子入口导出（src/library/index.ts）

组件：`LibraryTree`、`LibraryTreeView`、`CreateNodeDialog`、`LibrarySelect`、`ContextMenu`、`Dropzone`、`MediaBrowser`、`ServerManagerView`、`ServerManagerDialog`。

Hooks：`useLibraryTreeData`、`useLibraryTreeActions`（`LibraryTreeMenuState` / `UseLibraryTreeActionsOptions`）。

纯函数：`buildTree` / `filterTree` / `flattenTree` / `collectIds` / `ROOT_ID`；`parseDrop` / `canAcceptDrop` / `urlKind`；`createLibraryTreeT`。

类型：见 data-model.md。

## 关键 Props（抽样）

### BatchUploadDialog

`open`(受控)、`libraries`、`folders`、`tags?`、`initialLibraryId/FolderId?`、`initialTagTitles?`、`uploadFile?: BatchUploadFileService`（传入则组件内并发上传，默认并发 3）、`concurrency=3`、`maxFiles=200`、`initialFiles?`、`accept='*'`、`createNode?`。事件：`update:open`、`upload(BatchUploadPayload)`（未传 uploadFile 时交宿主）、`uploaded({ total, failed })`。

### SaveLocationDialog

`open`、`libraries`、`folders`、`tags?`、`initialLibraryId/FolderId?`、`initialFileName='document.tiptap'`、`initialUrl/Note?`、`createNode?`。事件：`save(SaveLocation)`、`library-change`、`remove-file`、`create-node`。

### SaveLocationForm / BatchUploadForm

与对应 Dialog 同源的表单体（`libraries` / `folders` / `tags` + initial 系列 + `uploadFile`/`createNode` 可选注入），供宿主自嵌布局。

### LibrarySelect

`LibrarySelectOption[]` 或按 `LibrarySelectServer` 分组的跨服务器候选；`LibrarySelectServer` 形态：`{ id?, name?, title?, libraries: LibrarySelectOption[] }`。

完整 Props 以各 SFC 内 `defineProps` 为准（本文抽样自源码，未逐一全量核对 80 个 .vue）。
