<template>
  <div ref="container" class="h-full w-full overflow-auto" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  render: (container: HTMLElement, context: Record<string, any>) => (() => void) | void
  context: Record<string, any>
}>()

const container = ref<HTMLElement | null>(null)
let cleanup: (() => void) | void

onMounted(() => {
  if (container.value) cleanup = props.render(container.value, props.context)
})

onUnmounted(() => cleanup?.())
</script>
