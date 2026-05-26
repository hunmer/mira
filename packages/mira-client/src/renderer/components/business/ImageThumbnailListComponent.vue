<template>
  <div class="w-28 flex-shrink-0 bg-white p-2 flex flex-col items-center border-r border-gray-200">
    <div class="flex-grow space-y-3 overflow-y-auto pr-1">
      <img
        v-for="image in images"
        :key="image.id"
        v-memo="[image.id === currentImageId, image.thumbnailPath, image.url, cacheKey]"
        :alt="image.name"
        :class="[
          'h-24 w-24 cursor-pointer rounded-lg border-2 object-cover',
          image.id === currentImageId
            ? 'border-blue-500'
            : 'border-transparent hover:border-gray-300'
        ]"
        :src="getImageSrc(image)"
        @click="handleImageSelect(image)"
        loading="lazy"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { FileInfo } from '../../../shared/types'
import { getPreviewImageSource, toCacheBustedFileUrl } from '../../utils/fileUtils'

interface Props {
  images: FileInfo[]
  currentImageId: string
  cacheKey?: string | number
}

interface Emits {
  (e: 'image-select', imageId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const getImageSrc = (image: FileInfo): string | undefined => {
  return toCacheBustedFileUrl(image.thumbnailPath || image.url, props.cacheKey)
}

watch(
  () => [props.currentImageId, props.cacheKey, props.images.length] as const,
  ([currentImageId, cacheKey, imageCount]) => {
    const currentImage = props.images.find((image) => image.id === currentImageId)

    console.debug('[ImagePreviewDebug][ThumbnailList] props-change', {
      currentImageId,
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

const handleImageSelect = (image: FileInfo): void => {
  console.debug('[ImagePreviewDebug][ThumbnailList] click', {
    clickedImageId: image.id,
    currentImageId: props.currentImageId,
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

  emit('image-select', image.id)
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
