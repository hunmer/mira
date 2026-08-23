# grid-layout-plus — 入口与构建

## package.json 入口

- `main`: `lib/index.cjs`；`module`: `es/index.mjs`；`types`: `dist/index.d.ts`
- `exports`: `.`（Vue 组件）与 `./core`（纯算法），均含 types/import/require 条件

## 构建

- `scripts/build.ts`：构建产物 `lib/`（CJS）、`es/`（ESM）、`dist/`（类型）
- 在 monorepo 中由 `mira-client` 以 `workspace:*` 直接消费；正常开发流程**无需**单独构建本包

## 运行时初始化

无副作用入口；在 client 侧由 `renderer/main.ts` 引入样式、`HomeTabView.vue` 注册使用。
