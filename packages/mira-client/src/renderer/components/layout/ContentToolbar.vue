<template>
  <div class="content-toolbar bg-white border-b border-gray-200 px-6 py-3">
    <ToolbarComponent
      :groups="toolbarGroups"
      size="small"
      variant="minimal"
      @button-click="$emit('button-click', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ToolbarComponent } from '../common'
import type { ToolbarGroup } from '../../types/components'

interface Props {
  selectedCount: number
}

interface Emits {
  (e: 'button-click', buttonId: string): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const toolbarGroups = computed((): ToolbarGroup[] => [
  {
    id: 'selection',
    buttons: [
      {
        id: 'select-all',
        icon: 'check_box',
        label: '全选',
        variant: 'secondary'
      },
      {
        id: 'select-none',
        icon: 'check_box_outline_blank',
        label: '取消选择',
        variant: 'secondary',
        disabled: props.selectedCount === 0
      }
    ],
    separator: true
  },
  {
    id: 'filter',
    buttons: [
      {
        id: 'filter-images',
        icon: 'image',
        label: '图片',
        variant: 'secondary'
      },
      {
        id: 'filter-videos',
        icon: 'video',
        label: '视频',
        variant: 'secondary'
      }
    ]
  }
])
</script>
