# @hunmer/vue-selection-box

> Vue 3 框选(Rubber-band / Marquee)组件。容器内任何带 `[data-selectable-id]` 的元素都是可选项,零侵入接入。

## 特性

- 🖱️ **拖拽框选** —— 空白处按下拖出矩形,实时高亮相交项;`Alt` 拖拽切换为减选(红框)
- ⌨️ **点选修饰键** —— 经 `handleItemClick` 支持 `Ctrl` 加选 / `Shift` 范围选 / `Alt` 减选
- 📜 **边缘自动滚动** —— 拖拽悬停滚动容器边缘时自动滚动并同步选区
- ⌫ **快捷键** —— 可选启用 `Ctrl/Cmd+A` 全选、`Backspace` 清空、`Delete` 抛出删除事件;`Escape` 清空
- 🎨 **脱离 Tailwind** —— 样式自带 CSS,颜色经 `--selection-box-color` / `--selection-box-destructive-color` 定制
- 🪶 **零依赖** —— 仅 `vue` 作为 peerDependency

## 安装

```bash
pnpm add @hunmer/vue-selection-box
```

别忘了引入样式:

```ts
import '@hunmer/vue-selection-box/style.css'
```

## 快速开始

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SelectionBox } from '@hunmer/vue-selection-box'
import '@hunmer/vue-selection-box/style.css'

const selectedIds = ref<string[]>([])
const boxRef = ref<InstanceType<typeof SelectionBox>>()

const items = [{ id: '1', title: 'A' }, { id: '2', title: 'B' }]
</script>

<template>
  <SelectionBox
    ref="boxRef"
    v-model="selectedIds"
    class="h-full overflow-y-auto"
    tabindex="0"
    :enable-select-all-shortcut="true"
  >
    <div
      v-for="item in items"
      :key="item.id"
      :data-selectable-id="item.id"
      :class="{ selected: selectedIds.includes(item.id) }"
      @click="boxRef?.handleItemClick(item.id, $event)"
    >
      {{ item.title }}
    </div>
  </SelectionBox>
</template>
```

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `v-model` | `string[]` | `[]` | 已选中的 item id 集合 |
| `multiple` | `boolean` | `true` | 是否允许多选 |
| `disabled` | `boolean` | `false` | 禁用全部选择交互 |
| `realtimeSelection` | `boolean` | `true` | 拖拽过程中实时更新选中项 |
| `doubleClickToClear` | `boolean` | `true` | 双击空白清空选择 |
| `scrollAutoSpeed` | `number` | `10` | 边缘自动滚动速度(px/帧) |
| `scrollThreshold` | `number` | `50` | 触发自动滚动的边缘阈值(px) |
| `minSelectionSize` | `number` | `5` | 生效框选的最小尺寸(px) |
| `enableSelectAllShortcut` | `boolean` | `false` | `Ctrl/Cmd+A` 全选(容器需聚焦,如设 `tabindex`) |
| `enableClearSelectionShortcut` | `boolean` | `false` | `Backspace` 清空 |
| `enableDeleteSelectionShortcut` | `boolean` | `false` | `Delete` 抛出 `delete-selection` |

## Events

| 事件 | 回调 | 说明 |
| --- | --- | --- |
| `selection-start` | `(event)` | 框选开始 |
| `selection-update` | `(ids)` | 框选中选中集变化 |
| `selection-end` | `(ids)` | 框选结束 |
| `item-click` | `(id, event)` | `handleItemClick` 处理后抛出 |
| `clear-selection` | `()` | 选择被清空 |
| `delete-selection` | `(ids)` | Delete 快捷键 |

## 暴露的方法

`selectItem` / `deselectItem` / `toggleItem` / `selectAll` / `clearSelection` / `isSelected` / `getSelectedCount` / `handleItemClick(id, event)`

## 样式定制

```css
.your-scope {
  --selection-box-color: oklch(0.55 0.2 260);        /* 框选颜色 */
  --selection-box-destructive-color: oklch(0.6 0.22 25); /* 减选颜色 */
}
```

## License

[MIT](./LICENSE)
