# 自定义左侧栏功能实现计划

## 决策摘要（已与用户确认）
- 右侧详情面板的「历史」tab **移除**，仅保留「详情」tab（保留 `Tabs` 壳结构供未来扩展）。
- 历史功能完全归并到左侧栏模块。

## 改动范围

### 1. 安装依赖 `vue-draggable-plus`
- `packages/mira-client/package.json` dependencies 加入 `"vue-draggable-plus": "^0.6.0"`（Vue 3 兼容，基于 SortableJS）。
- 运行 `pnpm install` 更新 lockfile。

### 2. 新增布局配置 store
**新文件** `packages/mira-client/src/renderer/stores/homeSidebarLayout.ts`

仿照 `dashboardLayout.ts` 用 ConfigStorage 持久化，但更简单（只需保存 id 有序列表）：
```ts
// 默认顺序
const DEFAULT_IDS = ['shortcuts', 'folders', 'tags', 'history']
const ALL_MODULE_IDS = ['shortcuts', 'folders', 'tags', 'history'] as const

// state: enabledIds: string[] (有序), 持久化到 'mira-home-sidebar-layout'
// getters: moduleOrder = computed(() => enabledIds), disabledIds = ALL - enabled
// actions: setEnabled(next: string[]), load(), persist()
// 兼容性：load 时过滤掉未知 id、补齐新增 id（新模块默认追加入启用区末尾）
```

### 3. 新增模块定义文件
**新文件** `packages/mira-client/src/renderer/views/HomeView/sidebarModules.ts`

集中定义四个模块的元数据（id、标题、图标、描述），供 HomeSidebar 渲染和 LayoutDialog 列表共用：
```ts
export interface SidebarModuleDef {
  id: 'shortcuts' | 'folders' | 'tags' | 'history'
  title: string       // 快捷分类 / 文件夹树 / 标签树 / 最新添加·历史查看
  icon: string        // material icon name
  description: string
}
export const SIDEBAR_MODULES: SidebarModuleDef[] = [...]
export function getModuleDef(id: string): SidebarModuleDef | undefined
```

### 4. 新增自定义布局对话框
**新文件** `packages/mira-client/src/renderer/views/HomeView/SidebarLayoutDialog.vue`

- 用项目既有 `Dialog` UI（`@/components/ui/dialog`），`v-model:open`。
- 两个 `VueDraggable` 区（来自 `vue-draggable-plus`）：「已启用」「未启用」，`group: "sidebar-modules"` 实现跨区拖拽；同区内排序也是 SortableJS 自带能力。
- 列表项展示模块图标 + 标题 + 描述，加 `cursor-grab` 把手图标 `drag_indicator`。
- 状态直接绑定 store 的 `enabledIds` / 本地 `disabledIds`（computed 双向），onChange 调 `setEnabled` 并持久化；关闭按钮即「完成」。不额外加保存按钮，所见即所得。
- 标题栏说明文字：「拖拽调整左侧栏模块顺序，拖到右侧可隐藏」。

### 5. 重构 `HomeSidebar.vue`
- 顶部横向图标按钮列表追加一个「自定义布局」图标按钮（`view_quilt` 或 `dashboard_customize` 图标），点击打开 SidebarLayoutDialog（内部 ref `layoutDialogOpen`，自包含，无需 emit 到父级）。
- 将原先固定的两个 `FolderTreeComponent`（folder tree + tag tree）区域，重构为**按 `moduleOrder` 顺序渲染**的可折叠/可隐藏模块容器，每个模块用 `<SidebarSection>`（section header 可折叠，复用现有的标题栏样式）包裹：
  - `shortcuts`（快捷分类）：取当前 folder tree 组件的 baseCategories（all/uncategorized/untagged/trash）独立成一个模块。需要把 `FolderTreeComponent` 的 `:show-base-categories` 关闭，改为独立渲染这些快捷项（复用 baseCategoriesConfig 默认配置）。
  - `folders`（文件夹树）：现 folder tree 主体（`showBaseCategories=false`）。
  - `tags`（标签树）：现 tag tree。
  - `history`（最新添加/历史查看）：移植自 HistoryPanel.vue 的两段式分段控件 + 列表，emit `open` 事件给父级路由跳转（与原 HistoryPanel 一致）。
