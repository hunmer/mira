import { onBeforeUnmount, ref } from 'vue'
import type { Ref } from 'vue'

type AudioCtor = typeof AudioContext

const FFT_SIZE = 256

/**
 * 将 <audio> 元素接入 Web Audio 图，提供实时频域数据。
 * 首次 'play' 事件时懒连接（满足浏览器自动播放策略）。
 * 连接失败（如 CORS 限制 createMediaElementSource）时静默降级。
 */
export function useAudioAnalyser(audioRef: Ref<HTMLAudioElement | null>) {
  const ctxRef = ref<AudioContext | null>(null)
  const analyserRef = ref<AnalyserNode | null>(null)
  const dataRef = ref<Uint8Array>(new Uint8Array(FFT_SIZE / 2))
  const connectedRef = ref(false)

  const connect = () => {
    const audio = audioRef.value
    if (!audio || connectedRef.value) return
    try {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
      const source = ctx.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(ctx.destination)
      ctxRef.value = ctx
      analyserRef.value = analyser
      dataRef.value = new Uint8Array(analyser.frequencyBinCount)
      connectedRef.value = true
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    } catch {
      /* unavailable or already connected (CORS / double-connect) */
    }
  }

  // 由父组件在 audio 'play' 事件时调用 connect()
  onBeforeUnmount(() => {
    ctxRef.value?.close().catch(() => {})
    ctxRef.value = null
  })

  const getFrequencyData = (): Uint8Array | null => {
    const analyser = analyserRef.value
    if (!analyser) return null
    if (ctxRef.value?.state === 'suspended') ctxRef.value.resume().catch(() => {})
    analyser.getByteFrequencyData(dataRef.value)
    return dataRef.value
  }

  const getBandEnergy = (startBin: number, endBin: number): number => {
    if (!analyserRef.value) return 0
    const data = dataRef.value
    const count = endBin - startBin
    if (count <= 0) return 0
    let sum = 0
    for (let i = startBin; i < endBin && i < data.length; i++) sum += data[i]
    return sum / count / 255
  }

  return { connect, getFrequencyData, getBandEnergy }
}
