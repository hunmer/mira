# Progress Log

## Session: 2026-05-13

### Phase 1: 清理死 CSS
- **Status:** complete
- 删除 `components.css` (60 个未使用 mira-* 类)
- 删除 `responsive.css` (40 个未使用 mira-* 类)
- 删除 `volt.css` (已空)
- 更新 `main.css` 移除已删文件 import
- 移除 `main.ts` 中 `volt.css` import

### Phase 2: 更新 C/D 类自定义组件内部导入
- **Status:** complete
- TreeNode: Volt Checkbox → shadcn Checkbox (checked/update:checked)
- Paginator: Volt SecondaryButton → shadcn Button variant="secondary"
- CheckboxGroup: Volt Checkbox → shadcn Checkbox (自定义数组 v-model)
- FilterTree/FilterTreeNode: Volt Checkbox → shadcn Checkbox
- FilterBar: Volt Checkbox/RadioButton → shadcn Checkbox + 原生 radio

### Phase 3: 业务文件全量替换 Volt → shadcn-vue (44 文件)
- **Status:** complete
- Button/SecondaryButton: 14 文件 → shadcn Button (severity→variant 映射)
- Dialog/ConfirmDialog/Drawer: 15 文件 → shadcn Dialog/AlertDialog/Sheet
- Checkbox/InputText/InputNumber/Textarea/Toggleswitch/RadioButton/SelectButton/ToggleButton: 16 文件 → shadcn 等价组件
- Card/Avatar/Badge/Tag/Message/Divider/ProgressBar/Select/DataTable/Menu/Tabs/Toolbar/Toast: 13 文件 → shadcn 等价组件
- 手动修复: FileUploadDialog (slot 冲突), PluginsDialog (缺少闭合 div), App.vue (AlertDialogRoot→AlertDialog)

### Phase 4: 删除 A+B 类 Volt 包装组件
- **Status:** complete
- 删除 31 个 A+B 类包装文件
- 删除 9 个未使用的 C 类文件 (DataView, Splitter, Stepper, Step*, Paginator)
- 保留 17 个 C/D 类自定义组件 (Tree, FilterBar, Dropdown, ContextMenu, DataTable, DatePicker, Chip, MeterGroup, IconField, InputIcon, CheckboxGroup, Menu)

### Phase 5: 构建验证
- **Status:** complete
- Vite 构建通过: renderer (10.57s) + main (167ms) + preload (14ms)
- 零错误零警告
