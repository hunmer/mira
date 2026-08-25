<script setup lang="ts">
/**
 * 交互悬停按钮
 * 复刻自 21st.dev InteractiveHoverButton（React → Vue）。
 * 悬停时默认文字右滑淡出，primary 色块从按钮中部扩散铺满，同时浮出带箭头的悬停文案。
 *
 * 用法：
 *   <InteractiveHoverButton text="开始使用" @click="onClick" />
 *   <InteractiveHoverButton text="Explore" class="w-36" />
 *
 * 原生属性与事件（type / disabled / @click 等）透传至根 button。
 */
import { ArrowRight } from "@lucide/vue"
import { cn } from "@/lib/utils"

interface Props {
  /** 按钮文字，默认态与悬停态共用 */
  text?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  text: "Button",
})

defineOptions({ name: "InteractiveHoverButton" })
</script>

<template>
  <button
    :class="cn(
      'group relative w-32 cursor-pointer overflow-hidden rounded-full border bg-background p-2 text-center font-semibold',
      props.class,
    )"
  >
    <span
      class="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0"
    >{{ text }}</span>
    <div
      class="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-primary-foreground opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100"
    >
      <span>{{ text }}</span>
      <ArrowRight />
    </div>
    <div
      class="absolute left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-primary transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:bg-primary"
    />
  </button>
</template>
