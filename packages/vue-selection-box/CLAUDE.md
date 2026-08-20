# @hunmer/vue-selection-box

Vue 3 框选（Rubber-band / Marquee）组件库（`@hunmer/vue-selection-box`，v0.1.0，public，ISC）。容器内任何带 `[data-selectable-id]` 的元素都是可选项，零侵入接入。支持拖拽矩形框选（`Alt` 减选红框）、`Ctrl` 加选 / `Shift` 范围选（经 `handleItemClick`）、边缘自动滚动、`Ctrl/Cmd+A` 全选 / `Backspace` 清空 / `Delete` 删除 / `Escape` 清空等可选快捷键。样式脱离 Tailwind，颜色经 `--selection-box-color` / `--selection-box-destructive-color` 定制。

被 `mira-client`（workspace:*，FileUploadDialog/MediaGrid/Waterfall/MediaList/GroupedCardBrowser/LocalFolderTab 6 处 + main.ts 引 style.css）与 `mira-plugin-ui`（workspace:*，BatchUploadForm、library/MediaBrowser）依赖。

## 约定

- 语言：TypeScript + Vue 3 `<script setup>`；仅 `vue ^3.3.0` 为 peerDependency，零其他依赖
- 产物：ESM（`vue-selection-box.js`）+ CJS（`vue-selection-box.cjs`）+ d.ts + 独立 `style.css`；`sideEffects: ["**/*.css"]`，消费方需手动 `import '@hunmer/vue-selection-box/style.css'`
- 无 dev/test 脚本；无自动化测试

## 命令

| 命令 | 作用 |
|------|------|
| `pnpm --filter @hunmer/vue-selection-box build` | Vite 库构建（vite-plugin-dts 产类型） |
| `pnpm --filter @hunmer/vue-selection-box type-check` | vue-tsc --noEmit |

## 源码结构（src 共 3 文件）

```
packages/vue-selection-box/src/
├── index.ts           # 导出 SelectionBox + SelectionBoxProps/SelectionBoxEmits/SelectableRect
├── SelectionBox.vue   # 主组件（709 行）：框选/点选/自动滚动/快捷键全实现
└── types.ts           # Props/Emits 公共类型
```

## 关键接口（摘要，详见 README）

- Props：`v-model: string[]`（已选 id 集合）、`multiple=true`、`realtimeSelection=true`、`doubleClickToClear=true`、`scrollAutoSpeed=10`、`scrollThreshold=50`、`minSelectionSize=5`、`enableSelectAllShortcut/ClearSelectionShortcut/DeleteSelectionShortcut=false`（全选需容器聚焦，如 `tabindex="0"`）
- 事件：`selection-start/update/end`、`item-click`、`clear-selection`、`delete-selection`
- 暴露方法：`selectItem` / `deselectItem` / `toggleItem` / `selectAll` / `clearSelection` / `isSelected` / `getSelectedCount` / `handleItemClick(id, event)`

## 扫描状态

- **更新时间**: 2026-08-20
- **已扫描**: `package.json`、`vite.config.ts`、`README.md`、`src/index.ts`、`src/types.ts` 全量；`src/SelectionBox.vue` 仅核对协议注释与 defineExpose（709 行实现体未逐行读）
- **缺口**: SelectionBox.vue 内部实现（矩形求交、自动滚动细节）；下一步如需深入再补 `claude/` 详情目录
