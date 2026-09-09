# Progress

## 素材库路径迁移

- 已确认原路径更新不会移动文件。
- 已增加后台迁移任务、进度查询路由及 SDK 覆盖。
- 已在编辑弹窗接入按字节进度条、忙碌态和完成后双列表刷新。
- 已完成 SDK 覆盖流水线，两个新增接口均为 covered。
- 定向测试与类型检查通过；后端已通过 procm 重启并通过 8081 健康检查。
- 当前：任务完成，等待用户手动验收实际素材库迁移。

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

## 回收站素材详情只读

- 已读取 `planning-with-files` 与 `mira-sdk-coverage-audit` 技能说明。
- 已恢复既有计划文件，确认用户偏好为不自动验证/重启。
- 当前：盘点前后端更新入口。
- 已确认客户端类型/SDK 映射缺少 `recycled`，需先补齐该状态再禁用表单。
- 已完成编辑入口盘点，开始设计统一只读判定与后端 409 响应。
- 已确定回收站判定依赖 `FileInfo.recycled`，后端统一使用 409 拒绝。
- 当前：实现前后端限制。
- 已给 `FileInfo` 与 SDK `FileData` 补充 `recycled`，并在 list/get 映射中保留该状态。
- 已在 `MediaDetailComponent.vue` 禁用回收站 Item 的文件名、website、备注、评分、标签和文件夹编辑，并为 handler 添加只读短路。
- 已在 Server 的文件重命名、元数据更新、文件夹关联、标签关联路由添加回收站 Item 409 限制。
- 当前：静态核对并执行 SDK 覆盖审计。
- `git diff --check` 已通过；已识别并保留相关文件中的既有未提交改动。
- SDK 审计 `gen-manifests` 已生成：Server 159 路由，SDK 132 调用。
- `classify` 结果：covered 126 / missing 13 / excluded 13 / dynamic 7；本任务未新增 method/path。
- `scan-usage` 与 `decide` 已完成；无 P0/P1，不需要新增 SDK 方法。
- `.audit` 六个生成物已按当前工作区状态刷新；目标文件 `diff --check` 通过。
- 最终数据流核对中：正在将 Folder 路由拦截前移到文件夹解析之前。
- Folder 路由拦截已前移；四个写入路由均在写入前拒绝回收站 Item。
- 最终 `git diff --check` 通过；按用户偏好未运行测试、构建或重启服务。
- 当前：任务完成，等待用户手动验收。

## 回收/恢复文件名一致性

- 已确认问题根因：冲突时只更新物理目标 `path`，未同步 Item `name`。
- 已确认用户既有偏好：本轮添加测试但不自动执行。
- 当前：补充回归测试。
- 已确定在现有 SQLite 回收站测试文件中增加 3 个真实文件系统场景。
- 已补充软删除同名、恢复同名、恢复失败回滚 3 个回归测试；按用户偏好未执行。
- 当前：修改 `FileOperations` 数据库更新与回滚。
- 已修改软删除：用回收站实际目标文件名同步 Item `name`，移动失败时同时回滚 `name/path/recycled`。
- 已修改恢复：用实际恢复目标文件名同步 Item `name`，移动失败时回滚并返回 `false`。
- 当前：静态核对。
- 静态核对通过：SQL 参数顺序、成功后名称、失败回滚与布尔返回值一致。
- `git diff --check` 通过；未运行测试/构建/重启。
- 当前：任务完成，等待用户手动验收。
