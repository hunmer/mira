<template>
  <MediaGridComponent
    :items="items"
    :selected-items="selectedItems"
    :card-size="cardSize"
    :columns-per-row="columnsPerRow"
    @media-click="$emit('media-click', $event)"
    @media-double-click="$emit('media-double-click', $event)"
    @media-select="handleMediaSelect"
    @media-context-menu="handleContextMenu"
    @media-info="$emit('media-info', $event)"
    @media-set-folder="$emit('media-set-folder', $event)"
    @media-set-tags="$emit('media-set-tags', $event)"
    @media-delete="$emit('media-delete', $event)"
  />
</template>

<script setup lang="ts">
import MediaGridComponent from './MediaGridComponent/MediaGridComponent.vue'
import type { FileInfo } from '../../../shared/types'

interface Props {
  items: FileInfo[]
  selectedItems: string[]
  cardSize: 'small' | 'medium' | 'large'
  columnsPerRow?: number
}

interface Emits {
  (e: 'media-click', item: FileInfo): void
  (e: 'media-double-click', item: FileInfo): void
  (e: 'media-select', item: FileInfo, selected: boolean): void
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-delete', item: FileInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  columnsPerRow: 4
})
const emit = defineEmits<Emits>()

const handleMediaSelect = (item: FileInfo, selected: boolean) => {
  emit('media-select', item, selected)
}

const handleContextMenu = (item: FileInfo, event: MouseEvent) => {
  emit('media-context-menu', item, event)
}
</script>
