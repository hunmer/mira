<template>
  <div
    class="mask"
    :class="{ 'is-zoomed': isZoomed }"
    @click="onMaskClick"
  >
    <div class="spin" ref="spinRef">
      <img
        v-for="(l, i) in layers"
        :key="l.id"
        :src="l.track.cover"
        :alt="`${l.track.title} — ${l.track.artist}`"
        :class="coverClass(i, l.dir)"
        draggable="false"
        @error="onCoverError"
      />
      <div v-if="coverMissing" class="cover cover-fallback">
        <span class="material-symbols-outlined">music_note</span>
      </div>
    </div>
    <div class="hole">
      <div class="hole-inner" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Direction, Layer } from '../types'
import { useRafLoop } from '../composables/useRafLoop'

const props = defineProps<{
  layers: Layer[]
  isPlaying: boolean
  isZoomed: boolean
  trackKey: number
  direction: Direction
  showFallback: boolean
}>()

const emit = defineEmits<{ 'zoom-toggle': [] }>()

const SPIN_MAX = 0.4375
const BURST_DURATION = 620

const spinRef = ref<HTMLDivElement | null>(null)
const rotRef = ref(0)
const velRef = ref(0)
const burstRef = ref({ from: 0, start: 0, active: false, pending: false })
const lastKey = ref(props.trackKey)
const coverMissing = ref(props.showFallback)

const coverClass = (i: number, dir: Direction) => {
  const isNewest = i === props.layers.length - 1
  if (isNewest) return dir ? 'cover cover-enter' : 'cover'
  return 'cover cover-exit'
}

const onMaskClick = (e: MouseEvent) => {
  e.stopPropagation()
  emit('zoom-toggle')
}

const onCoverError = () => { coverMissing.value = true }

watch(() => props.trackKey, key => {
  if (key !== lastKey.value) {
    lastKey.value = key
    if (props.direction) {
      burstRef.value.from = props.direction === 'prev' ? 360 : -360
      burstRef.value.pending = true
    }
  }
})
watch(() => props.showFallback, v => { coverMissing.value = v })

useRafLoop(now => {
  const el = spinRef.value
  if (!el) return
  if (props.isPlaying) velRef.value += (SPIN_MAX - velRef.value) * 0.2
  else {
    velRef.value *= 0.96
    if (velRef.value < 0.001) velRef.value = 0
  }
  if (props.isZoomed) {
    const target = Math.round(rotRef.value / 360) * 360
    const nx = rotRef.value + (target - rotRef.value) * 0.08
    rotRef.value = Math.abs(target - nx) < 0.1 ? target : nx
  } else {
    rotRef.value += velRef.value
  }
  const burst = burstRef.value
  if (burst.pending) {
    burst.start = now
    burst.pending = false
    burst.active = true
  }
  let b = 0
  if (burst.active) {
    const t = (now - burst.start) / BURST_DURATION
    if (t >= 1) burst.active = false
    else b = burst.from * (1 - (1 - Math.pow(1 - t, 3)))
  }
  el.style.transform = `scale(1.01) rotate(${rotRef.value + b}deg)`
})
</script>
