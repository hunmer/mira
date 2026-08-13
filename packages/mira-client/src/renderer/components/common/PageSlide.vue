<script setup lang="ts">
/**
 * 双页侧滑切换容器（移植自 Transitions.dev — Page side-by-side）
 *
 * - 两个页面叠加（position: absolute 铺满），通过 v-model:page (1 | 2) 控制当前页
 * - 页面 1 退出到左侧，页面 2 退出到右侧，带淡出 + 模糊过渡
 * - 时长 / 距离 / 模糊 / 缓动 / 错峰 / 是否禁用退出动效 均可通过 prop 调整
 * - 自动遵守 prefers-reduced-motion（减弱动效时关闭过渡）
 *
 * 用法：
 *   <PageSlide v-model:page="page">
 *     <template #page-1>…</template>
 *     <template #page-2>…</template>
 *   </PageSlide>
 *
 * 注意：容器为相对定位、页面为绝对定位铺满容器，需由外部给容器设定尺寸（宽高）。
 */
import { computed } from 'vue'
import { useVModel } from '@vueuse/core'

defineOptions({ name: 'PageSlide' })

const props = withDefaults(
  defineProps<{
    /** v-model:page 当前激活页 */
    page?: 1 | 2
    /** 是否启用「退出页」的滑动 / 模糊（false 时退出页仅淡出） */
    exitEnabled?: boolean
    /** 滑动时长（数字按 ms，字符串原样） */
    slideDuration?: string | number
    /** 淡入淡出时长（数字按 ms，字符串原样） */
    fadeDuration?: string | number
    /** 退出页的横向位移距离（带单位，如 8px） */
    slideDistance?: string
    /** 退出页的模糊量（带单位，如 3px） */
    blur?: string
    /** 进入页的延迟（错峰，带单位，如 80ms） */
    stagger?: string
    /** 滑动缓动函数 */
    slideEase?: string
    /** 淡入淡出缓动函数 */
    fadeEase?: string
    /** 透传给根节点的 class */
    class?: string
  }>(),
  {
    page: 1,
    exitEnabled: true,
    slideDuration: undefined,
    fadeDuration: undefined,
    slideDistance: undefined,
    blur: undefined,
    stagger: undefined,
    slideEase: undefined,
    fadeEase: undefined,
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:page': [value: 1 | 2]
}>()

const page = useVModel(props, 'page', emit, { passive: true })

// 数字按 ms，字符串原样；未传入返回空串（跳过覆盖，沿用 <style> 中的默认值）
const ms = (v: string | number | undefined) =>
  v == null ? '' : typeof v === 'number' ? `${v}ms` : v

// 仅覆盖用户显式传入的 CSS 变量，其余使用 <style> 内的默认值
const cssVars = computed(() => {
  const v: Record<string, string> = {
    '--page-exit-enabled': props.exitEnabled ? '1' : '0',
  }
  const slide = ms(props.slideDuration)
  const fade = ms(props.fadeDuration)
  if (slide) v['--page-slide-dur'] = slide
  if (fade) v['--page-fade-dur'] = fade
  if (props.slideDistance) v['--page-slide-distance'] = props.slideDistance
  if (props.blur) v['--page-blur'] = props.blur
  if (props.stagger) v['--page-stagger'] = props.stagger
  if (props.slideEase) v['--page-slide-ease'] = props.slideEase
  if (props.fadeEase) v['--page-fade-ease'] = props.fadeEase
  return v
})

defineExpose({
  /** 切换到另一页 */
  toggle: () => {
    page.value = page.value === 1 ? 2 : 1
  },
})
</script>

<template>
  <div
    class="t-page-slide"
    :data-page="page"
    :style="cssVars"
    :class="props.class"
  >
    <section class="t-page" data-page-id="1" :aria-hidden="page !== 1">
      <slot name="page-1" :active="page === 1" />
    </section>
    <section class="t-page" data-page-id="2" :aria-hidden="page !== 2">
      <slot name="page-2" :active="page === 2" />
    </section>
  </div>
</template>

<style scoped>
.t-page-slide {
  position: relative;
  --page-slide-dur: 250ms;
  --page-fade-dur: 250ms;
  --page-slide-distance: 8px;
  --page-blur: 3px;
  --page-stagger: 0ms;
  --page-exit-enabled: 1;
  --page-slide-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --page-fade-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
.t-page-slide .t-page[data-page-id='1'] {
  --t-page-from-x: calc(var(--page-slide-distance) * -1);
}
.t-page-slide .t-page[data-page-id='2'] {
  --t-page-from-x: var(--page-slide-distance);
}
.t-page-slide .t-page {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc(var(--t-page-from-x, 0px) * var(--page-exit-enabled)));
  filter: blur(calc(var(--page-blur) * var(--page-exit-enabled)));
  transition:
    opacity var(--page-fade-dur) var(--page-fade-ease),
    transform var(--page-slide-dur) var(--page-slide-ease),
    filter var(--page-slide-dur) var(--page-slide-ease);
  will-change: opacity, transform, filter;
}
.t-page-slide[data-page='1'] .t-page[data-page-id='1'],
.t-page-slide[data-page='2'] .t-page[data-page-id='2'] {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
  filter: blur(0);
  transition-delay: var(--page-stagger);
}

@media (prefers-reduced-motion: reduce) {
  .t-page-slide .t-page {
    transition: none !important;
  }
}
</style>
