# 任务计划：mira-client 迁移到 shadcn-vue 默认样式 + 删除 volt + 删除未用 UI 组件

## 目标 (Goal)

在 `packages/mira-client` 中：
1. **保留 reka-ui 作为底层**（这是 shadcn-vue 的正确架构，应用代码不直接 import reka-ui）。
2. **用 shadcn-vue 官方默认样式重新生成 UI 包装组件**，覆盖本地的自定义 tailwind 类，统一基线为 **`new-york`** style（components.json 已是 new-york，保持不变）。
3. **删除自定义 tailwind 样式**：`src/renderer/styles/theme.css`（mira-* 颜色变量）以及 main.css 里的非官方自定义（如 surface-*、radius 多级、`user-select:none` 等需逐项评估）。
4. **彻底删除 `src/components/ui/volt/` 自定义组件库**，把消费方迁移到 `@/components/ui` 的 shadcn-vue 组件；把被复用的类型（`MenuItem`、`FilterRule`）迁出到稳定路径。
5. **删除未被任何业务代码引用的 shadcn UI 组件目录**（`accordion`、`collapsible`、`command`、`drawer`、`navigation-menu`、`pagination`、`scroll-area`）。注意 `calendar` 被 volt/DatePicker 引用，需在 volt 删除后重新评估。

## 范围边界 (Scope)

- ✅ 仅 `packages/mira-client`。**不动** `mira-dashboard-next`。
- ✅ 不改 components.json 的 `style`（已是 new-york）。
- ❌ 不改 reka-ui 版本、不改应用层业务逻辑（除非替换 volt 组件必须的 props 适配）。
- ❌ 不引入新的 iconLibrary（项目继续用 Material Icons `material-icons` class；新 shadcn 组件里 `lucide` import 需改成现有图标方案或保留——见 P5）。

## 关键事实 (Key Facts，详见 findings.md)

- 40 个 UI 组件目录；32 个被业务代码引用，8 个未被引用。
- `calendar` 被 volt/DatePicker.vue 引用 → volt 删除前不能删。
- volt 16 个文件，真正被业务消费的有：`Chip`、`DataTable`、`DatePicker`、`Dropdown`（6 处）、`IconField`/`InputIcon`、`FilterBar`、类型 `MenuItem`、`FilterRule`。
- volt 中 `CheckboxGroup`、`MeterGroup`、`Tree`、`TreeNode`、`FilterTreeNode`、`utils.ts` **零外部消费**，可直接删。
- `@volt/*` 别名在 4 个配置文件里存在但**无人使用**（消费方都用 `@/components/ui/volt/` 长路径）。
- Tailwind v4，iconLibrary 未设置（用 Material Icons）。

## 阶段 (Phases)

### Phase 1 — 准备与基线快照 🟡 pending
- [ ] P1.1 运行 `pnpm --filter mira-client build`（或 dev 起得来）确认当前可编译，记录基线。
- [ ] P1.2 `git checkout -b chore/shadcn-vue-migration` 建分支。
- [ ] P1.3 把 `MenuItem`、`FilterRule` 类型从 volt 迁到 `src/renderer/types/`（如 `menu.ts`、`filter.ts`）。
- [ ] P1.4 更新所有**纯类型**消费方 import：`useFolderOperations.ts`、`MediaGridComponent.vue`、`useContextMenu.ts`、`TabRegistry.ts`、`useFilters.ts`、`useMediaTabData.ts`、`MediaTabListView.vue`。
- [ ] 验收：`pnpm --filter mira-client build` 通过；类型 import 改完。

### Phase 2 — 删除 volt 中零消费的死代码 🟡 pending
- [ ] P2.1 删除 `volt/CheckboxGroup.vue`、`MeterGroup.vue`、`FilterTreeNode.vue`、`utils.ts`、`types.ts`（已迁出）。
- [ ] P2.2 评估 `Tree.vue`/`TreeNode.vue`：当前零业务消费，但实现重（拖拽、选择、懒加载）。**决策点**：直接删 vs 迁到 `components/business/tree/`。→ 默认直接删（业务用 FolderTreeComponent，已不依赖 volt Tree）。
- [ ] P2.3 评估 `FilterTree.vue`：零外部消费 → 删除（FilterBar 用的是 FolderTreeComponent）。
- [ ] 验收：build 通过。

### Phase 3 — 迁移 volt 业务消费组件到 shadcn-vue 🟡 pending（最大工作量）
逐个替换并改业务文件 import：
- [ ] P3.1 `Chip` → `Badge`：改 `IntegrationsList.vue`（removable 用 Badge + 内嵌 close 按钮适配）。
- [ ] P3.2 `DataTable` → `Table` 系列：改 `MultiTabFileUpload.vue`（内联 Table/TableHeader/TableBody；empty 状态用条件渲染）。
- [ ] P3.3 `DatePicker` → `Calendar` + `Popover` + `Input` 组合：改 `SearchComponent.vue`（保留同等交互，可做成 `@/components/ui/date-picker` 局部组件或内联）。
- [ ] P3.4 `IconField`/`InputIcon` → 内联 Tailwind（`relative` + `absolute` 定位）：改 `SidebarNavComponent.vue`。
- [ ] P3.5 `Dropdown`（6 处）→ `Popover`：建一个薄适配或直接用 Popover API。涉及 `HomeHeader.vue`、`HomeToolbar.vue`、`ThemeSwitcherComponent.vue`、`MultiTabFileUploadExample.vue`、`MediaTabListView.vue`、`FilterBar.vue`(内部)。**注意** volt Dropdown 的 `#content` slot 带 `close` 作用域 + 命令式 `open/close/toggle`，Popover 用 `v-model:open`，需适配。
- [ ] P3.6 `FilterBar` → 迁到 `@/components/business/FilterBar/`，内部 Dropdown 换 Popover，保留 FilterRule 类型引用新路径。
- [ ] 验收：每个文件改完跑一次 build；交互人工验证。

