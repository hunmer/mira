# mira-plugin-ui

Mira 插件共享 UI 组件库。构建产物**自包含**（JS + 编译好的 CSS），可经 CDN 直接引入，不依赖宿主页面是否安装 tailwind / reka-ui / 任何组件库。

## 这是一个完整的 shadcn-vue 库

`src/components/ui/` 下的所有基础组件（button、dialog、input、label、select 等）**全部来自 shadcn-vue 官方 registry**，与官方 `npx shadcn-vue add` 产出的源码一致。

**禁止手写或魔改这些官方组件。** 官方组件通过 `useForwardPropsEmits` / `reactiveOmit` 正确地向 reka-ui 转发 props（过滤 `undefined` 键）；曾因手写包装时用 `v-bind="props"` 透传了 `undefined` 键，触发 reka-ui（vueuse `useVModel`）的受控模式误判，导致 Select 永远无法展开、Dialog 内容无法点击。业务组件（如 `SaveLocationDialog.vue`）只组合官方组件，不重新实现它们。

## 目录结构

```
packages/mira-plugin-ui/
├── components.json          # shadcn-vue CLI 配置
├── vite.config.ts           # 库构建：ESM + UMD，vue 为 external
├── index.html               # demo 开发入口（npm run dev）
├── demo/                    # demo 页（SDK 真实数据验证 SaveLocationDialog）
│   ├── App.vue / main.ts
│   └── fetch-registry.mjs   # 从官方 registry 拉取组件（本机 CLI fetch 失败时的替代）
└── src/
    ├── index.ts             # 具名导出 + 默认 Vue plugin
    ├── SaveLocationDialog.vue   # 业务组件：组合官方组件实现
    ├── types.ts
    ├── lib/utils.ts         # cn()
    ├── assets/tailwind.css  # Tailwind v4 tokens（@source 显式扫描组件源码）
    └── components/ui/       # shadcn-vue 官方组件（只增不改）
```

## 使用方式

### 1. 源码/ESM 消费（Vite 项目，如 mira_tiptap_format）

```ts
import { SaveLocationDialog } from 'mira-plugin-ui'
import 'mira-plugin-ui/mira-plugin-ui.css'
```

依赖 mira-plugin-ui 为 `file:` 链接时，**修改本库源码后需 `npm run build` 重新生成 dist**（开发时可跑 `npm run build:watch`）。

### 2. CDN / UMD 消费（任意 HTML 页面）

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<link rel="stylesheet" href=".../mira-plugin-ui.css">
<script src=".../mira-plugin-ui.umd.js"></script>
<script>
  const { createApp } = Vue
  const app = createApp({ /* ... */ })
  app.use(MiraPluginUI.default)   // 全局注册所有组件
  // 或解构使用：const { SaveLocationDialog } = MiraPluginUI
  app.mount('#app')
</script>
```

只有 `vue` 是 external，reka-ui 等已全部打进 bundle；CSS 含组件样式与 oklch tokens（跟随宿主 `.dark` 类切换暗色）。

## 新增组件

```bash
npx shadcn-vue@latest add <component> --overwrite
```

本机 CLI 因代理无法 fetch registry 时，改用等价脚本：

```bash
node demo/fetch-registry.mjs   # 修改文件顶部 names 列表后运行
```

拉取后如新增了目录，在 `src/index.ts` 补一行 `export * from './components/ui/<name>'`，样式由 `tailwind.css` 的 `@source "../components"` 自动覆盖，无需其他改动。

## SaveLocationDialog

选择素材库/文件夹/文件名的保存对话框，组合官方 Dialog + Select + Input + Label + Button。

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `open` | `boolean` | - | 受控显隐（`v-model:open`） |
| `libraries` | `Library[]` | - | 素材库列表（`{ id, name?, title? }`） |
| `folders` | `Folder[]` | - | 文件夹列表（`{ id, title?, name? }`） |
| `initialLibraryId` | `string` | `''` | 初始选中库 |
| `initialFolderId` | `string` | `''` | 初始选中文件夹（空为根目录） |
| `initialFileName` | `string` | `'document.tiptap'` | 初始文件名（自动补 `.tiptap` 后缀） |

事件：`@save` 返回 `{ libraryId, folderId?, fileName }`（`SaveLocation`）。

## 构建

```bash
npm run build   # 产出 dist/mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css
```
