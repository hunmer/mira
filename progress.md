# Progress

- 已读取目标组件、旧连线 composable、节点组件和数据类型。
- 已确认目标组件存在用户未提交改动，将增量编辑。
- 已将 `useBranchLines.ts` 重写为 DOM 测量 + 完整 SVG 路径状态，旧逐行规则已移除。
- 已在 `FolderTreeComponent.vue` 接入统一 SVG 底线、hover 和选中路径。
- 已从 `FolderTreeNode.vue` 删除旧 div 线段、规则注入和 `.ft-line` 样式。
- 当前：静态检查与修正。
- 第一轮 `git diff --check` 因 `FolderTreeComponent.vue` 混用 CRLF 失败；类型检查需单独重跑。
- 根据用户截图定位：每条分支按 `<g>` 交错绘制，后续兄弟灰线覆盖前面选中路径的共用主干。
- 已改成底线、hover、选中三个全局绘制层，选中层始终位于最上方。
- 用户明确后续自行测试，本轮不再执行自动验证。
