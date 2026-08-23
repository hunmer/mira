# grid-layout-plus — 接口与 client 侧用法

## 对外导出（client 实际使用的部分）

- 组件：`GridLayout`、`GridItem`（`grid-layout-plus`）
- 类型：`LayoutItem`、`ReadonlyLayout`、`ResizeConfig`
- 策略：`absoluteStrategy`、`noCompactor`（client 仪表盘采用绝对定位、不压实）
- 纯算法：`./core` 入口（client 未直接使用）

## client 侧使用点

- `mira-client/src/renderer/components/tabs/HomeTabView.vue`：GridLayout/GridItem 布局仪表盘卡片
- `mira-client/src/renderer/stores/dashboardLayout.ts`：持久化 LayoutItem
- `mira-client/src/renderer/components/tabs/dashboard/CardRegistry.ts`：卡片注册与尺寸默认值
- `mira-client/src/renderer/main.ts`

完整组件 Props/Events 参考上游文档（本仓库未带 docs/，可查上游 repo）。
