<script setup lang="ts">
import { ref } from 'vue'
import type * as THREE from 'three'
import { useAnimations } from '@tresjs/cientos'

/**
 * 在 TresCanvas 内部包裹模型根，挂载 useAnimations。
 * 加载完成时把 actions 通过事件抛给父级（App），供左栏动画列表控制。
 * 注：父级用 v-if="modelRoot" 保证挂载时 model 已就绪。
 */
const props = defineProps<{ model: THREE.Object3D }>()
const emit = defineEmits<{ ready: [actions: Record<string, THREE.AnimationAction | undefined>] }>()

const rootRef = ref<THREE.Object3D | null>(null)

const clips: THREE.AnimationClip[] = (props.model as any).animations || []
if (clips.length) {
  const { actions } = useAnimations(clips, rootRef as any)
  // 下一帧 model 挂载后通知
  queueMicrotask(() => emit('ready', actions as any))
}
</script>

<template>
  <primitive ref="rootRef" :object="model" />
</template>
