# @hunmer/vue-masonry

通用 Vue 3 瀑布流组件库(`@hunmer/vue-masonry`,v0.1.0)。提供响应式列数、跨列跨行、宽高比、懒加载、入场/layout 动画(motion-v)、排序、两种布局模式(stream / fill)。被 `mira-client` 依赖。

## 约定

- 语言:TypeScript(strict)+ Vue 3.5 `<script setup>`
- peerDeps:`vue ^3.3.0`、`motion-v ^2.0.0`(动画运行时,由消费方提供)
- 产物:ESM + CJS + dTS,`sideEffects: ["**/*.css"]`(需手动 import `@hunmer/vue-masonry/style.css`)
- 高度优先级:`height` > `aspect` > `rowSpan × rowHeight`

## 命令

| 命令 | 作用 |
|------|------|
| `pnpm --filter @hunmer/vue-masonry build` | Vite 构建(含 vite-plugin-dts 类型) |
| `pnpm --filter @hunmer/vue-masonry type-check` | vue-tsc --noEmit |

## 源码结构

```
packages/vue-masonry/src/
├── index.ts        # 导出 Masonry + 类型
├── Masonry.vue     # 主组件
├── LazyCell.vue    # 懒加载包装(IntersectionObserver)
├── types.ts        # MasonryProps / MasonryItemMeta / MasonryColumns / MasonrySortOption
└── utils.ts        # 布局算法(stream / fill)、排序、响应式断点
```

## 关键 Props(摘要)

| Prop | 默认 | 说明 |
|------|------|------|
| `columns` | 3 | 数字或 Tailwind 断点映射(`base/sm/md/lg/xl`) |
| `gap` | 16 | item 间距 px |
| `rowHeight` | 80 | 基准行高 px |
| `layoutMode` | `"stream"` | `stream`(贪心流式)/ `fill`(洞区回填,会打破普通图顺序) |
| `lazyRootMargin` | `"300px"` | 懒加载 rootMargin |
| `enterAnimation` / `exitAnimation` | true | motion-v 动画 |
| `staggerDelay` | 0.05 | 入场 stagger(秒) |
| `layoutTransition` | true | 列数/排序变化时的位置过渡 |
| `sortBy` | -- | 单/多字段排序(`{ by, order }`) |

`getMeta(item)` 返回每个 item 的 `{ colSpan, rowSpan, aspect, height, lazy }`。

## 扫描状态

- **更新时间**: 2026-08-11
- **已扫描**:`package.json`、`src/index.ts`、`src/types.ts`(Props 全量)
- **缺口**:`Masonry.vue`/`LazyCell.vue`/`utils.ts` 内部实现未逐行读;建议下一步补 `claude/module-responsibilities.md` 记录布局算法细节
