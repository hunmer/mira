<script setup lang="ts">
/**
 * LazyCell —— 懒加载容器
 * lazy=false 时直接渲染内容；lazy=true 时进入视窗才渲染（once：出现即加载并常驻）。
 * 拆成独立组件以保证 IntersectionObserver 在 v-for 中稳定挂载。
 */
import { onBeforeUnmount, onMounted, ref } from "vue"

const props = defineProps<{
  lazy?: boolean
  rootMargin?: string
}>()

const cellRef = ref<HTMLElement | null>(null)
const inView = ref(false)
let ob: IntersectionObserver | null = null

onMounted(() => {
  const el = cellRef.value
  if (!el) return
  ob = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        inView.value = true
        ob?.disconnect() // once: 出现即加载并常驻
      }
    },
    { rootMargin: props.rootMargin ?? "300px" }
  )
  ob.observe(el)
})

onBeforeUnmount(() => {
  ob?.disconnect()
  ob = null
})
</script>

<template>
  <div ref="cellRef" class="h-full w-full">
    <!-- lazy=false 时忽略 inView，直接渲染 -->
    <slot v-if="!props.lazy || inView" />
  </div>
</template>
