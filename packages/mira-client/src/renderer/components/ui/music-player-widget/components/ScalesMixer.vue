<template>
  <svg class="scales" viewBox="0 0 98 108" aria-hidden="true">
    <mask :id="maskId">
      <rect width="10" height="10" fill="#fff" />
    </mask>
    <g
      v-for="c in COLS"
      :key="c - 1"
      :ref="el => setColRef(c - 1, el as SVGGElement | null)"
      :style="{ transform: `translate(${(c - 1) * 10}px, 0px)` }"
    >
      <g
        v-for="r in ROWS"
        :key="r - 1"
        :mask="`url(#${maskId})`"
        :transform="`translate(0 ${(r - 1) * 10})`"
      >
        <circle
          :ref="el => setCircleRef(c - 1, r - 1, el as SVGCircleElement | null)"
          cx="5"
          cy="5"
          r="5"
        />
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from 'vue'
import { useRafLoop } from '../composables/useRafLoop'

const props = defineProps<{
  isPlaying: boolean
  getFrequencyData?: () => Uint8Array | null
}>()

const rawId = useId()
const maskId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_')

const COLS = 10
const ROWS = 10
const BAND_RANGES: [number, number][] = [
  [0, 1], [1, 3], [3, 6], [6, 10], [10, 16],
  [16, 24], [24, 36], [36, 52], [52, 74], [74, 100],
]
const sineOut = (x: number) => Math.sin((x * Math.PI) / 2)
const sineIn = (x: number) => 1 - Math.cos((x * Math.PI) / 2)
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const PART_A_DUR = 1.5
const PART_A_TO = 11
const PART_A_STEP = 3 / (COLS - 1)
const PART_B_DUR = 1
const SCALE_FROM = 0.133
const SCALE_TO = 0.8

function partAColumnY(time: number, col: number): number {
  const local = time - col * PART_A_STEP
  const period = PART_A_DUR * 2
  const cyc = ((local % period) + period) % period
  if (cyc < PART_A_DUR) return PART_A_TO * sineInOut(cyc / PART_A_DUR)
  return PART_A_TO * sineInOut(1 - (cyc - PART_A_DUR) / PART_A_DUR)
}
function partBCircle(time: number, col: number, row: number): [number, number] {
  const frac = row / ROWS
  const yFrom = lerp(77, -77, frac)
  const yTo = lerp(col, -col, frac)
  const local = time - col / COLS
  const period = PART_B_DUR * 2
  const cyc = ((local % period) + period) % period
  let e: number
  if (cyc < PART_B_DUR) e = sineOut(cyc / PART_B_DUR)
  else e = sineIn(1 - (cyc - PART_B_DUR) / PART_B_DUR)
  return [lerp(yFrom, yTo, e), lerp(SCALE_FROM, SCALE_TO, e)]
}

// 命令式 DOM 引用，避免每帧响应式开销
const colRefs = ref<(SVGGElement | null)[]>([])
const circleRefs = ref<(SVGCircleElement | null)[][]>(
  Array.from({ length: COLS }, () => [])
)
const setColRef = (c: number, el: SVGGElement | null) => { colRefs.value[c] = el }
const setCircleRef = (c: number, r: number, el: SVGCircleElement | null) => {
  circleRefs.value[c][r] = el
}

const tRef = ref(50)

useRafLoop((_, dt) => {
  if (props.isPlaying) tRef.value += dt / 1000
  const time = tRef.value
  const freqData = props.getFrequencyData?.()
  for (let c = 0; c < COLS; c++) {
    let energy = 1.0
    if (freqData) {
      const [binStart, binEnd] = BAND_RANGES[c]
      let sum = 0
      for (let b = binStart; b < binEnd; b++) sum += freqData[b] ?? 0
      energy = Math.sqrt(sum / (binEnd - binStart) / 255)
    }
    const bobGain = freqData ? 0.4 + energy : 1
    const scaleGain = freqData ? 0.5 + energy : 1
    const colEl = colRefs.value[c]
    if (colEl) {
      const ay = partAColumnY(time, c) * bobGain
      colEl.style.transform = `translate(${c * 10}px, ${ay}px)`
    }
    for (let r = 0; r < ROWS; r++) {
      const circle = circleRefs.value[c][r]
      if (!circle) continue
      const [ty, s] = partBCircle(time, c, r)
      circle.style.transform = `translateY(${ty}px) scale(${s * scaleGain})`
    }
  }
})

onBeforeUnmount(() => {
  colRefs.value = []
  circleRefs.value = Array.from({ length: COLS }, () => [])
})
</script>
