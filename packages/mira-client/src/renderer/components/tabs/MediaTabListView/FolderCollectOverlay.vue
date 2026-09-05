<script setup lang="ts">
import { Motion } from 'motion-v'
import type { FolderCollectDropState, FolderCollectFlightItem } from './useFolderCollect'

/**
 * 「收入文件夹」动画覆盖层（移植自 photo-library-organizer）：
 *  Phase 1 — 素材克隆从原卡片位置飞到文件夹上方（transform: x/y/scale/rotate 插值）
 *  Phase 2 — 素材从文件夹上方弹簧过冲落进口袋
 * 全程只用 transform/opacity（项目内 motion-v 已验证路径），元素固定终尺寸，
 * 起点缩放通过 scaleX/scaleY 补偿；Teleport 到 body 保证 fixed 坐标系即视口坐标系。
 */
defineProps<{
  flights: FolderCollectFlightItem[]
  drops: FolderCollectDropState | null
}>()

const onThumbError = (event: Event) => {
  ;(event.target as HTMLElement).style.display = 'none'
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-0 z-[70]">
      <!-- Phase 1：原位 → 文件夹上方（视觉中心 = x/y + size/2，与 scale/rotate 无关） -->
      <Motion v-for="(flight, index) in flights" :key="`collect-flight-${flight.id}`"
        :initial="{
          x: flight.startCenterX - flight.targetSize / 2,
          y: flight.startCenterY - flight.targetSize / 2,
          scaleX: flight.startScaleX,
          scaleY: flight.startScaleY,
          rotate: 0,
          opacity: 1,
        }"
        :animate="{
          x: flight.endCenterX - flight.targetSize / 2,
          y: flight.endCenterY - flight.targetSize / 2,
          scaleX: 1,
          scaleY: 1,
          rotate: flight.rotate,
        }"
        :transition="{
          duration: 0.38,
          ease: [0.22, 1, 0.36, 1],
          delay: index * 0.02,
        }"
        class="absolute left-0 top-0 overflow-hidden rounded-2xl border border-white/20 bg-neutral-800 shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
        :style="{
          width: `${flight.targetSize}px`,
          height: `${flight.targetSize}px`,
          zIndex: 60 + index,
        }">
        <img :src="flight.thumb" alt="" class="size-full object-cover" @error="onThumbError">
      </Motion>

      <!-- Phase 2：文件夹上方 → 口袋（弹簧过冲） -->
      <div v-if="drops">
        <div v-for="(drop, index) in drops.items" :key="`collect-drop-${drop.id}`"
          class="absolute overflow-hidden rounded-lg border border-white/35 bg-neutral-800 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.6)]"
          :style="{
            left: `${drop.left}px`,
            top: `${drop.top}px`,
            width: `${drops.size}px`,
            height: `${drops.size}px`,
            zIndex: 20 + index,
          }">
          <Motion
            :initial="{
              x: drop.fromX,
              y: drop.fromY,
              rotate: drop.fromRotate,
              scale: 1.05,
            }"
            :animate="{
              x: 0,
              y: 0,
              rotate: drop.settledRotate,
              scale: drop.settledScale,
            }"
            :transition="{
              type: 'spring',
              stiffness: 280,
              damping: 14,
              mass: 0.8,
              delay: index * 0.12,
            }"
            class="size-full">
            <img :src="drop.thumb" alt="" class="size-full object-cover" @error="onThumbError">
          </Motion>
        </div>
      </div>
    </div>
  </Teleport>
</template>
