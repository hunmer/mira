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

## 样式 / 构建

- 新增 class 的源文件必须被 `src/assets/tailwind.css` 的 `@source "../"` 覆盖，否则 dist CSS 缺类（曾出现文件列表 grid 列定义失效塌成单列）。
- `cssCodeSplit: false` + 超大 `assetsInlineLimit`：material-icons 字体内联进 CSS，保证 dist 自包含。
- token 取值与 mira-client / mira_tiptap_format 一致（shadcn oklch），暗色跟随宿主 `.dark` 类。
- `src/library/` 子入口不引入 tailwind.css：宿主必须自带 tailwind 环境与 shadcn token（mira-browser-extension 已满足）。

## 编码风格

- TypeScript strict + Vue 3.5 `<script setup>`，缩进 2 空格（components/ui 保持官方原样）。
- library 组件**不直接访问数据源**：数据加载/CRUD 走 `LibraryTreeServices`，弹窗走 `LibraryTreeDialog`，上传走 `LibraryTreeUpload`，全部由宿主注入（见 data-model.md）。
- 文案国际化：`LibraryTreeT` 函数注入（vue-i18n 风格 key + `{n}` 插值），宿主缺 key 时回退内置中文（`src/library/i18n.ts`，key 与扩展 locales 对齐）。
- 图标：Material Icons（树节点 icon 字段）+ @lucide/vue（UI 图标）。

## 禁止事项

- 不改 dist 产物（重新 build 生成）。
- 不给官方 ui 组件加业务逻辑；业务封装放 `src/` 顶层或 `src/library/`。
- 不在组件内写 `<style scoped>`（除非 ui_rule.md 第 5 条例外）。
