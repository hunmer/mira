# mira-plugin-ui 测试与质量

## 测试现状

**未发现任何自动化测试**（package.json scripts 仅 dev/build/build:watch，包内无 *.test.* / *.spec.* 文件，2026-11-21 复核）。质量保障方式：

1. **demo 手动验证**：`pnpm dev` 打开 demo 页（`demo/App.vue`），经 `/mira-api` 代理连真实 server + mira-app-core SDK，实测 BatchUploadDialog / SaveLocationDialog / LibraryTreeView（排序五模式、tree/tiles 视图、拖放上传 direct/dialog/fileDrop）/ MediaBrowser（含 date 筛选）/ ServerManagerDialog / zh-en locale 切换与暗色。
2. **消费方门禁兜底**：主要消费方 `mira-browser-extension` 有 vitest（含 `src/ui/components/upload/BatchUploadForm.test.ts`、`default-drop-upload.test.ts` 等消费本包源码的用例）与自己的 type-check；`file:` 链接消费方（mira_tiptap_format/web）构建时会编译到本包源码/产物。

## 已知质量风险

- 改源码后必须 `pnpm build` 才对 `file:`/CDN 消费方生效（忘记重建是常见坑，README 明确提示；开发期用 `build:watch`；pair.html 还需重跑 copy-plugin-ui.mjs）。
- 新增顶层组件若脱离 `@source "../"` 扫描范围，dist CSS 会静默缺类（曾出现 grid 列定义失效）。
- 手写包装官方组件会触发 reka-ui 受控模式误判（历史事故，见 FAQ）。
- 提交信息全标 "fix"（2026-08-25 后 21 个提交无一语义化），变更意图只能靠 diff 考古——文档是唯一线索。

## 建议（未实施）

- 可补 `type-check`（vue-tsc --noEmit）脚本作为最小门禁。
- FilterBar.vue 1140 行已是包内最大文件，再加筛选器建议按筛选器类型拆子组件。
