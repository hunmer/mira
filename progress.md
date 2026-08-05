# 进度日志 (Progress) — mira-client shadcn-vue 迁移

## 会话: 2026-08-05

### 已完成
- ✅ 调研架构现状：确认 mira-client 已是标准 shadcn-vue 架构（reka-ui 仅在 ui 包装内）。
- ✅ 扫描 40 个 UI 组件目录：32 引用 / 8 未引用。
- ✅ 深度分析 volt 库（16 文件）：区分零消费（6）vs 业务消费（10）。
- ✅ 产出 volt → shadcn 替换映射（见 findings.md §4.3）。
- ✅ 与用户确认范围：仅 mira-client；new-york 基线；彻底删 volt 换 shadcn；重新生成默认组件 + 清自定义样式。
- ✅ 创建 task_plan.md / findings.md / progress.md。

### 关键决策（已与用户确认）
- 范围：**仅 mira-client**（不动 dashboard）。
- 操作：**两者都做**（CLI 重新生成 + 清自定义样式），并删除未引用组件。
- 样式基线：**统一 new-york**（mira-client 已是，保持）。
- volt：**彻底删除换成 shadcn**。

### 测试基线
- 待 P1.1 记录：`pnpm --filter mira-client build` 当前状态。

### 下一步
- 无（全部 8 阶段完成）。可由用户做人工视觉回归 QA。

## Phase 8 完成 (2026-08-05) — 最终验收与文档
- ✅ `pnpm run build:all` 全通过（renderer + main + preload 三段）。
- ✅ 架构验证：0 个应用文件直接 import reka-ui；0 个 mira-* 变量引用；0 个活跃 volt 引用（仅 2 处迁移注释）；ui 目录 34 个。
- ✅ 文档更新：`src/components/ui/CLAUDE.md` 重写（34 组件、new-york-v4 基线、迁移说明）；`renderer/CLAUDE.md` 导航链接；`claude/file-map.md`、`claude/public-interfaces.md` 清除 volt/旧计数。

## 总结
本次在 `mira-client` 完成 shadcn-vue 迁移：
- 删除自定义 volt 组件库（9 文件）、theme.css、surface-*/mira-* 样式系统。
- 重新生成 33 个标准组件为 new-york-v4 官方默认（iconLibrary=lucide）。
- 删除 7 个未引用 UI 目录。
- 迁移 7 个 volt 业务消费组件 + 87 处 mira-* 引用 + 1772 处原始色值到语义 token。
- 新增依赖：@lucide/vue、@internationalized/date、@tanstack/vue-table；删除 vue-draggable-plus。
- 全程 build 门禁通过。保留 green/yellow/amber 等状态色（shadcn 无对应语义 token，社区惯例保留）。

### 待人工 QA
- 各视图视觉回归（new-york-v4 尺寸/间距与旧版可能不同）。
- AccessibilityProvider 的 high-contrast 在 dark 模式下的表现（原 theme.css 遗留行为，本次等价迁移未优化）。
- MultiTabFileUpload 表格重写后的交互（排序/选择/全选）。

## Phase 7 完成 (2026-08-05) — 清理自定义 tailwind 样式
- ✅ **迁移 7 个 mira-* 业务文件**（共 87 处引用）到 shadcn 语义 token / 字面量：
  - Animation（6）、VirtualScroll（6）、LazyImage（6，shimmer 用 muted/background 双色保留效果）
  - ThemeSwitcher（22）、ResponsiveLayout（22，仅 var，class 名前缀保留）
  - App.vue（21）、AccessibilityProvider（18，含删除失效的 setProperty('--mira-transition-*') JS，改为依赖全局 @media reduced-motion）
- ✅ **删除 theme.css** + main.css 里的 `@import`；把全局字体规则并入 main.css 的 body base layer。
- ✅ **删除 main.css 的 surface-* 变量**（重复的 slate 色阶），迁移 4 个消费文件（App.vue、IntegrationsList、MultiTabFileUpload、ShortcutManagerDialog）的 surface-* 工具类到语义 token。
- ✅ **批量迁移原始色值**：70 文件 1772 处（gray/slate/zinc→muted/border/foreground、blue/indigo→primary、red→destructive）。build 通过。
- ⚠️ **保留** green/yellow/amber/emerald/purple（90 处，19 文件）——这些是 success/warning 状态色，shadcn-vue 无对应语义 token，状态图标用 emerald/green 是社区惯例。

### P7 说明
- AccessibilityProvider 的 high-contrast token 重定义（--foreground:#000 / --background:#fff）有 dark 模式下的潜在冲突（dark+high-contrast 会黑字黑底），但这是原 theme.css 就有的行为，本次保持等价迁移，未引入新问题。后续可单独优化。
- shimmer 动画用 muted/background 双色保留扫光效果。

## Phase 6 完成 (2026-08-05) — 重新生成 new-york-v4 默认组件
- ✅ **CLI fetch 被本地代理 (127.0.0.1:7890) 干扰失败**（curl/Node fetch 能走代理，CLI 内部 fetch 不行）。改写一次性脚本 `scripts/fetch-shadcn.mjs` 用 Node 原生 fetch 直接拉 registry，复刻 `add --overwrite` 写文件行为（用完即删）。
- ✅ 重新生成 32 个标准组件 + native-select（calendar 依赖）= 33 个，共 ~186 文件。
- ✅ 修复 fetch 脚本漏掉的 import 重写：9 处 `@/registry/new-york-v4/ui/X` → `@/components/ui/X`。
- ✅ 新增依赖：`@lucide/vue`（new-york-v4 默认 iconLibrary）、`@internationalized/date`（calendar）、`@tanstack/vue-table`（table）。components.json 加 `iconLibrary: "lucide"`。
- ✅ 修复 API 破坏：
  - sonner 不再导出 `Sonner`（改 `Toaster`）→ App.vue import 改。
  - alert-dialog 不再导出 `AlertDialogOverlay`（v4 由 Content 内部渲染）→ 删 App.vue + FolderTreeComponent（4 处）的手动 `<AlertDialogOverlay/>` 及 import。
