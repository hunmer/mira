# mira-plugin-ui 公共接口

## 根入口导出（src/index.ts）

业务组件（具名导出，6 个）：

| 组件 | 说明 |
|------|------|
| `BatchUploadDialog` | 批量上传对话框（组合 Form，可组件内并发上传） |
| `BatchUploadForm` | 批量上传表单（库/文件夹/标签选择 + 文件队列；标签按 ID 提交） |
| `FileInfoForm` | 文件元数据表单（文件名/URL/注释） |
| `SaveLocationDialog` | 保存位置对话框（保存文档场景，`.tiptap` 后缀；`initialTags` 预选标签） |
| `SaveLocationForm` | 保存位置表单 |
| `DeviceListPicker` | 设备选择（平台名/图标随 locale） |
| `LibrarySelect` | 素材库选择（自 library 转出） |

i18n（2026-11 新增）：`useI18n`（返回 `{ locale, t }`）/ `setLocale(locale)` / `parseLocale` / `type Locale = 'zh' | 'en'`。

基础组件 68 族（`export *`，`ui` 命名空间）：shadcn-vue 官方全量（accordion、alert、alert-dialog、avatar、badge、breadcrumb、button、button-group、calendar、card、carousel、chart、checkbox、collapsible、combobox、command、context-menu、dialog、drawer、dropdown-menu、form、hover-card、input、input-group、input-otp、kbd、label、menubar、native-select、navigation-menu、number-field、pagination、pin-input、popover、progress、radio-group、range-calendar、resizable、scroll-area、select、separator、sheet、sidebar、skeleton、slider、sonner、spinner、switch、table、tabs、textarea、toggle、toggle-group、tooltip 等）+ 自有扩展块（aspect-ratio、attachment、bubble、empty、field、icon-picker、item、marker、message、message-scroller、questionnaire、stepper、tags-input）+ `draggable`（转发 vue-draggable-plus 全量导出）。

默认导出：Vue plugin，`app.use()` 后按原名全局注册以上全部组件（CDN/UMD 用）。

类型导出：`BatchUploadFileService` / `BatchUploadFileMeta` / `BatchUploadPayload` / `SaveLocation` / `DeviceListItem` / `DeviceListPickerServices` / `LibrarySelectOption` / `LibrarySelectServer`。

## library 子入口导出（src/library/index.ts）

组件（15 个 .vue）：`LibraryTree`、`LibraryTreeView`、`CreateNodeDialog`、`LibrarySelect`、`ContextMenu`、`Dropzone`、`MediaBrowser`、`MediaWaterfall`、`MediaDetail`、`MediaLibraryView`、`MediaPickerDialog`、`FilterBar`、`SavedFilterDialog`、`ServerManagerView`、`ServerManagerDialog`。

Hooks：`useLibraryTreeData`（含 `seed` 占位注入）、`useLibraryTreeActions`（`LibraryTreeMenuState` / `UseLibraryTreeActionsOptions`）。

纯函数：`buildTree` / `sortTree`（新增）/ `filterTree` / `flattenTree` / `collectIds` / `ROOT_ID`；`parseDrop` / `canAcceptDrop` / `urlKind`；`defaultDropUpload`（新增）；`createLibraryTreeT`；`useI18n` / `setLocale` / `parseLocale`（自包级 i18n 转出，新增）；filterBar 规则（`createDefaultFilterRules` / `resetFilterRule` / `applySnapshotToRule` / `rulesToFilters` / `hasActiveFilterConditions` / `toApiFilters` / `filterIconOf`）；`resolveMiraServerConfig`。

类型：见 data-model.md；新增 `LibraryTreeSortMode` / `LibraryTreeFileDropPayload` / `LibraryTreeDropUploadMode` / `Locale`。

## 关键 Props（抽样）

### LibraryTreeView（2026-11 大改）

`services` / `dialog?` / `upload?`（注入接口）之外新增/变化：

- `sort?: LibraryTreeSortMode`（`'id' | 'title' | 'created_at' | 'last_used' | 'custom'`，默认 id；custom 为唯一可拖拽排序模式，切换 UI 由宿主实现）
- `view?: 'tree' | 'tiles'`（受控；tiles=叶子层多行平铺、父级分组卡片恒展开）
- `refreshKey?: number`（变化时强制重载数据，不重置展开/搜索）
- `fileDrop?: (payload: LibraryTreeFileDropPayload) => void`（自定义拖放处理；与默认上传互斥）
- `useDefaultDropUpload?: boolean`（传了 fileDrop 时须显式 true 才走默认上传；Vue Boolean prop 缺省 false）
- `defaultDropUploadMode?: 'direct' | 'dialog'`（direct=直传 upload.files/urls；dialog=upload.pick 预填，无 pick 回退 direct）
- 跨层移动确认改**内置 AlertDialog**（`dialog` 注入现用于错误 alert）

### FilterBar

7 类筛选器 + **date**（第 8 类，2026-11 新增）：`dateStart`/`dateEnd`（YYYY-MM-DD）+ `dateMode: 'imported' | 'fileCreated'`；`toApiFilters` 映射为 `imported_after/imported_before` 或 `created_after/created_before`（ISO，起始 00:00:00.000、结束 23:59:59.999）。savedFilters 传入才显示已保存过滤器区；数据与持久化归宿主。

### BatchUploadDialog

`open`(受控)、`libraries`、`folders`、`tags?`、`initialLibraryId/FolderId?`、`initialTagTitles?`（兼容旧标题值，**新调用方传标签 ID**）、`uploadFile?: BatchUploadFileService`（传入则组件内并发上传，默认并发 3）、`concurrency=3`、`maxFiles=200`、`initialFiles?`、`accept='*'`、`createNode?`；文案 props（`title`/`description`/`submitText`/`cancelText`）缺省走内置 i18n。事件：`update:open`、`upload(BatchUploadPayload)`（未传 uploadFile 时交宿主）、`uploaded({ total, failed })`。

### SaveLocationDialog

`open`、`libraries`、`folders`、`tags?`、`initialLibraryId/FolderId?`、`initialTags?`（预选标签名/ID）、`initialFileName='document.tiptap'`、`initialUrl/Note?`、`createNode?`、文案 props。事件：`save(SaveLocation)`、`library-change`、`remove-file`、`create-node`。

### SaveLocationForm / BatchUploadForm

与对应 Dialog 同源的表单体（`libraries` / `folders` / `tags` + initial 系列 + `uploadFile`/`createNode` 可选注入），供宿主自嵌布局。

### LibrarySelect

`LibrarySelectOption[]` 或按 `LibrarySelectServer` 分组的跨服务器候选；`LibrarySelectServer` 形态：`{ id?, name?, title?, libraries: LibrarySelectOption[] }`。

完整 Props 以各 SFC 内 `defineProps` 为准（本文抽样自源码，未逐一全量核对 80+ 个 .vue）。
