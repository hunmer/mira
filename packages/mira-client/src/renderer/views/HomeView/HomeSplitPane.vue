<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TabViewRenderer from '@renderer/components/common/TabViewRenderer.vue'
import { useTabs, type TabItem } from '@renderer/composables'
import type { TabViewConfig } from '@renderer/api/TabRegistryAPI'

const props = defineProps<{
  paneIndex: number
  tab?: TabItem
  active: boolean
  viewConfig?: TabViewConfig | null
  getViewConfig: (tabId: string) => TabViewConfig | null
}>()

const emit = defineEmits<{
  activate: [paneIndex: number, tabId: string]
}>()

const { tabs } = useTabs()
const cachedTabIds = ref<string[]>([])

watch(() => props.tab?.id, (tabId) => {
  if (tabId && !cachedTabIds.value.includes(tabId)) cachedTabIds.value.push(tabId)
}, { immediate: true })

watch(() => tabs.value.map(tab => tab.id), (tabIds) => {
  cachedTabIds.value = cachedTabIds.value.filter(tabId => tabIds.includes(tabId))
})

const cachedTabs = computed(() => cachedTabIds.value
  .map(tabId => tabs.value.find(tab => tab.id === tabId))
  .filter((tab): tab is TabItem => Boolean(tab)))

function configForTab(tabId: string) {
  return tabId === props.tab?.id ? props.viewConfig : props.getViewConfig(tabId)
}

function activate() {
  if (props.tab) emit('activate', props.paneIndex, props.tab.id)
}
</script>

<template>
  <div
    class="relative h-full min-h-0 min-w-0 overflow-hidden bg-background/20"
    :class="props.active && props.tab ? 'ring-1 ring-inset ring-primary/40' : ''"
  >
    <TabViewRenderer
      v-for="cachedTab in cachedTabs"
      :key="cachedTab.id"
      v-show="cachedTab.id === props.tab?.id"
      :tab-id="cachedTab.id"
      :view-config="configForTab(cachedTab.id)"
      :cacheable="true"
      class="h-full w-full"
    />

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
