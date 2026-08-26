# 测试与质量(全仓聚合)

## 测试现状

| 包 | 测试方案 | 命令 |
|----|----------|------|
| mira-app-core | vitest(27+ 个测试文件 + test-helpers + contract 测试) | 见包内 `package.json` |
| mira-app-server | Jest(`sdk/` 目录)+ node --test(`src/sync/`) + `DuplicateScanner.test.ts` 等单测 | `pnpm run test`、`pnpm run test:paths` |
| mira-client | `procm-ui-tests/`(31 个文件的真实页面 UI 用例,经 procm-mcp 驱动,仅开发构建暴露 `window.__procmUiTests`)+ 主进程 `DownloadService.test.ts` + node --test 纯函数测试(`test:split-tabs`:mediaTabRuntime/splitPaneRestore) | `pnpm run test:ui:remote <name>`、`pnpm run test:split-tabs`、`pnpm run type-check` |
| mira-browser-extension | Vitest(19 个测试文件,约 137 用例) | `pnpm run test` |
| mira_mobile | Flutter test(9 文件:providers/services/utils;screens 零覆盖) | `flutter test` |
| mira-dashboard-next | 无 | -- |
| mira-scripts-core | 无 | -- |
| mira-doc / landing-page / 组件库 | 无(landing-page 有 lint/format) | -- |

> 测试能力相比 2026-08-11 显著改善:core 从无到 vitest、client 从无到 UI 用例 + 单测、extension 42→137 用例、mobile 4→9 文件。dashboard/scripts 仍无测试。

## SDK 覆盖审计

- `.audit/server-api-manifest.json` + `.audit/sdk-coverage-report.md`:固定 JSON API 138 条,covered 125 / missing 13 / excluded 13 / dynamic 7(2026-08-24 重生成)

## 类型检查

- 客户端:`vue-tsc --noEmit`(`pnpm run type-check`)
- 其它包:`tsc`(经 build 流程隐式执行)

## Lint

- mira-client:ESLint 9 **flat config**(`eslint.config.mjs`,2026-08-24 从 `.eslintrc.js` 迁移),`pnpm run lint`(=`eslint .`)/ `lint:fix`
- 全仓无统一 lint 根脚本

## 依赖分析工具(仅客户端)

- `dependency-cruiser`:`pnpm run analyze:deps`(输出 `docs/dependencies.html`)
- `vite-bundle-analyzer`:`pnpm run analyze:bundle`
- `typedoc`:`pnpm run docs`(生成 API 文档)

## 质量风险

- mira-doc 的 config head 仍指向 `/mira-doc/icon.ico` 而 public 实为 `icon.webp`
- 服务端原生依赖(sqlite3 / sharp / ffmpeg)跨平台安装易出错(一键安装脚本 `scripts/install-mira-{macos,windows}` 缓解)
- mira-client 曾有 33 个预存 TS6133(未使用变量)类型错误(08-20 时点;ESLint 9 flat config 迁移后是否仍在待复测)

## 2026-08-20 已清理的技术债

- client `vite.renderer.config.ts`:删除指向已删 `assets/scss/*` 的 additionalData 注入(改动前后 type-check 错误数一致,均为 33 个预存错误)
- dashboard:删除无引用依赖 `react-selectable-fast` 并更新 lockfile(vue-tsc --noEmit 通过)
