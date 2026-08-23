# grid-layout-plus — 依赖与配置

## 运行依赖（仅 3 个）

- `@vexip-ui/hooks`
- `@vexip-ui/utils`
- `interactjs`

peerDependencies: `vue >= 3.5.13`。其余（vitest、typescript 等）为 devDependencies。

## 与上游的配置差异

- `packageManager`: 改为 `pnpm@10.17.1`（上游 9.14.2）
- 删除了上游的 pnpm `overrides` / `peerDependencyRules`（约 18 行）
- name/version 保持上游：`grid-layout-plus@2.0.0-beta.0`
