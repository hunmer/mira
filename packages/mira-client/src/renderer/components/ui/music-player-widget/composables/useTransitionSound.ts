import { onBeforeUnmount, ref } from 'vue'

type AudioCtor = typeof AudioContext

/**
 * 切歌时播放一个短暂的合成「啵」声，音高随低频能量变化。
 * Web Audio 不可用时静默失败。
 */
export function useTransitionSound() {
  const ctxRef = ref<AudioContext | null>(null)

  onBeforeUnmount(() => {
    ctxRef.value?.close().catch(() => {})
    ctxRef.value = null
  })

  const play = (bassEnergy = 0.5) => {
    try {
      if (!ctxRef.value) {
        const Ctor: AudioCtor | undefined =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
        if (!Ctor) return
        ctxRef.value = new Ctor()
      }
      const ctx = ctxRef.value
      if (ctx.state === 'suspended') ctx.resume()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startFreq = 440 + bassEnergy * 440
      const endFreq = startFreq * (2 / 3)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(startFreq, now)
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.18)
    } catch {
      /* Web Audio unavailable */
    }
  }

  return play
}
