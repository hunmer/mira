<script setup lang="ts">
import { Motion } from 'motion-v'
import { RotateCcw, ArrowUpRight } from '@lucide/vue'
import type { NotificationItem } from './types'

/**
 * 通知列表卡片（复刻自 21st.dev skyleen77/notification-list）：
 * - 折叠态：卡片堆叠（marginTop 负值 + scaleX 递减），显示 "Notifications" 标题
 * - 悬停展开：卡片间距撑开，标题切换为 "View all"
 * 交互动效由 motion-v 的 variant 传播驱动（父级 while-hover 触发 expanded）
 */
const props = withDefaults(
  defineProps<{
    items?: NotificationItem[]
    title?: string
    viewAllText?: string
  }>(),
  {
    // 21st.dev 原版 demo 数据，替换为自己的通知内容即可
    items: () => [
      { id: 1, title: 'NPM Install Complete', subtitle: '1,227 packages added!', time: 'just now', count: 2 },
      { id: 2, title: 'Build Succeeded', subtitle: 'Build finished in 12.34s', time: '1m 11s' },
      { id: 3, title: 'Lint Passed', subtitle: 'No problems found', time: '5m' },
    ],
    title: 'Notifications',
    viewAllText: 'View all',
  },
)

// 卡片折叠/展开的间距与横向缩放，首张卡片无负 margin
const getCardVariants = (index: number) => ({
  collapsed: { marginTop: index === 0 ? 0 : -44, scaleX: 1 - index * 0.05 },
  expanded: { marginTop: index === 0 ? 0 : 4, scaleX: 1 },
})

const cardTransition = { type: 'spring', stiffness: 300, damping: 26 } as const
const textTransition = { duration: 0.22, ease: 'easeInOut' } as const

const titleVariants = {
  collapsed: { opacity: 1, y: 0, pointerEvents: 'auto' },
  expanded: { opacity: 0, y: -16, pointerEvents: 'none' },
}

const viewAllVariants = {
  collapsed: { opacity: 0, y: 16, pointerEvents: 'none' },
  expanded: { opacity: 1, y: 0, pointerEvents: 'auto' },
}
</script>

<template>
  <Motion
    as="div"
    class="bg-neutral-200 dark:bg-neutral-900 p-3 rounded-3xl w-xs space-y-3 shadow-md"
    initial="collapsed"
    while-hover="expanded"
  >
    <div>
      <Motion
        v-for="(item, index) in props.items"
        :key="item.id"
        as="div"
        class="bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2 shadow-sm hover:shadow-lg transition-shadow duration-200 relative"
        :variants="getCardVariants(index)"
        :transition="cardTransition"
        :style="{ zIndex: props.items.length - index }"
      >
        <div class="flex justify-between items-center">
          <h1 class="text-sm font-medium">{{ item.title }}</h1>
          <div
            v-if="item.count"
            class="flex items-center text-xs gap-0.5 font-medium text-neutral-500 dark:text-neutral-300"
          >
            <RotateCcw class="size-3" />
            <span>{{ item.count }}</span>
          </div>
        </div>
        <div class="text-xs text-neutral-500 font-medium">
          <span>{{ item.time }}</span> • <span>{{ item.subtitle }}</span>
        </div>
      </Motion>
    </div>
    <div class="flex items-center gap-2">
      <div
        class="size-5 rounded-full bg-neutral-400 text-white text-xs flex items-center justify-center font-medium"
      >
        {{ props.items.length }}
      </div>
      <span class="grid">
        <Motion
          as="span"
          class="text-sm font-medium text-neutral-600 dark:text-neutral-300 row-start-1 col-start-1"
          :variants="titleVariants"
          :transition="textTransition"
        >
          {{ props.title }}
        </Motion>
        <Motion
          as="span"
          class="text-sm font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1 cursor-pointer select-none row-start-1 col-start-1"
          :variants="viewAllVariants"
          :transition="textTransition"
        >
          {{ props.viewAllText }} <ArrowUpRight class="size-4" />
        </Motion>
      </span>
    </div>
  </Motion>
</template>
