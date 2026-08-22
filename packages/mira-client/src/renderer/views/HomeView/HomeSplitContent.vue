<script setup lang="ts">
import type { TabItem } from '@renderer/composables'
import type { TabViewConfig } from '@renderer/api/TabRegistryAPI'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import HomeSplitPane from './HomeSplitPane.vue'
import type { HomeSplitLayout } from './homeSplitLayout'

const props = defineProps<{
  layout: HomeSplitLayout
  tabs: Array<TabItem | undefined>
  activeTabId?: string
  getViewConfig: (tabId: string) => TabViewConfig | null
}>()

const emit = defineEmits<{
  activate: [paneIndex: number, tabId: string]
}>()

const handleClass = 'z-20 bg-primary/20 hover:bg-primary/50 transition-colors'

function configAt(index: number) {
  const tab = props.tabs[index]
  return tab ? props.getViewConfig(tab.id) : null
}
</script>

<template>
  <HomeSplitPane
    v-if="props.layout === 'single'"
    :pane-index="0"
    :tab="props.tabs[0]"
    :active="true"
    :view-config="configAt(0)"
    @activate="emit('activate', $event, props.tabs[0]!.id)"
  />

  <ResizablePanelGroup
    v-else-if="props.layout === 'two-columns'"
    direction="horizontal"
    auto-save-id="home-tab-split-two-columns"
  >
    <ResizablePanel :default-size="50" :min-size="20">
      <HomeSplitPane :pane-index="0" :tab="props.tabs[0]" :active="props.activeTabId === props.tabs[0]?.id" :view-config="configAt(0)" @activate="emit('activate', $event, props.tabs[0]!.id)" />
    </ResizablePanel>
    <ResizableHandle :class="handleClass" />
    <ResizablePanel :default-size="50" :min-size="20">
      <HomeSplitPane :pane-index="1" :tab="props.tabs[1]" :active="props.activeTabId === props.tabs[1]?.id" :view-config="configAt(1)" @activate="emit('activate', $event, props.tabs[1]!.id)" />
    </ResizablePanel>
  </ResizablePanelGroup>

  <ResizablePanelGroup
    v-else-if="props.layout === 'three-columns'"
    direction="horizontal"
    auto-save-id="home-tab-split-three-columns"
  >
    <template v-for="index in 3" :key="index">
      <ResizableHandle v-if="index > 1" :class="handleClass" />
      <ResizablePanel :default-size="100 / 3" :min-size="15">
        <HomeSplitPane :pane-index="index - 1" :tab="props.tabs[index - 1]" :active="props.activeTabId === props.tabs[index - 1]?.id" :view-config="configAt(index - 1)" @activate="emit('activate', $event, props.tabs[index - 1]!.id)" />
      </ResizablePanel>
    </template>
  </ResizablePanelGroup>

  <ResizablePanelGroup
    v-else-if="props.layout === 'three-rows'"
    direction="vertical"
    auto-save-id="home-tab-split-three-rows"
  >
    <template v-for="index in 3" :key="index">
      <ResizableHandle v-if="index > 1" :class="handleClass" />
      <ResizablePanel :default-size="100 / 3" :min-size="15">
        <HomeSplitPane :pane-index="index - 1" :tab="props.tabs[index - 1]" :active="props.activeTabId === props.tabs[index - 1]?.id" :view-config="configAt(index - 1)" @activate="emit('activate', $event, props.tabs[index - 1]!.id)" />
      </ResizablePanel>
    </template>
  </ResizablePanelGroup>

  <ResizablePanelGroup
    v-else
    direction="vertical"
    auto-save-id="home-tab-split-four-grid-rows"
  >
    <template v-for="row in 2" :key="row">
      <ResizableHandle v-if="row > 1" :class="handleClass" />
      <ResizablePanel :default-size="50" :min-size="20">
        <ResizablePanelGroup direction="horizontal" :auto-save-id="`home-tab-split-four-grid-row-${row}`">
          <template v-for="column in 2" :key="column">
            <ResizableHandle v-if="column > 1" :class="handleClass" />
            <ResizablePanel :default-size="50" :min-size="20">
              <HomeSplitPane
                :pane-index="(row - 1) * 2 + column - 1"
                :tab="props.tabs[(row - 1) * 2 + column - 1]"
                :active="props.activeTabId === props.tabs[(row - 1) * 2 + column - 1]?.id"
                :view-config="configAt((row - 1) * 2 + column - 1)"
                @activate="emit('activate', $event, props.tabs[(row - 1) * 2 + column - 1]!.id)"
              />
            </ResizablePanel>
          </template>
        </ResizablePanelGroup>
      </ResizablePanel>
    </template>
  </ResizablePanelGroup>
</template>
