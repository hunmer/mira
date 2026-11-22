# mira-plugin-ui 文件清单

src 合计 **490** 个源文件：397 `.vue`（其中 components/ui 下 376）+ 91 `.ts` + css/字体（2026-11-21 统计）。

```text
packages/mira-plugin-ui/
├── package.json               # v1.1.0，exports：. / ./library / ./mira-plugin-ui.css / ./dist/* / ./src/*
├── vite.config.ts             # 库构建 es+umd，vue 唯一 external
├── tsconfig.json
├── components.json            # shadcn-vue CLI 配置（new-york-v4）
├── index.html                 # demo dev 入口
├── README.md                  # 含 i18n 章节（setLocale/t prop/文案 props 接管法）
├── demo/
│   ├── App.vue                # 真实 server + SDK 实测页（BatchUpload/SaveLocation/MediaBrowser/LibraryTree/ServerManager/locale 切换/树排序与 tiles/fileDrop）
│   ├── main.ts
│   └── fetch-registry.mjs     # 从 shadcn-vue 官方 registry(new-york-v4) 拉源码写入 ui/（CLI add 失败的替代通道）
├── dist/                      # mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css
└── src/
    ├── index.ts               # 根入口：6 业务组件 + LibrarySelect + i18n + ui 命名空间 + Vue plugin
    ├── i18n.ts                # 包级 i18n 单例（zh/en 词典 + setLocale/useI18n/parseLocale，631 行）
    ├── types.ts               # SaveLocation / BatchUpload* / DeviceList* 类型（tags=标签 ID）
    ├── BatchUploadDialog.vue  # 顶层业务组件（6 个）
    ├── BatchUploadForm.vue
    ├── DeviceListPicker.vue
    ├── FileInfoForm.vue
    ├── SaveLocationDialog.vue
    ├── SaveLocationForm.vue
    ├── lib/utils.ts           # cn()
    ├── assets/
    │   ├── tailwind.css       # Tailwind v4 token 源（@source "../"）
    │   └── fonts/material-icons.woff2
    ├── components/ui/         # 68 个组件目录 / 376 vue（官方 + 扩展，只增不改）
    │   ├── 官方：accordion alert alert-dialog aspect-ratio avatar badge breadcrumb
    │   │   button button-group calendar card carousel chart checkbox collapsible
    │   │   combobox command context-menu dialog drawer dropdown-menu form hover-card
    │   │   input input-group input-otp kbd label menubar native-select navigation-menu
    │   │   number-field pagination pin-input popover progress radio-group range-calendar
    │   │   resizable scroll-area select separator sheet sidebar skeleton slider
    │   │   sonner spinner switch table tabs textarea toggle toggle-group tooltip
    │   ├── 扩展：attachment bubble empty field icon-picker item marker message
    │   │   message-scroller questionnaire(17 文件) stepper tags-input
    │   └── draggable/         # 2026-11 新增：index.ts 转发 vue-draggable-plus
    └── library/               # 媒体库组件族子入口（15 vue + 10 ts）
        ├── index.ts           # 全量导出（组件/hooks/tree/drag-data/defaultDropUpload/filterBar/serverAuth/i18n/类型）
        ├── types.ts
        ├── tree.ts            # buildTree/sortTree/filterTree/flattenTree/collectIds/ROOT_ID
        ├── drag-data.ts       # parseDrop（DOMParser + srcset + Pinterest 专属数据）/canAcceptDrop/urlKind
        ├── defaultDropUpload.ts  # 2026-11 新增：拖放上传默认处理（direct/dialog）
        ├── i18n.ts            # 兜底 t 转发（词典已收敛到 src/i18n.ts）
        ├── filterBar.ts       # 8 项默认过滤规则（含 date）+ toApiFilters
        ├── serverAuth.ts
        ├── useLibraryTreeData.ts   # +seed() 宿主缓存占位
        ├── useLibraryTreeActions.ts
        ├── LibraryTree.vue / LibraryTreeView.vue   # 树视图（排序/tiles/连线/拖放上传）
        ├── LibrarySelect.vue
        ├── CreateNodeDialog.vue / ContextMenu.vue / Dropzone.vue
        ├── MediaBrowser.vue / MediaWaterfall.vue / MediaDetail.vue
        ├── MediaLibraryView.vue / MediaPickerDialog.vue
        ├── FilterBar.vue / SavedFilterDialog.vue
        └── ServerManagerView.vue / ServerManagerDialog.vue
```
