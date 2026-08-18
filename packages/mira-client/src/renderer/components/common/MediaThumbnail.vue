<template>
  <div v-if="shouldRenderCustom" ref="customContainer" :class="imgClass" />
  <img
    v-else-if="currentSrc && !hasError && preload"
    :src="currentSrc"
    :alt="alt"
    class="border border-border"
    :class="imgClass"
    @load="onLoad"
    @error="onError"
  />
  <img
    v-else-if="currentSrc && !hasError"
    v-lazy="currentSrc"
    :alt="alt"
    class="border border-border"
    :class="imgClass"
    @load="onLoad"
    @error="onError"
  />
  <slot v-else name="fallback">
    <div :class="['flex items-center justify-center', imgClass]">
      <img v-if="extIconUrl" :src="extIconUrl" class="object-contain opacity-60 w-full h-full p-5" />
      <span v-else class="material-icons text-muted-foreground" :style="{ fontSize: iconSize }">{{ fallbackIcon }}</span>
    </div>
  </slot>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getFileTypeIcon, toFileUrl } from '@renderer/utils/fileUtils'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'
import type { FileInfo } from '../../../shared/types'
import { getPluginFileFormat } from '@renderer/plugins/instanceManager'

const props = withDefaults(defineProps<{
  fileId: string
  src: string
  filename?: string
  alt?: string
  imgClass?: string
  iconSize?: string
  /** 直接加载图片，供上层在进入预加载区时使用。 */
  preload?: boolean
  file?: FileInfo
}>(), {
  alt: '',
  imgClass: '',
  iconSize: '2rem',
  preload: false
})

const emit = defineEmits<{
  (e: 'load'): void
  (e: 'error'): void
}>()

const currentSrc = ref(props.src)
const hasError = ref(false)

const fallbackIcon = computed(() => getFileTypeIcon(props.filename || ''))
const extIconUrl = computed(() => getExtIconUrl(props.filename || ''))
const customContainer = ref<HTMLElement | null>(null)
let customCleanup: (() => void) | void
const customFormat = computed(() => props.file ? getPluginFileFormat(props.file) : undefined)
const shouldRenderCustom = computed(() => Boolean(customFormat.value?.renderThumbnail))

watch(() => props.src, (src) => {
  currentSrc.value = src
  hasError.value = false
})

function onThumbnailUpdate(event: Event) {
  const { fileId, thumbPath } = (event as CustomEvent).detail
  if (fileId === props.fileId && thumbPath) {
    const url = toFileUrl(thumbPath)
    if (!url) return
    currentSrc.value = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    hasError.value = false
  }
}

function onLoad() { emit('load') }
function onError() {
  hasError.value = true
  emit('error')
}

function renderCustomThumbnail() {
  if (customCleanup) customCleanup()
  customCleanup = undefined
  if (!customContainer.value || !customFormat.value?.renderThumbnail || !props.file) return
  customContainer.value.replaceChildren()
  try {
    customCleanup = customFormat.value.renderThumbnail(customContainer.value, props.file)
  } catch (error) {
    console.error('Plugin thumbnail renderer failed:', error)
  }
}

watch(shouldRenderCustom, async (enabled) => {
  if (!enabled) {
    if (customCleanup) customCleanup()
    customCleanup = undefined
    return
  }
  await nextTick()
  renderCustomThumbnail()
})

onMounted(() => {
  window.addEventListener('thumbnail-updated', onThumbnailUpdate)
  renderCustomThumbnail()
})
onUnmounted(() => {
  window.removeEventListener('thumbnail-updated', onThumbnailUpdate)
  if (customCleanup) customCleanup()
})
</script>
