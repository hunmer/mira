<script setup lang="ts">
interface Props {
  count: number
  onClick?: () => void
}

const props = defineProps<Props>()
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer items-center justify-center gap-1 rounded-3xl bg-popover px-4 py-2 text-sm font-medium text-muted-foreground shadow-lg transition-colors hover:text-foreground"
    @click="props.onClick?.()"
    @mousedown.stop
  >
    <span>展示更多</span>
    <span>({{ count }})</span>
  </button>
</template>
