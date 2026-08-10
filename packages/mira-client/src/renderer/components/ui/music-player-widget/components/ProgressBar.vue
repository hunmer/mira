<template>
  <div class="progress-wrap">
    <div class="bar" @click="onClick">
      <div class="bar-fill" :style="{ width: `${pct}%` }" />
    </div>
    <div class="time">
      <span class="current">{{ fmt(currentTime) }}</span>
      <span class="sep">/</span>
      <span class="total">{{ fmt(duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentTime: number
  duration: number
}>()
const emit = defineEmits<{ seek: [pct: number] }>()

const pct = computed(() => (props.duration ? (props.currentTime / props.duration) * 100 : 0))

const fmt = (s: number): string => {
  if (!isFinite(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

const onClick = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  emit('seek', ratio)
}
</script>
