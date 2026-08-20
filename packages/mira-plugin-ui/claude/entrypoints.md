# mira-plugin-ui 入口与消费方式

## package.json exports

| 入口 | types | 运行时 | 用途 |
|------|-------|--------|------|
| `.` | `./src/index.ts` | import: `dist/mira-plugin-ui.es.js`；require: `dist/mira-plugin-ui.umd.js` | 主入口：业务组件 + 全部 ui 组件 + 默认 Vue plugin |
| `./library` | `./src/library/index.ts` | 同左（**源码消费**） | 树体系子入口，不引入 tailwind.css，宿主自带 tailwind/shadcn 环境 |
| `./mira-plugin-ui.css` | — | `dist/mira-plugin-ui.css` | 编译好的自包含 CSS |
| `./dist/*`、`./src/*` | — | 直通 | 允许直引产物与源码文件 |

`main` = umd，`module` = es；`files` = dist + src。

## 三种消费形态

### 1. 源码/ESM（Vite 项目）

```ts
import { SaveLocationDialog } from 'mira-plugin-ui'
import 'mira-plugin-ui/mira-plugin-ui.css'
```

`file:` 链接（mira_tiptap_format/web 即此形态）时，改本库源码后需 `pnpm build` 重新生成 dist（开发期可 `build:watch`）。

### 2. CDN / UMD（任意 HTML）

```html
<script src=".../vue.global.prod.js"></script>
<link rel="stylesheet" href=".../mira-plugin-ui.css">
<script src=".../mira-plugin-ui.umd.js"></script>
<script>
  app.use(MiraPluginUI.default)      // 全局注册全部组件
  // 或 const { SaveLocationDialog } = MiraPluginUI
</script>
```

### 3. library 子入口 / src 直引（mira-browser-extension）

```ts
import { LibraryTreeView, useLibraryTreeData, buildTree, ROOT_ID } from 'mira-plugin-ui/library'
import type { LibraryTreeServices } from 'mira-plugin-ui/library'
import BatchUploadForm from 'mira-plugin-ui/src/BatchUploadForm.vue'   // 直引源码
```

扩展侧自带 tailwind v4 + shadcn token，因此 library 走源码而非 dist。

## 开发入口

- `index.html` + `demo/main.ts` + `demo/App.vue`：`pnpm dev` 启动。alias `mira-app-core/shared/sdk` → `../mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs`（demo 直接消费已构建 SDK，不引入其 node 依赖）；server 无 CORS，请求经 vite 代理 `/mira-api → http://127.0.0.1:8081`。
- vite-plugin-vue-devtools 仅 dev 生效（`apply: 'serve'`），Ctrl+Alt+D（macOS Ctrl+Shift+D）组件审查。

## 构建

Vite 库模式：entry `src/index.ts`，formats `['es','umd']`，globalName `MiraPluginUI`，external 仅 `['vue']`，`exports: 'named'`，`cssCodeSplit: false`，`assetsInlineLimit` 极大值（字体内联）。产物固定命名：`mira-plugin-ui.es.js` / `mira-plugin-ui.umd.js` / `mira-plugin-ui.css`。
