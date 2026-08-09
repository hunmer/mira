<template>
  <div class="content-toolbar bg-white border-b border-border px-6 py-3">
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
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()

const toolbarGroups = computed((): ToolbarGroup[] => [
  {
    id: 'selection',
    buttons: [
      {
        id: 'select-all',
        icon: 'check_box',
        label: t('layout.contentToolbar.selectAll'),
        variant: 'secondary'
      },
      {
        id: 'select-none',
        icon: 'check_box_outline_blank',
        label: t('layout.contentToolbar.selectNone'),
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
        label: t('layout.contentToolbar.images'),
        variant: 'secondary'
      },
      {
        id: 'filter-videos',
        icon: 'video',
        label: t('layout.contentToolbar.videos'),
        variant: 'secondary'
      }
    ]
  }
])
</script>
