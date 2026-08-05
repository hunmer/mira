<template>
  <div class="w-28 flex-shrink-0 bg-white p-2 flex flex-col items-center border-r border-border">
    <div class="flex-grow space-y-3 overflow-y-auto pr-1">
      <img
        v-for="(image, index) in images"
        :key="image.id"
        v-memo="[index === currentImageIndex, image.thumbnailPath, image.url, cacheKey]"
        :alt="image.name"
        :class="[
          'h-24 w-24 cursor-pointer rounded-lg border-2 object-cover',
          index === currentImageIndex
            ? 'border-primary'
            : 'border-transparent hover:border-border'
        ]"
        :src="getImageSrc(image)"
        @click="handleImageSelect(index, image)"
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
  currentImageIndex: number
  cacheKey?: string | number
}

interface Emits {
  (e: 'image-select', imageIndex: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const getImageSrc = (image: FileInfo): string | undefined => {
  return toCacheBustedFileUrl(image.thumbnailPath || image.url, props.cacheKey)
}

watch(
  () => [props.currentImageIndex, props.cacheKey, props.images.length] as const,
  ([currentImageIndex, cacheKey, imageCount]) => {
    const currentImage = props.images[currentImageIndex]

    console.debug('[ImagePreviewDebug][ThumbnailList] props-change', {
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

const handleImageSelect = (imageIndex: number, image: FileInfo): void => {
  console.debug('[ImagePreviewDebug][ThumbnailList] click', {
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
