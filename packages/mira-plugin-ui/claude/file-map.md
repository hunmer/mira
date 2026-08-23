# mira-plugin-ui 文件清单

src 合计约 **406** 个源文件：396 `.vue`（其中 components/ui 下 376）+ ts/css/字体（2026-08-23 统计）。

```text
packages/mira-plugin-ui/
├── package.json               # v1.1.0，exports：. / ./library / ./mira-plugin-ui.css / ./dist/* / ./src/*
├── vite.config.ts             # 库构建 es+umd，vue 唯一 external
├── tsconfig.json
├── components.json            # shadcn-vue CLI 配置（new-york-v4）
├── index.html                 # demo dev 入口
├── README.md
├── demo/
│   ├── App.vue                # 真实 server + SDK 实测页（BatchUpload/SaveLocation/MediaBrowser/LibraryTree/ServerManager）
│   ├── main.ts
│   └── fetch-registry.mjs     # 从 shadcn-vue 官方 registry(new-york-v4) 拉源码写入 ui/（CLI add 失败的替代通道）
├── dist/                      # mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css
└── src/
    ├── index.ts               # 根入口：5 业务组件 + LibrarySelect + ui 命名空间 + Vue plugin
    ├── types.ts               # SaveLocation / BatchUpload* 类型
    ├── BatchUploadDialog.vue  # 顶层业务组件（5 个）
    ├── BatchUploadForm.vue
    ├── FileInfoForm.vue
    ├── SaveLocationDialog.vue
    ├── SaveLocationForm.vue
    ├── lib/utils.ts           # cn()
    ├── assets/
    │   ├── tailwind.css       # Tailwind v4 token 源（@source "../"）
    │   └── fonts/material-icons.woff2
    ├── components/ui/         # 67 个组件目录 / 376 vue（官方 + 扩展，只增不改）
    │   ├── 官方：accordion alert alert-dialog aspect-ratio avatar badge breadcrumb
    │   │   button button-group calendar card carousel chart checkbox collapsible
    │   │   combobox command context-menu dialog drawer dropdown-menu form hover-card
    │   │   input input-group input-otp kbd label menubar native-select navigation-menu
    │   │   number-field pagination pin-input popover progress radio-group range-calendar
    │   │   resizable scroll-area select separator sheet sidebar skeleton slider
    │   │   sonner spinner switch table tabs textarea toggle toggle-group tooltip
    │   └── 扩展：attachment bubble empty field icon-picker item marker message
    │       message-scroller questionnaire(17 文件) stepper tags-input
    └── library/               # 媒体库组件族子入口（15 vue + 9 ts）
        ├── index.ts           # 全量导出（组件/hooks/tree/drag-data/filterBar/serverAuth/i18n/类型）
        ├── types.ts
        ├── tree.ts / drag-data.ts / i18n.ts / filterBar.ts / serverAuth.ts
        ├── useLibraryTreeData.ts / useLibraryTreeActions.ts
        ├── LibraryTree.vue / LibraryTreeView.vue / LibrarySelect.vue
        ├── CreateNodeDialog.vue / ContextMenu.vue / Dropzone.vue
        ├── MediaBrowser.vue / MediaWaterfall.vue / MediaDetail.vue
        ├── MediaLibraryView.vue / MediaPickerDialog.vue
        ├── FilterBar.vue / SavedFilterDialog.vue
        └── ServerManagerView.vue / ServerManagerDialog.vue
```
