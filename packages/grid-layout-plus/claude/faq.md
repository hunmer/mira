# grid-layout-plus — FAQ

**Q: 为什么 `pnpm dev` / `build:docs` / lint 跑不了？**
A: 这些脚本依赖上游的 `dev-server/`、`docs/`、eslint 配置等，均未随 vendoring 带入本仓库。本包只保留 build/test 相关能力，见 conventions.md 的失效清单。

**Q: 改了这个包，client 会立即生效吗？**
A: 会。client 以 `workspace:*` 引用，client 重新构建（或 vite dev）即可消费；一般无需单独 build 本包。

**Q: 布局拖拽/缩放行为异常从哪查起？**
A: client 侧先看 `HomeTabView.vue` 与 `dashboardLayout.ts` 的使用方式（absoluteStrategy + noCompactor）；确认是库问题后，再深入 `src/components/grid-layout/` 的 `use-*.ts` 控制器与 `src/core/` 引擎。
