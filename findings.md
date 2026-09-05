# Findings

- `@he-tree/vue` 将可见节点扁平渲染为 `.tree-node`，tree 模式用 `padding-left = indent * (level - 1)`。
- 旧实现由 `useBranchLines.ts` 计算逐行规则，`FolderTreeNode.vue` 用多个绝对定位 div 绘制线段。
- 节点 DOM 已有 `data-folder-tree-node-id`，可由父容器统一测量可见行。
- 新方案：父容器覆盖单个 SVG；每个非根节点一条完整圆角路径，hover/选中通过祖先关系集合点亮。
- icon 模式由节点图标 margin 表达层级，需要在测量时加入 `(level - 1) * 20px`。
