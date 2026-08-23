<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { SpinePreviewApp } from './spine/previewApp'

/**
 * PIXI canvas 容器。
 * 持有一个 SpinePreviewApp 实例，由父组件通过 ref 调用 init / setSpine / fitView 等。
 */
const containerRef = ref<HTMLDivElement | null>(null)
const app = shallowRef<SpinePreviewApp | null>(null)

defineExpose({
  /** 获取底层 SpinePreviewApp（可能尚未 init） */
  get app() {
    return app.value
  },
  /** 初始化 PIXI（仅一次） */
  async init() {
    if (app.value || !containerRef.value) return
    const instance = new SpinePreviewApp(containerRef.value)
    await instance.init()
    app.value = instance
  },
  fit() {
    app.value?.fitView()
  },
  /** 画布背景跟随主题 */
  setBackground(color: string) {
    app.value?.setBackgroundColor(color)
  },
})

onMounted(() => {
  /* init 由父组件在资源就绪后调用，避免空 canvas */
})

onBeforeUnmount(() => {
  app.value?.destroy()
  app.value = null
})

// 父组件可监听窗口尺寸变化触发 fit；这里监听容器 resize 兜底
watch(containerRef, (el, _old, onCleanup) => {
  if (!el) return
  const ro = new ResizeObserver(() => {
    // PIXI resizeTo 已处理 canvas 尺寸；fitView 仅在显式调用时执行
  })
  ro.observe(el)
  onCleanup(() => ro.disconnect())
})
</script>

<template>
  <div ref="containerRef" class="absolute inset-0" />
</template>
