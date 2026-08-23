# grid-layout-plus — 约定与命令

## 修改原则

- vendored 上游代码：改动最小化，逐处注明与上游的差异，方便未来同步上游
- 不按 Mira 代码风格重构本包；不动 `lib/`、`es/`、`dist/` 产物

## 本仓库内可用的命令

- `pnpm --filter grid-layout-plus build`（scripts/build.ts）——正常情况无需执行，client 构建直接走 workspace 源码/产物
- `pnpm --filter grid-layout-plus test`（vitest）——注意部分 e2e 依赖上游 `dev-server/`，未随 vendoring 带入，可能失败

## 上游存在但本仓库失效的设施（不要尝试运行）

同目录 `AGENTS.md` 引用的以下内容**不在本仓库**，对应 npm scripts 全部失效：

- `docs/`（VitePress 双语文档）→ `dev`、`build:docs`、`check:docs` 不可用
- `dev-server/` → `dev` 及依赖它的 e2e 测试不可用
- `.changeset/` → `release`、`version-packages`、`changeset` 不可用
- `eslint.config.ts` / `stylelint.config.ts` / `prettier.config.ts` → lint 系列不可用
- `.husky` / lint-staged → precommit/prepare 失效
- `scripts/benchmark.ts`、`scripts/check-release-tests.ts` → benchmark/test:release-markers 失效
- `RELEASING.md`、Netlify 部署说明 → 仅上游有效
- package.json `files` 字段还列有不存在的 `CHANGELOG.md`、`types.d.ts`（无害）
