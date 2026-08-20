# mira-plugin-ui 测试与质量

## 测试现状

**未发现任何自动化测试**（package.json 无 test/lint/type-check 脚本，包内无 *.test.* / *.spec.* 文件）。质量保障方式：

1. **demo 手动验证**：`pnpm dev` 打开 demo 页（`demo/App.vue`），经 `/mira-api` 代理连真实 server + mira-app-core SDK，实测 BatchUploadDialog / SaveLocationDialog / LibraryTreeView / MediaBrowser / ServerManagerDialog 等组件与暗色切换。
2. **消费方门禁兜底**：主要消费方 `mira-browser-extension` 有 vitest（其 `src/ui/composables/libraryTreeSearch.test.ts` 覆盖了与 library 同源的树搜索逻辑）与自己的 type-check；`file:` 链接消费方（mira_tiptap_format/web）构建时会编译到本包源码/产物。

## 已知质量风险

- 改源码后必须 `pnpm build` 才对 `file:` 消费方生效（忘记重建是常见坑，README 明确提示；开发期用 `build:watch`）。
- 新增顶层组件若脱离 `@source "../"` 扫描范围，dist CSS 会静默缺类（曾出现 grid 列定义失效）。
- 手写包装官方组件会触发 reka-ui 受控模式误判（历史事故，见 FAQ）。

## 建议（未实施）

- 可补 `type-check`（vue-tsc --noEmit）脚本作为最小门禁。
