<script setup lang="ts">
import type { TabItem } from '@renderer/composables'
import type { TabViewConfig } from '@renderer/api/TabRegistryAPI'

const props = defineProps<{
  paneIndex: number
  targetPrefix: string
  tab?: TabItem
  active: boolean
  viewConfig?: TabViewConfig | null
}>()

const emit = defineEmits<{
  activate: [paneIndex: number, tabId: string]
}>()

function activate() {
  if (props.tab) emit('activate', props.paneIndex, props.tab.id)
}
</script>

<template>
  <div class="relative h-full min-h-0 min-w-0 overflow-hidden bg-background/20">
    <div :id="`home-split-pane-${props.targetPrefix}-${props.paneIndex}`" class="h-full w-full" />

    <div v-if="!props.tab" class="flex h-full items-center justify-center text-muted-foreground/25">
      <span class="material-icons text-4xl">tab_unselected</span>
    </div>

    <button
      v-if="props.tab && !props.active"
      type="button"
      class="absolute inset-0 z-40 h-full w-full cursor-pointer bg-black/10 backdrop-grayscale transition-colors hover:bg-black/5 dark:bg-black/25 dark:hover:bg-black/15"
      :aria-label="props.tab.label"
      :title="props.tab.label"
      @click="activate"
    />
  </div>
</template>
