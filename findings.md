# 调研发现 (Findings) — mira-client shadcn-vue 迁移

> ⚠️ 本文件存放调研数据。**不写入** task_plan.md（task_plan.md 会被 hook 反复注入，外部内容只进 findings.md）。

## 1. 架构现状（关键）

- **mira-client 已是标准 shadcn-vue 架构**：`reka-ui` 仅在 `src/components/ui/*/` 包装组件内部 import（共 0 个应用文件直接 import reka-ui）。应用代码统一走 `@/components/ui`。
- 因此「迁移 reka-ui → shadcn-vue」字面已成立。真正要做的是：清自定义样式 + 重新生成官方默认组件 + 删 volt + 删未用组件。

## 2. 包配置对比

| 项 | mira-client | mira-dashboard-next |
|----|-------------|---------------------|
| components.json style | `new-york` | `reka-mira` |
| tailwindCssFile | `src/renderer/assets/main.css` | `src/assets/index.css` |
| baseColor | neutral | zinc |
| iconLibrary | **未设置**（用 Material Icons） | remixicon |
| tailwind 版本 | v4 (4.0.17) | v4 |
| reka-ui | ^2.9.7 | ^2.9.7 |
| 本次范围 | ✅ | ❌ |

## 3. UI 组件引用情况（mira-client）

- **总目录数**：40
- **被业务代码引用**：32
  `alert, alert-dialog, avatar, badge, button, card, checkbox, context-menu, dialog, dropdown-menu, empty, hover-card, input, label, popover, progress, radio-group, resizable, select, separator, sheet, slider, sonner, stepper, switch, table, tabs, textarea, toggle, toggle-group, tooltip, volt`
- **未被引用（候选删除）**：8
  `accordion, calendar, collapsible, command, drawer, navigation-menu, pagination, scroll-area`
  - ⚠️ `calendar` 被 `volt/DatePicker.vue` 引用 → volt 删除前不能删。
- **特殊**：`volt` 是独立手写库（非 shadcn），单独处理（见 §4）。

业务文件消费 ui 组件：约 50 个文件（`src/renderer/App.vue`、`components/business/*`、`components/common/*`、`views/HomeView/*` 等）。

## 4. volt 自定义组件库（删除目标）

位置：`src/components/ui/volt/`，别名 `@volt/*`（4 个配置文件，但**无人使用别名**，都用长路径 `@/components/ui/volt/`）。

### 4.1 文件清单与消费情况

| 文件 | 被业务消费? | 消费方 |
|------|------------|--------|
| Chip.vue | ✅ | IntegrationsList.vue |
| DataTable.vue | ✅ | MultiTabFileUpload.vue |
| DatePicker.vue | ✅ | SearchComponent.vue |
| Dropdown.vue | ✅ | HomeHeader, HomeToolbar, ThemeSwitcherComponent, MultiTabFileUploadExample, MediaTabListView, FilterBar(内部) |
| IconField.vue | ✅ | SidebarNavComponent.vue |
| InputIcon.vue | ✅ | SidebarNavComponent.vue |
| FilterBar.vue | ✅ | MediaTabListView.vue |
| types.ts (MenuItem) | ✅ 类型 | useFolderOperations.ts, MediaGridComponent.vue, useContextMenu.ts |
| types.ts?/FilterBar (FilterRule) | ✅ 类型 | TabRegistry.ts, useFilters.ts, useMediaTabData.ts, MediaTabListView.vue |
| CheckboxGroup.vue | ❌ 零消费 | — |
| MeterGroup.vue | ❌ 零消费 | — |
| Tree.vue | ❌ 零消费 | — |
| TreeNode.vue | ❌ 零消费 | — |
| FilterTree.vue | ❌ 零消费 | — |
| FilterTreeNode.vue | ❌ 零消费 | — |
| utils.ts (ptViewMerge) | ❌ 零消费 | — |
| CLAUDE.md | 文档 | — |
| DatePicker.vue.d.ts | 类型声明 | — |

### 4.2 volt 组件 API 速查（迁移用）

