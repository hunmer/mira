# grid-layout-plus — 架构总览

## 来历

上游 `qmhc/grid-layout-plus`（Vue 3 栅格布局库）v2 beta 分支的完整拷贝。2026-08-22 commit `19a4805b` 随 mira-client Home 仪表盘功能一并入库；2026-08-23 `246bada9` 调整 package.json 适配 monorepo（pnpm 10.17.1、删上游 overrides）。

## 为什么 vendored

mira-client 的 Home 仪表盘（`HomeTabView` + `dashboardLayout` store + `CardRegistry`）需要栅格拖拽布局，workspace 内引入 v2 beta 源码以便直接消费与最小修补，避免等待上游发版。

## 双入口

- `.`：Vue 组件入口（`GridLayout`、`GridItem`、composables），main `lib/index.cjs`、module `es/index.mjs`、types `dist/index.d.ts`
- `./core`：纯布局算法（layout-engine、compactors、position-strategies、transaction-buffer、validation），无 Vue/DOM 依赖，可独立测试

## 消费方

仅 `packages/mira-client`（`"grid-layout-plus": "workspace:*"`）。使用点：
- `src/renderer/components/tabs/HomeTabView.vue`（GridLayout/GridItem/absoluteStrategy/noCompactor）
- `src/renderer/stores/dashboardLayout.ts`（LayoutItem/ReadonlyLayout/ResizeConfig 类型）
- `src/renderer/components/tabs/dashboard/CardRegistry.ts`
- `src/renderer/main.ts`
