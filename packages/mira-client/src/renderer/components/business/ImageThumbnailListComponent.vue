<template>
  <div class="w-28 flex-shrink-0 bg-background p-2 flex flex-col items-center border-r border-border">
    <div class="flex-grow space-y-3 overflow-y-auto pr-1">
      <div
        v-for="(image, index) in images"
        :key="image.id"
        :class="[
          'w-24 h-24 cursor-pointer rounded-lg border-2 flex items-center justify-center overflow-hidden',
          index === currentImageIndex
            ? 'border-primary'
            : 'border-transparent hover:border-border'
        ]"
        @click="handleImageSelect(index, image)"
      >
        <img
          v-if="!failedImageIds.has(image.id)"
          :alt="image.name"
          class="max-h-full max-w-full object-contain"
          :src="getImageSrc(image)"
          @load="handleImageLoad(image.id)"
          @error="handleImageError(image.id)"
          loading="lazy"
        />
        <StatusImage v-else name="load_failed" size="medium" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FileInfo } from '../../../shared/types'
import { getPreviewImageSource, toCacheBustedFileUrl } from '../../utils/fileUtils'
import StatusImage from '@renderer/components/common/StatusImage.vue'

interface Props {
  images: FileInfo[]
  currentImageIndex: number
  cacheKey?: string | number
}

interface Emits {
  (e: 'image-select', imageIndex: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const failedImageIds = ref(new Set<string>())

const getImageSrc = (image: FileInfo): string | undefined => {
  return toCacheBustedFileUrl(image.thumbnailPath || image.url, props.cacheKey)
}

const handleImageLoad = (imageId: string): void => {
  if (failedImageIds.value.has(imageId)) {
    const nextFailedImageIds = new Set(failedImageIds.value)
    nextFailedImageIds.delete(imageId)
    failedImageIds.value = nextFailedImageIds
  }
}

const handleImageError = (imageId: string): void => {
  const nextFailedImageIds = new Set(failedImageIds.value)
  nextFailedImageIds.add(imageId)
  failedImageIds.value = nextFailedImageIds
}

watch(
  () => [props.currentImageIndex, props.cacheKey, props.images.length] as const,
  ([currentImageIndex, cacheKey, imageCount]) => {
    const currentImage = props.images[currentImageIndex]

      currentImageIndex,
      currentImageId: currentImage?.id,
      cacheKey,
      imageCount,
      currentImage: currentImage
        ? {
            id: currentImage.id,
            name: currentImage.name,
            localFile: currentImage.localFile,
            path: currentImage.path,
            url: currentImage.url,
            thumbnailPath: currentImage.thumbnailPath,
            previewSource: getPreviewImageSource(currentImage),
            updatedAt: currentImage.updatedAt
          }
        : null,
      currentThumbnailSrc: currentImage ? getImageSrc(currentImage) : undefined
    })
  },
  { immediate: true }
)

watch(() => props.cacheKey, () => {
  failedImageIds.value = new Set()
})

const handleImageSelect = (imageIndex: number, image: FileInfo): void => {
    clickedImageIndex: imageIndex,
    clickedImageId: image.id,
    currentImageIndex: props.currentImageIndex,
    currentImageId: props.images[props.currentImageIndex]?.id,
    cacheKey: props.cacheKey,
    image: {
      id: image.id,
      name: image.name,
      localFile: image.localFile,
      path: image.path,
      url: image.url,
      thumbnailPath: image.thumbnailPath,
      previewSource: getPreviewImageSource(image),
      updatedAt: image.updatedAt
    },
    thumbnailSrc: getImageSrc(image)
  })

  emit('image-select', imageIndex)
}
</script>

<style scoped>
/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
