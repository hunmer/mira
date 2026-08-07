<script setup lang="ts">
import type { WithClassAsProps } from './interface'
import { cn } from '@/lib/utils'
import { useCarousel } from './useCarousel'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<WithClassAsProps>()

const { carouselRef, orientation } = useCarousel()
</script>

<template>
  <!--
    Embla 容器（carouselRef）。垂直模式下必须有确定的高度才能产生滚动区间，
    否则内容高度 = 视口高度 → scrollSnapList 只有 1 项 → 既无法滚动也无法翻页。
    因此水平方向沿用 overflow-hidden（宽度由外层限制），垂直方向强制 h-full。
  -->
  <div
    ref="carouselRef"
    data-slot="carousel-content"
    :class="cn('overflow-hidden', orientation === 'vertical' ? 'h-full' : '', props.class)"
  >
    <div
      :class="
        cn(
          'flex',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
        )
      "
      v-bind="$attrs"
    >
      <slot />
    </div>
  </div>
</template>
