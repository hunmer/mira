# mira-plugin-ui 模块职责

## 目录职责

| 目录/文件 | 职责 |
|-----------|------|
| `src/index.ts` | 根入口：import tailwind.css + 具名导出全部组件 + 默认 Vue plugin（UMD `app.use()` 全局注册） |
| `src/*.vue`（5 个） | 顶层业务组件：批量上传（Dialog/Form）、文件信息表单、保存位置（Dialog/Form）。只组合 components/ui 官方组件 |
| `src/types.ts` | 顶层业务类型：`SaveLocation` / `BatchUploadFileMeta` / `BatchUploadPayload` / `BatchUploadFileService` |
| `src/lib/utils.ts` | `cn()`（clsx + tailwind-merge），shadcn 标准 |
| `src/components/ui/` | shadcn-vue 官方基础组件 13 族（只增不改）：alert-dialog、attachment、button、combobox、dialog、icon-picker、input、label、popover、progress、select、tabs、tags-input |
| `src/library/` | 素材库树体系（独立子入口，源码消费）：树视图、库选择、服务器管理、媒体浏览、右键菜单、拖放区 + 树工具/hooks/i18n/类型 |
| `src/assets/` | `tailwind.css`（Tailwind v4 token 源，`@source "../"` 扫描全 src）+ material-icons 字体 |
| `demo/` | dev 演示页：`App.vue` 经 mira-app-core SDK 连真实 server 实测组件；`fetch-registry.mjs` CLI 失败时拉 shadcn registry |
| `components.json` | shadcn-vue CLI 配置（new-york，css 指向 src/assets/tailwind.css） |

## src/library/ 内部

| 文件 | 职责 |
|------|------|
| `index.ts` | 子入口：导出组件 + hooks + tree/drag-data/i18n/serverAuth 工具 + 全部类型 |
| `LibraryTree.vue` / `LibraryTreeView.vue` | 文件夹/标签树视图（搜索、拖拽排序/跨层移动、右键菜单） |
| `CreateNodeDialog.vue` | 新建/编辑节点对话框（标题/描述/颜色/图标） |
| `LibrarySelect.vue` | 素材库选择下拉（支持跨服务器分组 `LibrarySelectServer`） |
| `ContextMenu.vue` | 右键菜单 |
| `Dropzone.vue` | 拖放区（文件/链接） |
| `MediaBrowser.vue` | 文件浏览器（瀑布流 vue-masonry + 框选 vue-selection-box，筛选/排序/缩略图；`enableSelection` 内置开启选择；`selectMode` single/multiple） |
| `MediaPickerDialog.vue` | 「从素材库选择媒体」通用对话框：Dialog + MediaBrowser 多选 + SDK 直连，确认抛 `MediaPickerFile[]`（原图/缩略图直链 + 宽高）；`selectMode` 可切单选 |
| `MediaWaterfall.vue` | 通用瀑布流（封装 vue-masonry，columnWidth/触底加载） |
| `serverAuth.ts` | `resolveMiraServerConfig`：server/token 通用解析（props → 窗口 query → 主窗口共享 localStorage） |
| `ServerManagerView.vue` / `ServerManagerDialog.vue` | 受管服务器增删改/测连/切换 |
| `useLibraryTreeData.ts` | 树数据加载与状态（基于 services） |
| `useLibraryTreeActions.ts` | 树节点动作（新建/删除/编辑/移动/排序，依赖 services + dialog） |
| `tree.ts` | 纯函数：`buildTree`（parent_id 组装、孤儿容错、sort_index+title 排序）/ `filterTree`（命中保留祖先、多关键词 AND）/ `flattenTree` / `collectIds` / `ROOT_ID=0` |
| `drag-data.ts` | 拖拽解析（静默版，自扩展迁移）：`parseDrop`（files + uri-list/text-html 链接）/ `canAcceptDrop` / `urlKind` |
| `i18n.ts` | `createLibraryTreeT`：内置中文文案，宿主传 t 接管 |
| `types.ts` | library 全部类型与注入接口（见 data-model.md） |
