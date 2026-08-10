<template>
  <div
    class="card"
    :class="{ 'is-playing': player.state.isPlaying, 'is-zoomed': isZoomed }"
    @click="onCardClick"
  >
    <audio ref="audioEl" preload="metadata" :crossorigin="crossOrigin || undefined" />

    <Disc
      :layers="layers"
      :is-playing="player.state.isPlaying"
      :is-zoomed="isZoomed"
      :track-key="player.state.currentIndex"
      :direction="player.state.direction"
      :show-fallback="coverMissing"
      @zoom-toggle="toggleZoom"
    />

    <div class="info">
      <ScalesMixer
        :is-playing="player.state.isPlaying"
        :get-frequency-data="player.getFrequencyData"
      />
      <TrackInfo :layers="layers" />
      <ProgressBar
        :current-time="player.currentTime.value"
        :duration="player.duration.value"
        @seek="player.seek"
      />
      <Controls
        :is-playing="player.state.isPlaying"
        :shuffled="player.state.shuffled"
        :loop-mode="player.state.loopMode"
        :multi="multi"
        @toggle="player.toggle"
        @next="player.next"
        @prev="player.prev"
        @shuffle="player.toggleShuffle"
        @loop="player.cycleLoop"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Disc from './components/Disc.vue'
import ScalesMixer from './components/ScalesMixer.vue'
import TrackInfo from './components/TrackInfo.vue'
import ProgressBar from './components/ProgressBar.vue'
import Controls from './components/Controls.vue'
import { useAudioPlayer } from './composables/useAudioPlayer'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import type { Layer, Track } from './types'
import './music-player.css'

const props = defineProps<{
  tracks: Track[]
  crossOrigin?: 'anonymous' | 'use-credentials'
}>()

const tracksRef = computed(() => props.tracks)
const player = useAudioPlayer(tracksRef)

const audioEl = ref<HTMLAudioElement | null>(null)
// 把模板 ref 同步到 composable 内的 audioRef
watch(audioEl, el => { player.audioRef.value = el }, { immediate: true })

const isZoomed = ref(false)
const multi = computed(() => props.tracks.length > 1)
const coverMissing = computed(() => !player.currentTrack.value?.cover)

const layers = ref<Layer[]>([
  { id: 0, track: props.tracks[0], dir: null },
])
const lastIndex = ref(0)
const idRef = ref(1)

watch(
  () => player.state.currentIndex,
  () => {
    if (player.state.currentIndex === lastIndex.value) return
    lastIndex.value = player.state.currentIndex
    const id = idRef.value++
    layers.value = [
      ...layers.value,
      { id, track: player.currentTrack.value, dir: player.state.direction },
    ]
    setTimeout(() => {
      layers.value = layers.value.filter(l => l.id === id)
    }, 760)
  },
)

// tracks 整体替换时重置层
watch(
  () => props.tracks,
  list => {
    if (!list.length) return
    layers.value = [{ id: idRef.value++, track: list[0], dir: null }]
    lastIndex.value = 0
  },
)

const toggleZoom = () => { isZoomed.value = !isZoomed.value }
const onCardClick = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.mask')) isZoomed.value = false
}

const seekForward = () => {
  const a = player.audioRef.value
  if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + 5)
}
const seekBackward = () => {
  const a = player.audioRef.value
  if (a) a.currentTime = Math.max(0, a.currentTime - 5)
}

useKeyboardShortcuts(() => ({
  toggle: player.toggle,
  next: player.next,
  prev: player.prev,
  seekForward,
  seekBackward,
  toggleShuffle: player.toggleShuffle,
  cycleLoop: player.cycleLoop,
}))
</script>
