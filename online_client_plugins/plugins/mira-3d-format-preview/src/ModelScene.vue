<script setup lang="ts">
import { toRef, watch } from 'vue'
import type * as THREE from 'three'
import { useGLTF } from '@tresjs/cientos'
import { collectScene, store } from '@/composables/useViewerStore'

/**
 * 仅负责加载 GLTF 并把结果通过事件抛出（渲染交给父级 ModelRig，以便挂载动画）。
 *
 * cientos v5 的 useGLTF 基于 useAsyncState，返回 { state, isLoading, execute, nodes, materials }，
 * **没有 error 字段**（旧 v4 文档里的 error 已不存在）。
 * 这里用 isLoading + state 推断成功/失败，并用 execute().catch() 兜底。
 */
const props = defineProps<{ path: string }>()
const emit = defineEmits<{
  loaded: [model: unknown]
  error: [error: unknown]
}>()

const pathRef = toRef(props, 'path')
const { state, isLoading, execute } = useGLTF(pathRef, { draco: true }) as any

watch(isLoading, (v) => {
  store.isLoading = !!v
}, { immediate: true })

execute().catch((err: unknown) => {
  store.isLoading = false
  store.loadError = err instanceof Error ? err.message : String(err)
  emit('error', err)
})

watch(
  state,
  (model) => {
    if (!model?.scene) return
    store.loadError = ''
    store.isLoading = false
    collectScene(model.scene as THREE.Object3D, model.animations)
    emit('loaded', model)
  },
  { immediate: true },
)
</script>

<template>
  <!-- 仅加载，不渲染；模型根由父级 ModelRig 渲染 -->
</template>
