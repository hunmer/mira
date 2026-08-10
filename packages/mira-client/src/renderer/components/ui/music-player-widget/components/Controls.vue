<template>
  <div class="controls">
    <button
      v-if="multi"
      class="ctrl ctrl-toggle"
      :class="{ 'is-active': shuffled }"
      :title="$t('preview.audioPreview.shuffle')"
      @click="$emit('shuffle')"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 3h5v5" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
        <path d="M16 21h5v-5" /><path d="M21 21l-7-7" /><path d="M3 3l7 7" />
      </svg>
    </button>

    <button v-if="multi" class="ctrl" :title="$t('preview.audioPreview.previous')" @click="$emit('prev')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M19 5L8 12l11 7zM5 5h2v14H5z" />
      </svg>
    </button>

    <button class="ctrl ctrl-play" :title="isPlaying ? $t('preview.audioPreview.pause') : $t('preview.audioPreview.play')" @click="$emit('toggle')">
      <svg v-if="isPlaying" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M6 5h3v14H6zM15 5h3v14h-3z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M7 5v14l11-7z" />
      </svg>
    </button>

    <button v-if="multi" class="ctrl" :title="$t('preview.audioPreview.next')" @click="$emit('next')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M5 5l11 7L5 19zM17 5h2v14h-2z" />
      </svg>
    </button>

    <button
      v-if="multi"
      class="ctrl ctrl-toggle ctrl-loop"
      :class="{ 'is-active': loopMode !== 'off', 'mode-one': loopMode === 'one' }"
      :title="$t('preview.audioPreview.loop')"
      @click="$emit('loop')"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12V8a2 2 0 0 1 2-2h12" /><path d="M16 3l4 3l-4 3" />
        <path d="M20 12v4a2 2 0 0 1-2 2H6" /><path d="M8 21l-4-3l4-3" />
      </svg>
      <span class="loop-one">1</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { LoopMode } from '../types'

defineProps<{
  isPlaying: boolean
  shuffled: boolean
  loopMode: LoopMode
  multi: boolean
}>()
defineEmits<{
  toggle: []
  next: []
  prev: []
  shuffle: []
  loop: []
}>()
</script>
