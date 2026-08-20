# 测试与质量(全仓聚合)

## 测试现状

| 包 | 测试方案 | 命令 |
|----|----------|------|
| mira-app-core | vitest(27 个测试文件 + test-helpers) | 见包内 `package.json` |
| mira-app-server | Jest(`sdk/` 目录) | `pnpm run test`(= `jest --config sdk/jest.config.js`) |
| mira-client | `procm-ui-tests/`(约 30 个真实页面 UI 用例,经 procm-mcp ws://127.0.0.1:7331 驱动,仅开发构建暴露 `window.__procmUiTests`)+ 主进程 `DownloadService.test.ts` | `pnpm run test:ui:remote <name>`、`pnpm run type-check` |
| mira-browser-extension | Vitest(19 个测试文件,约 137 用例) | `pnpm run test` |
| mira_mobile | Flutter test(9 文件:providers/services/utils;screens 零覆盖) | `flutter test` |
| mira-dashboard-next | 无 | -- |
| mira-scripts-core | 无 | -- |
| mira-doc / landing-page / 组件库 | 无(landing-page 有 lint/format) | -- |

> 测试能力相比 2026-08-11 显著改善:core 从无到 vitest、client 从无到 UI 用例 + 单测、extension 42→137 用例、mobile 4→9 文件。dashboard/scripts 仍无测试。

## SDK 覆盖审计

- `.audit/server-api-manifest.json` + `.audit/sdk-coverage-report.md`:固定 JSON API 128 条,covered 117 / missing 11 / excluded 13 / dynamic 7(2026-08-19)

## 类型检查

- 客户端:`vue-tsc --noEmit`(`pnpm run type-check`)
- 其它包:`tsc`(经 build 流程隐式执行)

## Lint

- mira-client:ESLint 9,`pnpm run lint`(`eslint . --ext .vue,.js,.ts... --fix`)
- 全仓无统一 lint 根脚本

## 依赖分析工具(仅客户端)

- `dependency-cruiser`:`pnpm run analyze:deps`(输出 `docs/dependencies.html`)
- `vite-bundle-analyzer`:`pnpm run analyze:bundle`
- `typedoc`:`pnpm run docs`(生成 API 文档)

## 质量风险

- client 的 `vite.renderer.config.ts` 残留指向已删 `assets/scss/*` 的 additionalData 注入(SCSS 体系已整体移除)
- dashboard 的 `react-selectable-fast`(React 包)仍在 dependencies 且无消费点,疑似遗留
- mira-doc 的 config head 仍指向 `/mira-doc/icon.ico` 而 public 实为 `icon.webp`
- 服务端原生依赖(sqlite3 / sharp / ffmpeg)跨平台安装易出错,有 `dependency-switch-config-{macos,windows}.json` 缓解
- `dependency-switch-config-*.json` 中仍残留 `n8n-nodes-mira-ws-trigger` 悬空 `file:` 引用(不影响 pnpm install)
