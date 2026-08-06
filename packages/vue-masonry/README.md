# @hunmer/vue-masonry

> Vue 3 瀑布流(Masonry / Waterfall)布局组件。零配置可用,支持响应式列数、跨列跨行、宽高比、懒加载、入场 / 退场 / layout 位置动画与多字段排序。

## 特性

- 📐 **响应式列数** —— 传数字或 `{ base, sm, md, lg, xl }` 断点映射(Tailwind 断点),随容器宽度自适应
- 🧩 **跨列 / 跨行** —— item 通过 `getMeta` 指定 `colSpan` / `rowSpan`
- 📏 **高度策略** —— 优先级 `height > aspect("16:9" 等) > rowSpan × rowHeight`
- 👀 **懒加载** —— `lazy` item 进入视窗(rootMargin 可配)才渲染内容,带稳定占位色
- ✨ **动画** —— 基于 [motion-v](https://motion.dev/docs/vue),首屏 stagger 入场、退场动画、排序/列数变化时的 layout 位置过渡
- 🔀 **排序** —— `sortBy` 单字段或多字段排序
- 🧠 **双布局模式** —— `stream`(贪心流式)/ `fill`(智能回填跨列留下的空隙)
- 🪶 **零额外依赖** —— 仅 `vue` 与 `motion-v` 作为 peerDependencies

## 安装

```bash
pnpm add @hunmer/vue-masonry motion-v
# 或
npm install @hunmer/vue-masonry motion-v
```

> `vue@^3.3` 与 `motion-v@^2` 是 peerDependencies,需由你的项目提供。

别忘了引入样式:

```ts
import "@hunmer/vue-masonry/style.css"
```

## 快速开始

```vue
<script setup lang="ts">
import { Masonry } from "@hunmer/vue-masonry"
import "@hunmer/vue-masonry/style.css"

interface Photo { id: number; url: string; title: string }

const photos: Photo[] = [
  { id: 1, url: "/a.jpg", title: "A" },
  { id: 2, url: "/b.jpg", title: "B" },
  // ...
]
</script>

<template>
  <Masonry
    :data="photos"
    :columns="{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }"
    :gap="16"
    :get-key="(p) => p.id"
    :get-meta="(p) => ({ aspect: '1:1', lazy: true })"
  >
    <template #default="{ item }">
      <img :src="item.url" :alt="item.title" />
    </template>
  </Masonry>
</template>
```

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `data` | `T[]` | — | **必填**,数据数组 |
| `getKey` | `(item, index) => string \| number` | `item.id ?? index` | 稳定 key,排序/动画依赖 |
| `getMeta` | `(item, index) => MasonryItemMeta \| undefined` | — | 提取单个 item 的布局元信息 |
| `columns` | `number \| { base?, sm?, md?, lg?, xl? }` | `3` | 列数(数字或断点映射) |
| `gap` | `number` | `16` | item 间距(px) |
| `rowHeight` | `number` | `80` | 基准行高(px) |
| `sortBy` | `MasonrySortOption<T> \| MasonrySortOption<T>[]` | — | 排序规则 |
| `layoutMode` | `"stream" \| "fill"` | `"stream"` | 布局模式 |
| `enterAnimation` | `boolean \| { from?, duration? }` | `true` | 入场动画 |
| `exitAnimation` | `boolean \| { duration? }` | `true` | 退场动画 |
| `staggerDelay` | `number` | `0.05` | 首屏每个 item 入场延迟(秒) |
| `layoutTransition` | `boolean` | `true` | 列数/排序变化时是否平滑过渡位置 |
| `lazyRootMargin` | `string` | `"300px"` | 懒加载触发的 rootMargin |
| `class` / `style` | — | — | 透传到容器元素 |

### `MasonryItemMeta`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `colSpan` | `number` | 占用列数,默认 1 |
| `rowSpan` | `number` | 占用行数(基准行高 rowHeight),默认 1;被 aspect/height 覆盖 |
| `aspect` | `string` | 宽高比,如 `"16:9"` / `"9:16"` / `"1:1"` |
| `height` | `number` | 显式高度(px),优先级最高 |
| `lazy` | `boolean` | 进入视窗才渲染内容 |

### `MasonrySortOption<T>`

```ts
interface MasonrySortOption<T> {
  by: (item: T) => string | number | undefined
  order?: "asc" | "desc" // 默认 asc
}
```

## Slots

| Slot | 作用域 | 说明 |
| --- | --- | --- |
| `default` | `{ item: T, index: number, preload: boolean }` | 渲染每个 item;`preload` 标记是否处于预加载阶段(配合懒加载) |

## Events

| 事件 | 回调 | 说明 |
| --- | --- | --- |
| `after-render` | `() => void` | 布局计算完成(可用于滚动恢复等) |

## 暴露的方法

| 方法 | 说明 |
| --- | --- |
| `refresh()` | 手动重新测量容器宽度并重算布局 |

```vue
<script setup lang="ts">
import { ref } from "vue"
import { Masonry } from "@hunmer/vue-masonry"

const masonryRef = ref<InstanceType<typeof Masonry>>()
// 数据批量替换后强制刷新
masonryRef.value?.refresh()
</script>

<template>
  <Masonry ref="masonryRef" :data="photos" />
</template>
```

## 布局模式说明

- **`stream`(默认)**:纯贪心流式,每个 item 放到当前最矮的起始列。保持原始顺序,实现简单。
- **`fill`**:智能填充。宽图(`colSpan > 1`)先按序流式定位并记录跨过的洞区,普通图(`colSpan = 1`)再用 best-fit 优先回填这些洞区,减少坐标空洞。代价是普通图之间的相对顺序会被打破。

## 高度优先级

```
height (显式)  >  aspect (宽高比)  >  rowSpan × rowHeight
```

## License

[MIT](./LICENSE)
