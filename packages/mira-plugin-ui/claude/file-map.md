# mira-plugin-ui 文件清单

src 共 **106** 个文件：80 `.vue` + 24 `.ts` + 1 `.css` + 1 `.woff2`（2026-08-20 统计，含 dist/node_modules 外全部源码）。

```
packages/mira-plugin-ui/
├── package.json               # v1.1.0，exports 三入口
├── vite.config.ts             # 库构建 es+umd，vue external
├── tsconfig.json
├── components.json            # shadcn-vue CLI 配置（new-york）
├── index.html                 # demo dev 入口
├── README.md                  # 使用/构建/新增组件说明
├── demo/
│   ├── App.vue                # 真实 server + SDK 实测页
│   ├── main.ts
│   └── fetch-registry.mjs     # CLI 失败时拉 shadcn registry
├── dist/                      # 构建产物：mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css
└── src/
    ├── index.ts               # 根入口（具名导出 + Vue plugin）
    ├── types.ts               # SaveLocation / BatchUpload* 类型
    ├── BatchUploadDialog.vue  # 业务组件（5 个）
    ├── BatchUploadForm.vue    #   使用 vue-selection-box 框选
    ├── FileInfoForm.vue
    ├── SaveLocationDialog.vue
    ├── SaveLocationForm.vue
    ├── lib/utils.ts           # cn()
    ├── assets/
    │   ├── tailwind.css       # Tailwind v4 token 源（@source "../"）
    │   └── fonts/material-icons.woff2
    ├── components/ui/         # shadcn-vue 官方 13 族（只增不改）
    │   ├── alert-dialog/      #   7 vue + index.ts
    │   ├── attachment/        #   9 vue + index.ts
    │   ├── button/            #   1 vue + index.ts
    │   ├── combobox/          #  11 vue + index.ts
    │   ├── dialog/            #  10 vue + index.ts
    │   ├── icon-picker/       #   1 vue + icon-names.ts + index.ts
    │   ├── input/  label/  progress/   # 各 1 vue + index.ts
    │   ├── popover/           #   4 vue + index.ts
    │   ├── select/            #  11 vue + index.ts
    │   ├── tabs/              #   4 vue + index.ts
    │   └── tags-input/        #   5 vue + index.ts
    └── library/               # 树体系子入口（16 文件）
        ├── index.ts
        ├── types.ts           # 全部类型与注入接口
        ├── tree.ts            # buildTree/filterTree/flattenTree/collectIds/ROOT_ID
        ├── drag-data.ts       # parseDrop/canAcceptDrop/urlKind
        ├── i18n.ts            # createLibraryTreeT（内置中文）
        ├── useLibraryTreeData.ts
        ├── useLibraryTreeActions.ts
        ├── LibraryTree.vue / LibraryTreeView.vue
        ├── CreateNodeDialog.vue / ContextMenu.vue / Dropzone.vue
        ├── LibrarySelect.vue
        ├── MediaBrowser.vue   # vue-masonry + vue-selection-box
        └── ServerManagerView.vue / ServerManagerDialog.vue
```

包根另有 `package-lock.json`（npm 历史遗留，monorepo 主体为 pnpm）。