**Chip.vue** — props: `label?, removable?, class?`; emit `remove`; slots: default, removeicon。
**DataTable.vue** — props: `value?, dataKey?, stripedRows?, hoverable?, scrollable?, scrollHeight?, selectionMode?, tableStyle?, class?`; slots: default, empty。仅用 shadcn Table 包装。
**DatePicker.vue** — props: `modelValue?, showIcon?, size?, class?`; emit `update:modelValue`。组合 Input + Popover + Calendar。
**Dropdown.vue**（手写定位，无 floating-ui）— props: `offset?, placement?, minWidth?, closeOnContentClick?, disabled?`; emit `open,close,toggle`; slots: `trigger`(isOpen), `content`(close); expose `open()/close()/toggle()/isOpen`。
**IconField.vue** — 无 props，`<div class="relative"><slot/></div>`。
**InputIcon.vue** — props: `position?(left/right), size?`; slot default。
**FilterBar.vue**（491 行）— props: `filters, isAllSelected, folderTreeItems?, tagTreeItems?, sort?, order?`; emit `select-all, filter-change, filter-clear, sort-change`。内部组合 volt Dropdown + shadcn Checkbox/Button/Input/RadioGroup/Label + FolderTreeComponent。
**Tree.vue**（11KB）— 重逻辑：拖拽、选择模式、懒加载、过滤、内联创建。依赖 `vue-draggable-plus`。零消费。
**TreeNode.vue** — 递归，DOM 上有 `data-folder-id/data-node-type/data-parent-id`（被外部拖拽读取）。零消费。
**types.ts MenuItem** — `label?, icon?, shortcut?, badge?, command?, url?, target?, separator?, disabled?, visible?, items?, style?, class?`。
**FilterBar FilterRule** — `id, type('folders'|'tags'|'urls'|'title'|'size'|'category'), label, icon, active?, selectedValues?, value?, selectedPreset?, customMin?, customMax?, selectedCategory?`。

### 4.3 volt → shadcn 替换映射

| volt | shadcn-vue | 备注 |
|------|-----------|------|
| Chip | `badge` (Badge) | removable 用 Badge + close 按钮 |
| DataTable | `table` 系列 | 内联；empty 状态条件渲染 |
| DatePicker | `calendar` + `popover` + `input` | 保留为 `@/components/ui/date-picker` |
| Dropdown | `popover` | **非 DropdownMenu**（需 free-content + close scope） |
| IconField/InputIcon | 内联 Tailwind | `relative` + `absolute` 定位 |
| FilterBar | 迁 `components/business/` | 内部 Dropdown→Popover |
| CheckboxGroup/MeterGroup/Tree/TreeNode/FilterTreeNode/FilterTree/utils | 直接删 | 零消费 |

## 5. 引用扫描脚本

```bash
# 重跑此命令确认未引用组件（volt 删除后重跑）
cd /d/mira_typescript/packages/mira-client
python -c "
import re,glob,os
exports={}
for idx in glob.glob('src/components/ui/*/index.ts'):
    name=os.path.basename(os.path.dirname(idx))
    t=open(idx,encoding='utf-8').read()
    exp=set(re.findall(r'export\s*\{[^}]*?\b([A-Z][A-Za-z0-9]+)\b', t))
    exports[name]=exp
appfiles=[f.replace(chr(92),'/') for f in glob.glob('src/**/*.vue',recursive=True)+glob.glob('src/**/*.ts',recursive=True) if '/components/ui/' not in f.replace(chr(92),'/')]
used=set()
for f in appfiles:
    t=open(f,encoding='utf-8').read()
    for name,exp in exports.items():
        for e in exp:
            if re.search(r'(<'+re.escape(e)+r'[ />])|(\b'+re.escape(e)+r'\b)', t):
                used.add(name); break
print('USED:',sorted(used))
print('UNUSED:',sorted(set(exports)-used))
"
```

注意：grep 在 git bash 下对 `@/` 开头模式匹配有异常，用 `components/ui`（不带 `@/`）做模式才可靠。

## 6. 配置文件待清理（@volt 别名）

- `tsconfig.json:23` — `"@volt/*": ["./src/components/ui/volt/*"]`
- `vite.config.ts:113` — `'@volt': fileURLToPath(...)`
- `vite.search-window.config.ts:15`
- `vite.renderer.config.ts:19`

## 7. main.css 自定义项（待清理）

- `@import "../styles/theme.css"` → theme.css 是 mira-* 颜色变量系统，删除。
- `@theme inline` 里的 `--color-surface-0..950`（原始 slate 色阶）→ 非官方，删除或评估。
- 多级 radius（sm/md/lg/xl/2xl/3xl/4xl）→ new-york 官方只到 2xl，评估。
- `@layer base` 里 `body { user-select: none }` → 非 mira-* 体系，保留（Electron 交互需要）。

## 8. CLI 注意事项

- 包管理器：项目用 pnpm（workspace），但 CLI 文档示例用 npx。实际用 `npx shadcn-vue@latest`（已实测可跑，会自动装 shadcn-vue@2.8.1）。
- iconLibrary 未设置 → 生成的组件可能默认 lucide。P6 需逐组件处理图标 import。
- Node v22.17.0（CLI 依赖 undici@8.7 要 >=22.19，有 warning 但能跑）。

## 9. 迁移顺序建议（最低风险）

1. 迁类型（MenuItem/FilterRule）→ 改纯类型消费方
2. 删零消费 volt 文件
3. 迁简单包装（Chip/DataTable/DatePicker/IconField）
4. 迁 Dropdown（6 处）→ Popover
5. 迁 FilterBar（依赖 Dropdown）
6. 删 volt 目录 + 清别名
7. 删未用 ui 目录
8. CLI 重新生成 new-york 默认组件
9. 清 theme.css + main.css 自定义
