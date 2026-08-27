<template>
  <div v-if="shouldRenderCustom" ref="customContainer" :class="imgClass" />
  <img
    v-else-if="currentSrc && !hasError && preload"
    :src="currentSrc"
    :alt="alt"
    :class="[bare ? '' : 'border border-border', imgClass]"
    @load="onLoad"
    @error="onError"
  />
  <img
    v-else-if="currentSrc && !hasError"
    v-lazy="currentSrc"
    :alt="alt"
    :class="[bare ? '' : 'border border-border', imgClass]"
    @load="onLoad"
    @error="onError"
  />
  <slot v-else name="fallback">
    <div :class="['flex items-center justify-center', imgClass]">
      <img v-if="extIconUrl" :src="extIconUrl"
        :class="['object-contain opacity-60 w-full h-full', bare ? '' : 'p-5']" />
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
import { miraEventBus } from '@renderer/services/EventBus'

const props = withDefaults(defineProps<{
  fileId: string
  src: string
  filename?: string
  alt?: string
  imgClass?: string
  iconSize?: string
  /** 直接加载图片，供上层在进入预加载区时使用。 */
  preload?: boolean
  /** 移除 img 自带的 border 边框（如紧密瀑布流仅需外层描边时使用） */
  bare?: boolean
  file?: FileInfo
}>(), {
  alt: '',
  imgClass: '',
  iconSize: '2rem',
  preload: false,
  bare: false
})

function resolveThumbnailSource(src: string): string {
  return toFileUrl(src) || src
}

const emit = defineEmits<{
  (e: 'load'): void
  (e: 'error'): void
}>()

const currentSrc = ref(resolveThumbnailSource(props.src))
const hasError = ref(false)

const fallbackIcon = computed(() => getFileTypeIcon(props.filename || ''))
const extIconUrl = computed(() => getExtIconUrl(props.filename || ''))
const customContainer = ref<HTMLElement | null>(null)
let customCleanup: (() => void) | void
const customFormat = computed(() => props.file ? getPluginFileFormat(props.file) : undefined)
const shouldRenderCustom = computed(() => Boolean(customFormat.value?.renderThumbnail))

watch(() => props.src, (src) => {
  currentSrc.value = resolveThumbnailSource(src)
  hasError.value = false
})

function onThumbnailUpdate({ fileId, thumbPath }: { fileId: string; thumbPath: string }) {
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
  miraEventBus.on('thumbnail-updated', onThumbnailUpdate)
  renderCustomThumbnail()
})
onUnmounted(() => {
  miraEventBus.off('thumbnail-updated', onThumbnailUpdate)
  if (customCleanup) customCleanup()
})
</script>
