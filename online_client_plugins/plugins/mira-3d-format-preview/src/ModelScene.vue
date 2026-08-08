<script setup lang="ts">
import { toRef, watch } from 'vue'
import { useGLTF } from '@tresjs/cientos'

const props = defineProps<{ path: string }>()
const emit = defineEmits<{
  loaded: [model: unknown]
  error: [error: unknown]
}>()

const pathRef = toRef(props, 'path')
const { state, error } = useGLTF(pathRef, { draco: true }) as any

watch(state, (model) => {
  if (model) emit('loaded', model)
}, { immediate: true })

watch(error, (value) => {
  if (value) emit('error', value)
}, { immediate: true })
</script>

<template>
  <primitive v-if="state?.scene" :object="state.scene" />
</template>
