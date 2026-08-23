# grid-layout-plus — 目录职责

src 共 40 个 TS 文件：

| 目录/文件 | 职责 |
|---|---|
| `src/components/`（17 文件） | `grid-layout/` 子目录含 13 个 `use-*.ts` 控制器（拖拽、缩放、镜像、键盘等交互逻辑）+ GridItem/GridContainer 组件 |
| `src/core/`（9 文件） | 纯算法核心：layout-engine、compactors（压实策略）、position-strategies（定位策略）、transaction-buffer、validation 等，无 Vue/DOM 依赖 |
| `src/helpers/`（7 文件） | 工具函数 |
| `src/composables/`（3 文件） | Vue 组合式 API 封装 |
| `src/index.ts` / `src/core.ts` | 两个入口的导出聚合 |
| `src/style.scss` | 组件样式 |

tests 共 27 文件：单测 + `e2e/`（3 个，依赖缺失的 dev-server）+ `types/`（3 个）+ `phase-*` 系列（5 个）。
