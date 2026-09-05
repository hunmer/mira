# FolderTree 连线迁移

## 目标
用 `LibraryTree.vue` 当前的 SVG 路径连线替换桌面端 FolderTree 的旧行内 div 线段。

## 阶段
- [x] 确认现有实现与 @he-tree DOM 模型
- [x] 实现容器级 SVG 路径和 hover/选中状态
- [x] 删除 FolderTreeNode 旧线段与样式
- [x] 验证交由用户手动完成（用户明确要求不再自动测试）

## 约束
- 保留现有未提交改动和节点交互。
- 不使用真实浏览器测试。
- 用户将自行测试，后续不自动执行类型检查、构建或启动客户端。

## Errors Encountered
- 并行检索包含不存在的根级 `node_modules/@he-tree/vue`，命令返回 1；已改查包内依赖路径。
- `git diff --check` 发现目标文件既有改动混用 CRLF，新增行被判定 trailing whitespace；改用项目格式化工具统一本次涉及文件。
