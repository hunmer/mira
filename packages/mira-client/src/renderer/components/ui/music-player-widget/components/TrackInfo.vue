<template>
  <div class="track-info">
    <div
      v-for="(l, i) in layers"
      :key="l.id"
      class="ti-layer"
      :class="{ 'ti-abs': !isNewest(i) }"
    >
      <p class="artist" :class="stateClass(i, l.dir)" :style="dxStyle(i, l.dir)">
        {{ l.track.artist }}
      </p>
      <h2 class="track" :class="stateClass(i, l.dir)" :style="dxStyle(i, l.dir)">
        {{ l.track.title }}
      </h2>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { Direction, Layer } from '../types'

const props = defineProps<{ layers: Layer[] }>()

const isNewest = (i: number) => i === props.layers.length - 1

const stateClass = (i: number, dir: Direction) => {
  if (!isNewest(i)) return 'ti-exit'
  return dir ? 'ti-enter' : ''
}

const dxStyle = (i: number, dir: Direction): CSSProperties => {
  const newest = isNewest(i)
  const dx = dir === 'next' ? 14 : dir === 'prev' ? -14 : 0
  return { ['--dx' as string]: `${newest ? dx : -dx}px` }
}
</script>
