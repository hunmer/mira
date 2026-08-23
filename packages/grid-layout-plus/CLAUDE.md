# grid-layout-plus

上游 [qmhc/grid-layout-plus](https://github.com/qmhc/grid-layout-plus) **v2 beta 分支的 vendored fork**（v2.0.0-beta.0），Vue 3 栅格布局库（拖拽/缩放/响应式）。2026-08-22 由 commit `19a4805b` 一次性整体入库（+45,755 行），**仅供 `mira-client` 消费**（`workspace:*`），用于 Home 仪表盘卡片布局。非 Mira 自研代码。

双入口：`.`（Vue 组件 `GridLayout`/`GridItem`）与 `./core`（纯布局算法，无 Vue/DOM 依赖）。

## 约定的规则

- **vendored 代码，原则上不修改**：修 bug 优先考虑最小 patch 并注明上游差异；不要按 Mira 风格重构
- 同目录 `AGENTS.md` 是上游文档：其中引用的 `docs/`、`dev-server/`、`.changeset/`、eslint/stylelint/prettier 配置、husky、`scripts/benchmark.ts` 等**未随 vendoring 带入本仓库**，对应 npm scripts（lint/docs/changeset/benchmark 等）在本仓库失效，详见 [claude/conventions.md](claude/conventions.md)
- 仅 3 个运行依赖：`@vexip-ui/hooks`、`@vexip-ui/utils`、`interactjs`；peer 要求 `vue >= 3.5.13`
- `packageManager` 已改为 `pnpm@10.17.1` 并删除上游 overrides/peerDependencyRules（适配宿主 monorepo）
- 本包在 workspace 中：改源码后由 `mira-client` 构建直接消费，无需独立发布

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | vendoring 来历、双入口、与 client 的关系 | 首次了解 |
| [claude/conventions.md](claude/conventions.md) | 可用/失效的命令清单、修改原则 | 改代码前 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | src 目录职责（components/core/helpers） | 定位文件 |
| [claude/entrypoints.md](claude/entrypoints.md) | exports、构建脚本、消费方式 | 构建/对接 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | client 侧用法与核心类型 | 使用组件 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖与配置 | 排查依赖 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | 27 个测试文件、运行前提 | 质量评估 |
| [claude/file-map.md](claude/file-map.md) | 目录结构清单 | 找文件 |
| [claude/faq.md](claude/faq.md) | 上游设施缺失等坑 | 遇到坑 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 扫描状态

- **版本**: 2.0.0-beta.0（与上游 v2 beta 同步，未本地改动版本号）
- **更新时间**: 2026-08-23（首建文档）
- **已扫描**: package.json、目录结构清点（src 40 文件 / tests 27 文件）、消费方 grep（mira-client 的 HomeTabView/dashboardLayout/CardRegistry）、git 入库历史
- **跳过**: 全部实现体（上游代码）；`lib/`、`es/`、`dist/` 构建产物
- **下一步建议**: 若 client 仪表盘布局出 bug，深扫 `src/components/grid-layout/` 13 个 `use-*.ts` 控制器与 `src/core/` 布局引擎