- 模块容器：仅当 id ∈ enabledIds 时渲染；每个 section 有可折叠状态（本地 ref Map），默认展开。
- `defineExpose({ locateItem })` 行为保持不变：locate folder/tag 时，若对应模块被折叠则先展开、若被禁用则回退到 querySelector（现有逻辑已兼容）。

### 6. 移植并删除 `HistoryPanel.vue`
- 将 HistoryPanel.vue 的逻辑（mode 切换、fetchRecentAdded、displayRows、formatRelative/formatSize）整体迁入 HomeSidebar 内的 history 模块（或抽成 `SidebarHistoryModule.vue` 子组件以保持 HomeSidebar 可读性 —— **推荐抽成子组件**，放在 `views/HomeView/SidebarHistoryModule.vue`）。
- 删除 `HistoryPanel.vue` 文件。
- 删除 index.vue 中 `import HistoryPanel` 及其 `<HistoryPanel>` 使用。

### 7. 更新 `HomeView/index.vue`
- 删除 `import HistoryPanel from './HistoryPanel.vue'`（line 21）。
- 删除右侧 aside 内的 `<TabsContent value="history">...</TabsContent>`（line 487-489）。
- 删除 TabsList 中的「历史」TabsTrigger（line 500-506），只保留「详情」。
- 保留 `<Tabs>` 壳和 `detailPanelTab` ref（避免大改）。
- HomeSidebar 新增 `@history-open="openFilePreview"` 事件监听（history 模块的文件点击 → 复用现有 `openFilePreview` 路由跳转）。
- `detailLibraryId` 已存在，作为 prop 传给 HomeSidebar（history 模块需要 libraryId）。

## 数据流
```
SidebarLayoutDialog ──写──► homeSidebarLayout store (enabledIds)
                                  │
HomeSidebar.vue ───读 moduleOrder──┘ ──► 渲染对应模块
                                          │
                  history 模块点击 ──emit('history-open')──► index.vue.openFilePreview
```

## 关键风险与处理
1. **HistoryPanel 双重身份**：原文件被右侧 tab 和（未来）左侧栏共用。方案选择「右侧删 tab、左侧新建 SidebarHistoryModule 子组件」而非复用，避免删了文件后右侧 tab 崩溃 —— 右侧 tab 已先一步被移除，无残留引用。
2. **locateItem 兼容**：模块化后 folder/tag tree 的 ref 仍存在，`locateNode` 逻辑不变；禁用模块时 querySelector fallback 仍可用（只是滚动不到，符合预期）。
3. **快捷分类拆分**：从 FolderTreeComponent 抽出 baseCategories 时，保持点击行为 `emit('folderSelect', {id, label, ...})` 与原 `handleBaseCategoryClick` 输出结构一致。
4. **持久化 key 命名**：用 `mira-home-sidebar-layout`，避免与 dashboard 的 `mira-dashboard-layout` 冲突。

## 验证步骤（实现后）
- `pnpm --filter mira-web type-check` 通过。
- 手动：打开对话框，拖拽跨区，关闭后左侧栏即时反映；刷新页面后顺序保持。
- 点击快捷分类/文件夹/标签行为与原来一致。
- history 模块切换模式、点击文件能跳转预览。
- 右侧详情面板只剩「详情」tab，无报错。

## 不做的事
- 不改 FolderTreeComponent 内部实现（仅改调用方式：showBaseCategories 关闭、baseCategories 独立渲染）。
- 不动 dashboard 相关代码（仅作模式参考）。
- 不引入新的状态管理库；沿用 ConfigStorage + pinia 风格。