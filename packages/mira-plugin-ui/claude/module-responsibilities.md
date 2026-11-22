# mira-plugin-ui 模块职责

## 目录职责

| 目录/文件 | 职责 |
|-----------|------|
| `src/index.ts` | 根入口：import tailwind.css + 具名导出全部组件 + i18n（`useI18n`/`setLocale`/`parseLocale`/`Locale`）+ 默认 Vue plugin（UMD `app.use()` 全局注册） |
| `src/*.vue`（6 个） | 顶层业务组件：批量上传（Dialog/Form）、文件信息表单、保存位置（Dialog/Form）、设备选择（DeviceListPicker）。只组合 components/ui 官方组件 |
| `src/i18n.ts` | **包级 i18n 单例**（631 行）：zh/en 扁平 key 词典 + `{x}` 插值；locale ref + `setLocale`/`useI18n`/`parseLocale`；初始探测 `window.mira.app.locale` → `navigator.language` → zh。全部顶层组件文案消费此模块 |
| `src/types.ts` | 顶层业务类型：`SaveLocation` / `BatchUploadFileMeta` / `BatchUploadPayload` / `BatchUploadFileService` / `DeviceListItem` / `DeviceListPickerServices`（`tags` 语义已改为标签 ID） |
| `src/lib/utils.ts` | `cn()`（clsx + tailwind-merge），shadcn 标准 |
| `src/components/ui/` | shadcn-vue 官方基础组件 68 目录（只增不改）：alert-dialog、attachment、button、combobox、dialog、draggable（转发 vue-draggable-plus）、icon-picker、input、label、popover、progress、select、tabs、tags-input 等（全清单见 file-map.md） |
| `src/library/` | 媒体库组件族（独立子入口，源码消费）：树视图、库选择、服务器管理、媒体浏览、筛选、右键菜单、拖放区 + 树工具/hooks/i18n/类型 |
| `src/assets/` | `tailwind.css`（Tailwind v4 token 源，`@source "../"` 扫描全 src）+ material-icons 字体 |
| `demo/` | dev 演示页：`App.vue` 经 mira-app-core SDK 连真实 server 实测组件（含 locale 切换、树排序/视图切换、fileDrop 演示）；`fetch-registry.mjs` CLI 失败时拉 shadcn registry |
| `components.json` | shadcn-vue CLI 配置（new-york，css 指向 src/assets/tailwind.css） |

## src/library/ 内部

| 文件 | 职责 |
|------|------|
| `index.ts` | 子入口：导出组件 + hooks + tree/drag-data/defaultDropUpload/i18n（含包级 useI18n/setLocale/parseLocale/Locale 转出）+ filterBar/serverAuth 工具 + 全部类型 |
| `LibraryTree.vue` / `LibraryTreeView.vue` | 文件夹/标签树视图：搜索、5 种展示排序（`sort`: id/title/created_at/last_used/custom）、`view='tiles'` 平铺视图（叶子层多行 chip、父级分组卡恒展开、根层散叶聚合「根目录」虚拟卡）、分支连接线（底衬主干+分支弧线，dashoffset 生长动画 + 手写 rAF 弹簧）、树内拖拽排序（仅 custom）与跨层移动（内置 AlertDialog 确认）、拖放文件（`fileDrop` 回调 / 内置 `defaultDropUpload` direct/dialog 模式互斥）、`refreshKey` 强制重载、`v-model:selected` 受控选择 |
| `CreateNodeDialog.vue` | 新建/编辑节点对话框（标题/描述/颜色/图标） |
| `LibrarySelect.vue` | 素材库选择下拉（支持跨服务器分组 `LibrarySelectServer`） |
| `ContextMenu.vue` | 右键菜单 |
| `Dropzone.vue` | 拖放区（文件/链接） |
| `MediaBrowser.vue` | 文件浏览器（瀑布流 vue-masonry + 框选 vue-selection-box，筛选/排序/缩略图；分页一页 200；`enableSelection` 内置开启选择；`selectMode` single/multiple） |
| `MediaPickerDialog.vue` | 「从素材库选择媒体」通用对话框：Dialog + MediaBrowser 多选 + SDK 直连，确认抛 `MediaPickerFile[]`；`initialTags` 支持预选标签 |
| `MediaDetail.vue` | 文件详情面板 |
| `MediaLibraryView.vue` | 三栏整合视图（树 + 浏览 + 详情） |
| `MediaWaterfall.vue` | 通用瀑布流（封装 vue-masonry，columnWidth/触底加载） |
| `FilterBar.vue` | 过滤栏（mira-client FilterBar 的组件库自包含版，1140 行）：8 类筛选器（folders/tags/category/urls/title/size/metadata/date）、已保存过滤器（savedFilters props + save/delete 事件）、排序器；Dropdown 系换包内 Popover + 原生控件 |
| `SavedFilterDialog.vue` | 已保存过滤器的增改对话框 |
| `serverAuth.ts` | `resolveMiraServerConfig`：server/token 通用解析（props → 窗口 query → 主窗口共享 localStorage） |
| `ServerManagerView.vue` / `ServerManagerDialog.vue` | 受管服务器增删改/测连/切换 |
| `useLibraryTreeData.ts` | 树数据加载与状态（基于 services）；`seed(libId, items)` 注入宿主缓存占位立即渲染，`load` 覆盖 |
| `useLibraryTreeActions.ts` | 树节点动作（新建/删除/编辑/移动/排序，依赖 services + dialog） |
| `tree.ts` | 纯函数：`buildTree`（parent_id 组装、孤儿容错、sort_index+title 排序，透传 created_at/last_used_at）/ `sortTree`（按模式逐层重排，custom 原样）/ `filterTree`（命中保留祖先、多关键词 AND）/ `flattenTree` / `collectIds` / `ROOT_ID=0` |
| `drag-data.ts` | 拖拽解析（静默版，自扩展迁移）：`parseDrop`（files + 链接；HTML 用 DOMParser 解析 img 的 src/data-src/data-original/data-lazy-src/data-image-url + srcset 最大档；`text/uri-list ∥ text/x-moz-url ∥ text/url` 回退链；Pinterest 专用 `application/x-pinterest-*` JSON previewImageUrl 优先且独占）/ `canAcceptDrop`（宽松匹配 files/html/uri/url/nativeimage/pinterest）/ `urlKind` |
| `defaultDropUpload.ts` | 树视图拖放上传默认处理：direct 走 `upload.files/urls`（File 优先于 URL，防重复上传/防盗链 400），dialog 走 `upload.pick(target, files, urls)` 预填（无 pick 回退 direct） |
| `i18n.ts` | 兜底 t 转发：词典与包级 i18n 单例统一收敛到 `src/i18n.ts`；`createLibraryTreeT` 供宿主未传 t 时随包级 `setLocale` 切换 |
| `types.ts` | library 全部类型与注入接口（见 data-model.md） |
| `filterBar.ts` | 过滤规则纯函数：`createDefaultFilterRules`（8 项默认规则含 date）/ `resetFilterRule` / `applySnapshotToRule` / `rulesToFilters` / `hasActiveFilterConditions` / `toApiFilters`（含日期区间 → imported_after/before 或 created_after/before）/ `filterIconOf`（type→lucide 映射） |