- ✅ 最终 build 通过（5090 modules transformed）。

### P6 关键决策记录
- iconLibrary：项目原用 Material Icons，但 new-york-v4 设计以 lucide 为中心（内联 SVG 组件），强行转 Material Icons 会破坏组件组合。决策：**采用 lucide 作为新组件的图标库**，与 registry 对齐，便于后续维护。注意：业务代码里既有的 `material-icons` class 用法保持不变，新 shadcn 组件内部用 lucide。
- CLI 不可用问题：是环境代理 + Node 版本（v22.17 < undici 8.7 要求 22.19）综合导致，非 registry 缺失。

## Phase 4 完成 (2026-08-05)
- ✅ 删除整个 `src/components/ui/volt/` 目录（9 文件 + CLAUDE.md）。
- ✅ 移除 4 个配置文件的 `@volt` 别名（tsconfig.json、vite.config.ts、vite.search-window.config.ts、vite.renderer.config.ts）。
- ✅ 删除孤儿依赖 `vue-draggable-plus`（package.json）。
- ✅ build 通过。

## Phase 5 完成 (2026-08-05)
- ✅ 重新扫描引用：8 个未用目录确认。
- ✅ `calendar` 被 date-picker 引用 → **保留**。
- ✅ 删除 7 个未引用目录：accordion、collapsible、command、drawer、navigation-menu、pagination、scroll-area。
- ✅ ui 目录 40 → 33。build 通过。

## Phase 2 完成 (2026-08-05)
- ✅ 删除 7 个零消费 volt 文件：CheckboxGroup、MeterGroup、Tree、TreeNode、FilterTree、FilterTreeNode、utils、types。
- ✅ 确认 vue-draggable-plus 现已无引用（孤儿依赖，可后续清理）。
- ✅ build 通过（3668 modules）。

## Phase 3 完成 (2026-08-05) — volt 业务消费组件全部迁移
- ✅ **Chip → Badge**：IntegrationsList.vue（简单 label 场景，Badge variant=secondary）。
- ✅ **DataTable → Table**：MultiTabFileUpload.vue。发现原用法是 **坏的 PrimeVue API**（v-model:selection/:paginator/<Column> option-label），volt DataTable 忽略这些 prop。重写为标准 shadcn Table 标记 + 表头排序切换 + 行选择/全选（新增 toggleSort/toggleSelectFile/toggleSelectAll）。
- ✅ **DatePicker → calendar+popover+input**：保留为 `@/components/ui/date-picker`（已是干净 shadcn 组合，仅迁移位置）。SearchComponent.vue 引用更新。
- ✅ **IconField/InputIcon → 内联 Tailwind**：SidebarNavComponent.vue（relative + absolute 定位）。顺手修了 `>>` 拼写错误。
- ✅ **Dropdown（6 处）→ 2 种方案**：
  - 创建 Popover 兼容封装 `@/renderer/components/common/Dropdown`（保留 volt API：placement/offset/minWidth/closeOnContentClick/#trigger/#content(close)/open/close/toggle）。
  - 3 个 free-content 消费方（HomeHeader、HomeToolbar、MediaTabListView）改 import 即可（模板不变）。
  - 2 个坏掉的 PrimeVue `:options` 用法（ThemeSwitcherComponent、MultiTabFileUploadExample）→ **Select**。
- ✅ **FilterBar → `@/components/business/FilterBar/`**：内部 Dropdown 指向新封装，FilterRule 改从 `@/renderer/types/filter` import（保留 re-export 兼容）。MediaTabListView 引用更新。
- ✅ build 通过（3659 modules）。

### 注意事项（留给 P7）
- FilterBar、ThemeSwitcherComponent、MultiTabFileUpload 等仍含原始色值类（bg-blue-50/text-gray-500/--mira-*），P7 统一清理。
- MultiTabFileUpload.vue 的 `pageSize`/`handleSortChange` 现已未使用（paginator 移除），renderer build 不报错但 type-check 会有 warning。

## Phase 1 完成 (2026-08-05)
- ✅ 建分支 `chore/shadcn-vue-migration`。
- ✅ 基线：renderer build OK（`✓ built in 10.09s`，288 modules）。type-check 有 209 个**预存在**错误（与迁移无关，不作门禁）。
- ✅ 迁移类型：`MenuItem` → `@/renderer/types/menu.ts`，`FilterRule` → `@/renderer/types/filter.ts`，在 `types/index.ts` re-export。
- ✅ 更新 7 处类型 import（3 MenuItem + 4 FilterRule）。
- ✅ build 通过。

### 备注
- 注意 grep 在 git bash 对 `@/` 模式有 bug，用 `components/ui` 做模式。
- iconLibrary 未设置，P6 CLI 生成的 lucide import 需处理。
- Node v22.17.0 < undici 要求 22.19（warning，不影响 CLI 运行）。
