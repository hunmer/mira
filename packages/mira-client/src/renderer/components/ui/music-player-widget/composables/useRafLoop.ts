import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * 每帧调用 cb(now, dt) 的 rAF 循环。
 * 通过 Ref 持有最新回调，避免每次 cb 变化都重建循环。
 */
export function useRafLoop(cb: (now: number, dt: number) => void) {
  const cbRef: Ref<typeof cb> = ref(cb)
  cbRef.value = cb

  onMounted(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = now - last
      last = now
      cbRef.value(now, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    onBeforeUnmount(() => cancelAnimationFrame(raf))
  })
}
