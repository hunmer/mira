<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import type * as THREE from 'three'
import { useAnimations, useGLTF } from '@tresjs/cientos'
import { collectScene, store } from '@/composables/useViewerStore'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()

/**
 * 加载 GLTF 并渲染（primitive）。TresJS v5 的 useGLTF 内部已 watch path，
 * path 变化会自动重载并 dispose 旧 scene，因此无需 :key 重建组件。
 *
 * cientos v5 的 useGLTF 基于 useAsyncState，返回 { state, isLoading, execute, ... }。
 */
const props = defineProps<{ path: string }>()
const emit = defineEmits<{
  loaded: [actions: Record<string, THREE.AnimationAction | undefined>]
  error: [error: unknown]
}>()

const pathRef = toRef(props, 'path')
const gltf = useGLTF(pathRef, { draco: true }) as any
const { state, isLoading } = gltf

// 诊断日志（DEBUG）：定位加载卡点
const DEBUG = true
function dbg(label: string, ...args: any[]) {
  if (DEBUG) console.log('[ModelScene]', label, ...args)
}
dbg('setup, path=', props.path, 'initial state=', state.value, 'isLoading=', isLoading.value)

// 加载态同步到 store
watch(isLoading, (v) => {
  dbg('isLoading →', v)
  store.isLoading = !!v
}, { immediate: true })

// 错误兜底：仅在“真正开始加载后”才判断失败，避免初始空状态误报。
let hasStarted = false
watch(isLoading, (loading) => {
  if (loading) hasStarted = true
})
watch([isLoading, state], ([loading, model]) => {
  dbg('check fail: hasStarted=', hasStarted, 'loading=', loading, 'hasModel=', !!model)
  if (hasStarted && !loading && !model && !store.loadError) {
    store.loadError = t('app.errParse')
    emit('error', store.loadError)
  }
})

// 模型根 ref（primitive），供 useAnimations 挂载；clips 从 state 派生
const rootRef = ref<THREE.Object3D | null>(null)
// 关键：root 未挂载前返回空数组，避免 useAnimations 在 root=null 时调用 clipAction 报错
const clips = computed<THREE.AnimationClip[]>(() =>
  rootRef.value ? (state.value?.animations || []) : [],
)

// 顶层调用（composable 须同步注册）：useAnimations 内部 watch clips 与 modelRef
const { actions } = useAnimations(clips, rootRef as any)

// 成功：state 有值时收集场景数据 + 通知父级
watch(
  state,
  (model) => {
    dbg('state changed, has scene=', !!model?.scene, 'animations=', model?.animations?.length || 0)
    if (!model?.scene) return
    store.loadError = ''
    store.isLoading = false
    collectScene(model.scene as THREE.Object3D, model.animations)
    emit('loaded', actions as any)
  },
  { immediate: true },
)
</script>

<template>
  <primitive v-if="state?.scene" ref="rootRef" :object="state.scene" />
</template>