### Phase 4 — 删除 volt 目录 + 清理别名 🟡 pending
- [ ] P4.1 删除整个 `src/components/ui/volt/` 目录（含 CLAUDE.md）。
- [ ] P4.2 移除 4 个配置文件里的 `@volt` 别名：`tsconfig.json`、`vite.config.ts`、`vite.search-window.config.ts`、`vite.renderer.config.ts`。
- [ ] P4.3 更新 `src/components/ui/CLAUDE.md`（如果有 volt 引用）和父级 CLAUDE.md。
- [ ] 验收：build 通过；`grep -r volt packages/mira-client/src` 无残留（除了历史 changelog 说明）。

### Phase 5 — 删除未引用的 shadcn UI 组件目录 🟡 pending
在 volt 删除后重新扫描引用（因为 volt/DatePicker 用过 calendar）：
- [ ] P5.1 重跑引用扫描脚本（见 findings.md §5）。
- [ ] P5.2 删除确认未引用的目录（预期：`accordion`、`collapsible`、`command`、`drawer`、`navigation-menu`、`pagination`、`scroll-area`，可能 + `calendar`）。
- [ ] 验收：build 通过。

### Phase 6 — 用 shadcn-vue CLI 重新生成 UI 组件为 new-york 默认样式 🟡 pending
> ⚠️ 此阶段会覆盖本地自定义样式。**每个组件先 `--dry-run` + `--diff` 预览，确认后再覆盖。绝不盲目 `--overwrite`。**
- [ ] P6.1 `npx shadcn-vue@latest info` 确认配置。
- [ ] P6.2 对每个保留的组件：`npx shadcn-vue@latest add <name> --dry-run` → `--diff <file>` 逐文件对比，记录差异到 findings.md。
- [ ] P6.3 逐组件 `--overwrite`（用户已授权"两者都做"=重新生成）。处理 iconLibrary 缺失：生成的组件若 import lucide，替换为 Material Icons 方案或保留（取决于组件）。
- [ ] P6.4 同步业务文件里的 API 变更（如 Button 的 size variant 变化、新增 data-slot 等）。
- [ ] 验收：build + 全量人工视觉回归。

### Phase 7 — 清理自定义 tailwind 样式 🟡 pending
- [ ] P7.1 删除 `src/renderer/styles/theme.css`（mira-* 变量系统），移除 main.css 里 `@import "../styles/theme.css"`。
- [ ] P7.2 main.css 里的 `surface-*`、自定义多级 radius 等非官方变量：逐一评估，回归 new-york 官方 token。
- [ ] P7.3 扫描业务文件里残留的 `mira-*` CSS 变量引用和原始 tailwind 色值（`bg-gray-*`、`text-blue-*`），替换为语义 token（`bg-muted`、`text-foreground` 等）。
- [ ] 验收：视觉回归 + grep 无残留 `mira-` 变量引用。

### Phase 8 — 最终验收与文档 🟡 pending
- [ ] P8.1 完整 build（renderer + main + preload）。
- [ ] P8.2 `pnpm --filter mira-client lint`（若有）。
- [ ] P8.3 更新 `packages/mira-client/CLAUDE.md` 记录架构变更（移除 volt、统一 new-york）。
- [ ] P8.4 更新 progress.md 最终总结。

## 决策点 (Decisions)

| # | 问题 | 默认决策 |
|---|------|---------|
| D1 | Tree/TreeNode（零消费但实现重） | 直接删（业务已用 FolderTreeComponent） |
| D2 | Dropdown 替换目标 | Popover（free-content 契合，非 DropdownMenu 的 item 模式） |
| D3 | iconLibrary 缺失，CLI 生成的 lucide import | 逐组件替换为 Material Icons 或保留 lucide（待 P6 实测） |
| D4 | DatePicker 是否保留为独立组件 | 保留为 `@/components/ui/date-picker`（复用价值高） |
| D5 | theme.css 删除后 `user-select:none` 等 | 保留在 main.css base layer（非 mira-* 体系） |

## 风险 (Risks)

- **R1 Dropdown API 不匹配**：volt 的 `close` slot scope + 命令式方法 → Popover 需适配层。
- **R2 TreeNode DOM 属性**：`data-folder-id` 等被外部拖拽逻辑读取 → 若迁移 Tree 需保留（已决定删，需确认 FolderTreeComponent 不依赖 volt TreeNode）。
- **R3 CLI 覆盖丢本地增强**：某些 ui 组件可能有本地 props 扩展 → P6 用 `--diff` 保护。
- **R4 跨组件内部依赖**：volt/FilterBar 依赖 volt/Dropdown → 必须先迁 Dropdown 再迁 FilterBar。
- **R5 视觉回归**：new-york 默认尺寸/间距与当前可能差异大 → 需人工目检。

## 错误记录 (Errors Encountered)

| Error | Attempt | Resolution |
|-------|---------|------------|
| (空) | | |
