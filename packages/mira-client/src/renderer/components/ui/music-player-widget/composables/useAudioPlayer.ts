import { onBeforeUnmount, reactive, ref, watch, type Ref } from 'vue'
import Hls from 'hls.js'
import type { Direction, LoopMode, Track } from '../types'
import { useAudioAnalyser } from './useAudioAnalyser'
import { useTransitionSound } from './useTransitionSound'

interface PlayerState {
  currentIndex: number
  order: number[]
  shuffled: boolean
  loopMode: LoopMode
  isPlaying: boolean
  direction: Direction
}

function shuffleOrder(pinFirst: number, count: number): number[] {
  const rest = Array.from({ length: count }, (_, i) => i).filter(x => x !== pinFirst)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [pinFirst, ...rest]
}

export interface AudioPlayer {
  audioRef: Ref<HTMLAudioElement | null>
  state: PlayerState
  currentTime: Ref<number>
  duration: Ref<number>
  currentTrack: Ref<Track>
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (pct: number) => void
  toggleShuffle: () => void
  cycleLoop: () => void
  getFrequencyData: () => Uint8Array | null
  connectAnalyser: () => void
}

/**
 * 音频播放核心逻辑：状态机 + HLS 兼容 + 频谱分析。
 * tracks 应是稳定引用（父组件计算属性），变化时会重新载入第一首。
 */
export function useAudioPlayer(tracks: Ref<Track[]>): AudioPlayer {
  const audioRef = ref<HTMLAudioElement | null>(null)
  const currentTime = ref(0)
  const duration = ref(0)

  const state = reactive<PlayerState>({
    currentIndex: 0,
    order: Array.from({ length: tracks.value.length }, (_, i) => i),
    shuffled: false,
    loopMode: 'off',
    isPlaying: false,
    direction: null,
  })

  const { connect, getFrequencyData, getBandEnergy } = useAudioAnalyser(audioRef)
  const playTransitionSound = useTransitionSound()
  let hls: Hls | null = null

  // ---- HLS / 直连源应用 ----
  const applySource = (audio: HTMLAudioElement, src: string) => {
    hls?.destroy()
    hls = null
    if (src.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hls.loadSource(src)
      hls.attachMedia(audio)
      return
    }
    audio.src = src
    audio.load()
  }

  const loadTrack = (index: number, autoplay: boolean, direction: Direction) => {
    const audio = audioRef.value
    if (!audio) return
    const bassEnergy = getBandEnergy(0, 4)
    if (tracks.value.length > 1) playTransitionSound(bassEnergy)
    state.currentIndex = index
    state.direction = direction
    applySource(audio, tracks.value[index].src)
    if (autoplay) audio.play().catch(() => {})
  }

  const toggle = () => {
    const audio = audioRef.value
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  const next = () => {
    const audio = audioRef.value
    if (!audio) return
    if (tracks.value.length <= 1) return
    const pos = state.order.indexOf(state.currentIndex)
    const np = pos + 1
    if (np >= state.order.length) {
      if (state.loopMode === 'all') loadTrack(state.order[0], !audio.paused, 'next')
      else {
        audio.pause()
        audio.currentTime = 0
      }
      return
    }
    loadTrack(state.order[np], !audio.paused, 'next')
  }

  const prev = () => {
    const audio = audioRef.value
    if (!audio) return
    if (tracks.value.length <= 1) return
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const pos = state.order.indexOf(state.currentIndex)
    const pp = pos - 1
    if (pp < 0) {
      if (state.loopMode === 'all') loadTrack(state.order[state.order.length - 1], !audio.paused, 'prev')
      else audio.currentTime = 0
      return
    }
    loadTrack(state.order[pp], !audio.paused, 'prev')
  }

  const seek = (pct: number) => {
    const audio = audioRef.value
    if (!audio || !audio.duration) return
    audio.currentTime = pct * audio.duration
  }

  const toggleShuffle = () => {
    if (tracks.value.length <= 1) return
    const shuffled = !state.shuffled
    state.order = shuffled
      ? shuffleOrder(state.currentIndex, tracks.value.length)
      : Array.from({ length: tracks.value.length }, (_, i) => i)
    state.shuffled = shuffled
  }

  const cycleLoop = () => {
    const nextMode: LoopMode =
      state.loopMode === 'off' ? 'all' : state.loopMode === 'all' ? 'one' : 'off'
    state.loopMode = nextMode
  }

  // ---- audio 元素事件绑定（audioRef 就绪后挂一次） ----
  const bindAudioEvents = () => {
    const audio = audioRef.value
    if (!audio) return

    const onPlay = () => {
      state.isPlaying = true
      connect()
    }
    const onPause = () => {
      state.isPlaying = false
    }
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) duration.value = audio.duration
    }
    const onTimeUpdate = () => {
      currentTime.value = audio.currentTime
      if (audio.duration) duration.value = audio.duration
    }
    const onEnded = () => {
      if (state.loopMode === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else next()
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    onBeforeUnmount(() => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    })
  }

  // audioRef 模板就绪后绑定事件并载入首曲
  watch(audioRef, audio => {
    if (!audio) return
    bindAudioEvents()
    if (tracks.value.length > 0) applySource(audio, tracks.value[0].src)
  })

  // tracks 变化（如父组件切歌）时重置
  watch(tracks, list => {
    const audio = audioRef.value
    if (!audio || list.length === 0) return
    state.currentIndex = 0
    state.direction = null
    state.order = Array.from({ length: list.length }, (_, i) => i)
    state.shuffled = false
    currentTime.value = 0
    duration.value = 0
    applySource(audio, list[0].src)
  })

  onBeforeUnmount(() => {
    hls?.destroy()
    hls = null
  })

  const currentTrack = ref<Track>(tracks.value[0]) as Ref<Track>
  const updateCurrent = () => {
    currentTrack.value = tracks.value[state.currentIndex] ?? tracks.value[0]
  }
  watch(() => state.currentIndex, updateCurrent)
  watch(tracks, updateCurrent, { immediate: true })

  return {
    audioRef,
    state,
    currentTime,
    duration,
    currentTrack,
    toggle,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleLoop,
    getFrequencyData,
    connectAnalyser: connect,
  }
}
