<template>
  <img
    v-if="currentSrc && !hasError"
    v-lazy="currentSrc"
    :alt="alt"
    :class="imgClass"
    @load="onLoad"
    @error="onError"
  />
  <slot v-else name="fallback" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  fileId: string
  src: string
  alt?: string
  imgClass?: string
}>(), {
  alt: '',
  imgClass: ''
})

const emit = defineEmits<{
  (e: 'load'): void
  (e: 'error'): void
}>()

const currentSrc = ref(props.src)
const hasError = ref(false)

function toFileUrl(path: string): string {
  if (!path) return ''
  if (/^(https?|file):/.test(path)) return path
  const normalized = path.replace(/\\/g, '/')
  if (/^[a-zA-Z]:/.test(normalized)) return `file:///${normalized}`
  if (normalized.startsWith('//')) return `file:${normalized}`
  return `file://${normalized}`
}

watch(() => props.src, (src) => {
  currentSrc.value = src
  hasError.value = false
})

function onThumbnailUpdate(event: Event) {
  const { fileId, thumbPath } = (event as CustomEvent).detail
  if (fileId === props.fileId && thumbPath) {
    const url = toFileUrl(thumbPath)
    currentSrc.value = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    hasError.value = false
  }
}

function onLoad() { emit('load') }
function onError() { hasError.value = true; emit('error') }

onMounted(() => window.addEventListener('thumbnail-updated', onThumbnailUpdate))
onUnmounted(() => window.removeEventListener('thumbnail-updated', onThumbnailUpdate))
</script>
