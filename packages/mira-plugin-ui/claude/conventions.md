# mira-plugin-ui 约定

## 命令

| 命令 | 作用 |
|------|------|
| `pnpm --filter mira-plugin-ui dev` | Vite demo 开发页（连真实 server，代理 `/mira-api`） |
| `pnpm --filter mira-plugin-ui build` | 库构建：ESM + UMD + 单 CSS |
| `pnpm --filter mira-plugin-ui build:watch` | watch 重建（`file:` 链接消费方开发用） |

包内无 test / lint / type-check 脚本。

## 组件规则（高优先级）

- **`src/components/ui/` 是 shadcn-vue 官方源码，禁止手写或魔改**。曾因手写包装用 `v-bind="props"` 透传 `undefined` 键，触发 reka-ui 受控模式误判，导致 Select 无法展开、Dialog 不可点击。业务组件只组合官方组件，不重新实现。
- 新增基础组件：`npx shadcn-vue@latest add <name> --overwrite`；本机 CLI 拉不到 registry 时改用 `node demo/fetch-registry.mjs`（改文件顶部 names 列表）。拉取后在 `src/index.ts` 补 `export * from './components/ui/<name>'`。
- 样式规则见仓库根 **`ui_rule.md`**：只用 shadcn-vue / tailwind 原子类；颜色/间距/圆角/阴影全走 shadcn token（`--background/--primary/--muted/--border/--radius`…），禁止引入 `--fg/--bg-elev` 类旧自定义变量；交互态用 `hover:` / `focus-visible:` / `data-[state=...]`；唯一例外是无法用 tailwind 表达的过渡/关键帧（且不得含颜色 token）。

## i18n 规则（2026-11 起）

- **新组件文案一律走 `src/i18n.ts` 包级单例**（`useI18n()` 解构 `t`，或组件内 `const { t } = useI18n()`），**禁止硬编码中文/英文字符串**。
- 两层机制：library 系列组件保留 `t` prop（宿主 vue-i18n 接管，缺 key 回退内置词典，`src/library/i18n.ts` 的 `createLibraryTreeT` 做兜底转发）；顶层业务组件文案缺省走内置词典，`title`/`submitText`/`cancelText` 等文案 props 覆盖。
- 字典是扁平 key + `{x}` 插值（key 命名沿用扩展 locales：`library.*` / `tree.*` / `common.*` / `upload.*` / `batch.*` / `media.*` …），zh/en 必须同时补。
- 语言切换只经 `setLocale(locale)`；初始探测顺序 `window.mira.app.locale` → `navigator.language` → zh，不要在组件里自行探测。

## 样式 / 构建

- 新增 class 的源文件必须被 `src/assets/tailwind.css` 的 `@source "../"` 覆盖，否则 dist CSS 缺类（曾出现文件列表 grid 列定义失效塌成单列）。
- `cssCodeSplit: false` + 超大 `assetsInlineLimit`：material-icons 字体内联进 CSS，保证 dist 自包含。
- token 取值与 mira-client / mira_tiptap_format 一致（shadcn oklch），暗色跟随宿主 `.dark` 类。
- `src/library/` 子入口不引入 tailwind.css：宿主必须自带 tailwind 环境与 shadcn token（mira-browser-extension 已满足）。

## 树体系约定

- library 组件**不直接访问数据源**：数据加载/CRUD 走 `LibraryTreeServices`，弹窗走 `LibraryTreeDialog`，上传走 `LibraryTreeUpload`，全部由宿主注入（见 data-model.md）。
- **拖放上传互斥语义**：宿主传 `fileDrop` 回调 → 自定义处理；未传（或显式 `useDefaultDropUpload=true`）→ 内置 `defaultDropUpload`（`defaultDropUploadMode`: `direct` 直传 / `dialog` 开 `upload.pick` 预填，无 pick 回退 direct）。注意 Vue 对 Boolean prop 未传缺省是 `false` 而非 `undefined`，判断"是否传过"必须用 `=== true` 显式比较。
- **仅 `sort='custom'` 可拖拽排序**（`updateSortIndex` 提供且排序模式为 custom）；其他排序（id/title/created_at/last_used）下 sort_index 不参与展示。
- 上传目标 `tags` 传**标签 ID**（旧版按标题名，现已兼容两种值，新调用方一律传 ID）。

## 编码风格

- TypeScript strict + Vue 3.5 `<script setup>`，缩进 2 空格（components/ui 保持官方原样）。
- 图标：Material Icons（树节点 icon 字段）+ @lucide/vue（UI 图标，FilterBar 按 `filter.type` 内置映射）。

## 禁止事项

- 不改 dist 产物（重新 build 生成）。
- 不给官方 ui 组件加业务逻辑；业务封装放 `src/` 顶层或 `src/library/`。
- 不在组件内写 `<style scoped>`（除非 ui_rule.md 第 5 条例外）。
- 不引入 vue-i18n 作本包依赖（i18n 是手写单例）。
