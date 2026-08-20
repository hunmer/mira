<script setup lang="ts" generic="T">
/**
 * MediaWaterfall —— 通用瀑布流容器（MediaBrowser 的瀑布流能力抽离，可独立复用）。
 *
 * 在 @hunmer/vue-masonry 之上补足两块宿主常用能力：
 *  1. columnWidth 模式：按"目标列宽 px"自动换算列数（容器宽 / 列宽取整，至少 1 列），
 *     适配列宽可调的场景（如 Pinterest 搜索结果 160~720px 滑杆缩放）；
 *     不传 columnWidth 时行为与 Masonry 一致（columns 数字/断点）。
 *  2. reach-bottom 事件：底部哨兵 + IntersectionObserver，无限滚动加载由宿主触发。
 *
 * 卡片内容经 #default="{ item }" 作用域插槽完全自定义；布局只依赖 getAspect 提供的
 * 宽高比(缺省 1:1)。样式约定与 library 子入口一致：宿主自带 tailwind 环境与 shadcn token。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Masonry } from '@hunmer/vue-masonry';
import type { MasonryColumns } from '@hunmer/vue-masonry';
import '@hunmer/vue-masonry/style.css';

const props = withDefaults(defineProps<{
  /** 数据数组 */
  items: T[];
  /** 稳定 key 提取（Masonry 排序/动画依赖） */
  getKey: (item: T, index: number) => string | number;
  /** 宽高比("W:H")，缺省 1:1；卡片高度据此占位 */
  getAspect?: (item: T) => string | undefined;
  /** 列数(数字或 Tailwind 断点映射)；与 columnWidth 二选一，columnWidth 优先 */
  columns?: MasonryColumns;
  /** 目标列宽 px：按容器宽度自动换算列数 */
  columnWidth?: number;
  /** item 间距 px，默认 16 */
  gap?: number;
  /** 布局模式：stream=纯流式保序(默认) / fill=智能回填空隙 */
  waterfallMode?: 'stream' | 'fill';
  /** item 进入视窗才渲染内容(懒加载占位)，默认 false */
  lazy?: boolean;
  /** 懒加载触发 rootMargin，默认 "300px" */
  lazyRootMargin?: string;
  /** 启用 Masonry 入场/出场/layout 动画(大列表追加场景建议关闭)，默认 false */
  animated?: boolean;
}>(), {
  columns: undefined,
  columnWidth: undefined,
  gap: 16,
  waterfallMode: 'stream',
  lazy: false,
  lazyRootMargin: '300px',
  animated: false,
});

const emit = defineEmits<{
  /** 底部哨兵进入可视区(无限滚动加载；宿主自行去重与游标管理) */
  reachBottom: [];
}>();

const root = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
const rootWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;
let sentinelObserver: IntersectionObserver | null = null;

onMounted(() => {
  const el = root.value;
  if (el) {
    rootWidth.value = el.clientWidth;
    resizeObserver = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) rootWidth.value = w;
    });
    resizeObserver.observe(el);
  }
  if (sentinel.value) {
    sentinelObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) emit('reachBottom');
      },
      { rootMargin: '600px 0px' },
    );
    sentinelObserver.observe(sentinel.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  sentinelObserver?.disconnect();
  sentinelObserver = null;
});

/** columnWidth 模式：按容器宽换算列数；否则透传 columns(缺省 3，与 Masonry 一致) */
const resolvedColumns = computed<MasonryColumns>(() => {
  if (props.columnWidth && props.columnWidth > 0) {
    return Math.max(1, Math.floor((rootWidth.value + props.gap) / (props.columnWidth + props.gap)));
  }
  return props.columns ?? 3;
});

function getMeta(item: T) {
  return { aspect: props.getAspect?.(item) || '1:1', lazy: props.lazy };
}
</script>

<template>
  <div ref="root" class="relative w-full">
    <Masonry
      :data="props.items"
      :columns="resolvedColumns"
      :gap="props.gap"
      :layout-mode="props.waterfallMode"
      :get-key="props.getKey"
      :get-meta="getMeta"
      :lazy-root-margin="props.lazyRootMargin"
      :enter-animation="props.animated"
      :exit-animation="props.animated"
      :layout-transition="props.animated"
    >
      <template #default="{ item }">
        <slot :item="item as T" />
      </template>
    </Masonry>
    <!-- 触底哨兵：进入可视区即抛 reach-bottom -->
    <div ref="sentinel" class="h-px w-full" />
  </div>
</template>
