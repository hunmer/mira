# Findings

- `@he-tree/vue` 将可见节点扁平渲染为 `.tree-node`，tree 模式用 `padding-left = indent * (level - 1)`。
- 旧实现由 `useBranchLines.ts` 计算逐行规则，`FolderTreeNode.vue` 用多个绝对定位 div 绘制线段。
- 节点 DOM 已有 `data-folder-tree-node-id`，可由父容器统一测量可见行。
- 新方案：父容器覆盖单个 SVG；每个非根节点一条完整圆角路径，hover/选中通过祖先关系集合点亮。
- icon 模式由节点图标 margin 表达层级，需要在测量时加入 `(level - 1) * 20px`。

## 回收站素材详情只读

- 用户定义的范围：前端表单禁用，后端必须防止绕过更新。
- 初始范围假设：文件名、website、评分、备注、标签、所属文件夹。
- 该任务会修改服务端固定 API 的行为，需重跑 SDK 覆盖审计流水线。
- `FileInfo` 尚无 `recycled` 字段，`MiraSDKService.listFiles/getFile` 也未映射服务端的 `recycled`，详情组件目前无法可靠判定只读。
- 详情组件的可写入口：文件名、website、备注、评分、标签添加/删除、文件夹设置/移除。
- 服务端对应入口分布在 `FileRoutes` (`/rename`, `/update`)、`FolderRouter` 文件夹关联、`TagRouter` 文件标签关联。
- `FileRoutes /rename` 和 `/update` 已在写入前调用 `getFile`，可直接检查 `file.recycled`。
- `FolderRouter /file/set` 已读取 `oldFile`，但未拦截回收站状态；`TagRouter /file/set` 需新增一次 `getFile`检查。
- 建议服务端统一返回 HTTP `409` + `Cannot update a recycled file`，表示 Item 当前状态不允许更新。
- 前端除控件 `disabled` 外，所有编辑 handler 也需要只读短路，防止已打开 Popover/程序调用绕过。
- SDK `FileData` 类型在 `shared/sdk/types.ts` 和 `FileModule.ts` 各有一份，两处都需补 `recycled?: number`。
- API method/path 未变，SDK 无新方法缺口；覆盖审计预期仅重生成并确认无变化。
- 详情顶部的布局排序属于应用设置，不是 Item 表单更新，不应被回收站只读限制。
- 工作区存在多处用户未提交改动，包括与本任务重叠的 `FileModule.ts` / `sdk/types.ts` / `MiraSDKService.ts` / `MediaDetailComponent.vue` / `FileRoutes.ts`；必须仅保留增量补丁。
- 静态搜索确认四个服务端写入路由均已加 409 拦截，前端 8 个 handler 均已加只读短路。
- SDK 审计最终结果：covered 126 / missing 13 / excluded 13 / dynamic 7；决策为 P3 12 / P2 1，无 P0/P1，本任务无新增缺口。
- 审计流水线重写了 `.audit` 下 6 个生成物；结果包含当前工作区既有 SDK/API 改动，不应回退。
- 最终核对发现 `FolderRouter` 首版拦截位于 `resolveFolderId` 之后；应提前到解析前，保证被拒绝请求无前置副作用。

## 回收/恢复文件名一致性

- `deleteFile(moveToRecycleBin)` 使用 `getUniquePath(.trash/item.name)` 处理物理同名，但 SQL 只更新 `recycled/path`。
- `recoverFile` 也使用 `getUniquePath(destination/item.name)`，SQL 同样未更新 `name`。
- `getUniquePath` 的命名格式为 `basename (n).ext`，Item 新名称应使用 `path.basename(dest)`。
- 软删除失败已有回滚，但新增 `name` 后必须将原 `name` 一并回滚。
- 恢复失败目前没有 DB 回滚，需补上以避免 `name/path/recycled` 与物理文件不一致。
- 现有 `FileOperations.recycle.test.ts` 已使用真实临时 SQLite + 文件系统，是覆盖该问题的正确回归测试接缝。
- 需补充三个断言：软删除冲突后 `name/path.basename` 一致；恢复冲突后一致；恢复 rename 失败后回滚三个字段。
- 正确修复点是在 DB 预更新中同时写入 `path.basename(dest)`，并在磁盘操作失败时使用修改前 `item` 恢复全部字段。
- 该问题已有合适的 SQLite + 真实临时文件系统测试接缝，无需额外架构调整。
