<template>
  <div class="w-28 flex-shrink-0 bg-white p-2 flex flex-col items-center border-r border-gray-200">
    <div class="flex-grow space-y-3 overflow-y-auto pr-1">
      <img
        v-for="image in images"
        :key="image.id"
        v-memo="[image.id === currentImageId, image.thumbnailPath, image.url]"
        :alt="image.name"
        :class="[
          'h-24 w-24 cursor-pointer rounded-lg border-2 object-cover',
          image.id === currentImageId
            ? 'border-blue-500'
            : 'border-transparent hover:border-gray-300'
        ]"
        :src="image.thumbnailPath || image.url"
        @click="$emit('image-select', image.id)"
        loading="lazy"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileInfo } from '../../../shared/types'

interface Props {
  images: FileInfo[]
  currentImageId: string
}

interface Emits {
  (e: 'image-select', imageId: string): void
}

defineProps<Props>()
defineEmits<Emits>()
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
