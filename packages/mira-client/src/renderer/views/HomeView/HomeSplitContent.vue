<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import TabViewRenderer from '@renderer/components/common/TabViewRenderer.vue'
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
  visitedTabs: TabItem[]
  activeTabId?: string
  getViewConfig: (tabId: string) => TabViewConfig | null
}>()

const emit = defineEmits<{
  activate: [paneIndex: number, tabId: string]
}>()

// 不改变分隔线占用尺寸，只扩大伪元素的 pointer hit area；拖动时指针轻微偏移也能继续抓住 handle。
const handleClass = [
  'relative z-50 bg-primary/20 hover:bg-primary/50 transition-colors',
  'after:pointer-events-auto after:transition-[width,height] after:duration-150',
  'after:w-2 hover:after:w-5',
  'data-[orientation=vertical]:after:h-2 data-[orientation=vertical]:hover:after:h-5',
].join(' ')
const rootRef = ref<HTMLElement>()
const paneRects = ref<Record<string, CSSProperties>>({})
let resizeObserver: ResizeObserver | undefined

function configAt(index: number) {
  const tab = props.tabs[index]
  return tab ? props.getViewConfig(tab.id) : null
}

function refreshPaneRects() {
  nextTick(() => {
    const root = rootRef.value
    if (!root) return
    const rootRect = root.getBoundingClientRect()
    const next: Record<string, CSSProperties> = {}
    props.tabs.forEach((tab, index) => {
      if (!tab) return
      const target = document.getElementById(`home-split-pane-${props.layout}-${index}`)
      if (!target) return
      const rect = target.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      next[tab.id] = {
        left: `${rect.left - rootRect.left}px`,
        top: `${rect.top - rootRect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }
    })
    paneRects.value = next
  })
}

function setupResizeObserver() {
  resizeObserver?.disconnect()
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(refreshPaneRects)
  if (rootRef.value) resizeObserver.observe(rootRef.value)
  props.tabs.forEach((_tab, index) => {
    const target = document.getElementById(`home-split-pane-${props.layout}-${index}`)
    if (target) resizeObserver?.observe(target)
  })
}

function activateTab(tabId: string) {
  const paneIndex = props.tabs.findIndex(tab => tab?.id === tabId)
  if (paneIndex >= 0) emit('activate', paneIndex, tabId)
}

watch(
  [() => props.layout, () => props.tabs.map(tab => tab?.id).join('|'), () => props.visitedTabs.map(tab => tab.id).join('|')],
  () => {
    refreshPaneRects()
    nextTick(setupResizeObserver)
  },
  { immediate: true, flush: 'post' }
)

onMounted(() => setupResizeObserver())
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div ref="rootRef" class="relative h-full w-full min-w-0">
  <HomeSplitPane
    v-show="props.layout === 'single'"
    :pane-index="0"
    target-prefix="single"
    :tab="props.tabs[0]"
    :active="true"
    :view-config="configAt(0)"
    @activate="emit('activate', $event, props.tabs[0]!.id)"
  />

  <ResizablePanelGroup
    v-show="props.layout === 'two-columns'"
    direction="horizontal"
    auto-save-id="home-tab-split-two-columns"
  >
    <ResizablePanel :default-size="50" :min-size="20">
      <HomeSplitPane target-prefix="two-columns" :pane-index="0" :tab="props.tabs[0]" :active="props.activeTabId === props.tabs[0]?.id" :view-config="configAt(0)" @activate="emit('activate', $event, props.tabs[0]!.id)" />
    </ResizablePanel>
    <ResizableHandle with-handle :class="handleClass" />
    <ResizablePanel :default-size="50" :min-size="20">
      <HomeSplitPane target-prefix="two-columns" :pane-index="1" :tab="props.tabs[1]" :active="props.activeTabId === props.tabs[1]?.id" :view-config="configAt(1)" @activate="emit('activate', $event, props.tabs[1]!.id)" />
    </ResizablePanel>
  </ResizablePanelGroup>

  <ResizablePanelGroup
    v-show="props.layout === 'three-columns'"
    direction="horizontal"
    auto-save-id="home-tab-split-three-columns"
  >
    <template v-for="index in 3" :key="index">
      <ResizableHandle v-if="index > 1" with-handle :class="handleClass" />
      <ResizablePanel :default-size="100 / 3" :min-size="15">
        <HomeSplitPane target-prefix="three-columns" :pane-index="index - 1" :tab="props.tabs[index - 1]" :active="props.activeTabId === props.tabs[index - 1]?.id" :view-config="configAt(index - 1)" @activate="emit('activate', $event, props.tabs[index - 1]!.id)" />
      </ResizablePanel>
    </template>
  </ResizablePanelGroup>

  <ResizablePanelGroup
    v-show="props.layout === 'three-rows'"
    direction="vertical"
    auto-save-id="home-tab-split-three-rows"
  >
    <template v-for="index in 3" :key="index">
      <ResizableHandle v-if="index > 1" with-handle :class="handleClass" />
      <ResizablePanel :default-size="100 / 3" :min-size="15">
        <HomeSplitPane target-prefix="three-rows" :pane-index="index - 1" :tab="props.tabs[index - 1]" :active="props.activeTabId === props.tabs[index - 1]?.id" :view-config="configAt(index - 1)" @activate="emit('activate', $event, props.tabs[index - 1]!.id)" />
      </ResizablePanel>
    </template>
  </ResizablePanelGroup>

  <ResizablePanelGroup
    v-show="props.layout === 'four-grid'"
    direction="horizontal"
    auto-save-id="home-tab-split-four-grid-columns"
  >
    <ResizablePanel :default-size="50" :min-size="20">
      <ResizablePanelGroup direction="vertical" auto-save-id="home-tab-split-four-grid-left">
        <ResizablePanel :default-size="50" :min-size="20">
          <HomeSplitPane target-prefix="four-grid" :pane-index="0" :tab="props.tabs[0]" :active="props.activeTabId === props.tabs[0]?.id" :view-config="configAt(0)" @activate="emit('activate', $event, props.tabs[0]!.id)" />
        </ResizablePanel>
        <ResizableHandle with-handle :class="handleClass" />
        <ResizablePanel :default-size="50" :min-size="20">
          <HomeSplitPane target-prefix="four-grid" :pane-index="2" :tab="props.tabs[2]" :active="props.activeTabId === props.tabs[2]?.id" :view-config="configAt(2)" @activate="emit('activate', $event, props.tabs[2]!.id)" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>
    <ResizableHandle with-handle :class="handleClass" />
    <ResizablePanel :default-size="50" :min-size="20">
      <ResizablePanelGroup direction="vertical" auto-save-id="home-tab-split-four-grid-right">
        <ResizablePanel :default-size="50" :min-size="20">
          <HomeSplitPane target-prefix="four-grid" :pane-index="1" :tab="props.tabs[1]" :active="props.activeTabId === props.tabs[1]?.id" :view-config="configAt(1)" @activate="emit('activate', $event, props.tabs[1]!.id)" />
        </ResizablePanel>
        <ResizableHandle with-handle :class="handleClass" />
        <ResizablePanel :default-size="50" :min-size="20">
          <HomeSplitPane target-prefix="four-grid" :pane-index="3" :tab="props.tabs[3]" :active="props.activeTabId === props.tabs[3]?.id" :view-config="configAt(3)" @activate="emit('activate', $event, props.tabs[3]!.id)" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>
  </ResizablePanelGroup>

  <!-- renderer 常驻在同一 DOM 层，只随分屏槽位调整坐标，避免 webview 被重新挂载。 -->
  <div class="pointer-events-none absolute inset-0 z-30 overflow-hidden">
    <div
      v-for="tab in props.visitedTabs"
      :key="tab.id"
      class="pointer-events-auto absolute overflow-hidden"
      :style="paneRects[tab.id] || { display: 'none' }"
    >
      <div class="h-full w-full" :class="props.activeTabId === tab.id ? '' : 'grayscale'">
        <TabViewRenderer
          :tab-id="tab.id"
          :view-config="props.getViewConfig(tab.id)"
          :cacheable="true"
          class="h-full w-full"
        />
      </div>
      <button
        v-if="props.activeTabId !== tab.id && props.tabs.some(paneTab => paneTab?.id === tab.id)"
        type="button"
        class="absolute inset-0 z-40 h-full w-full cursor-pointer bg-black/10 dark:bg-black/25"
        :aria-label="tab.label"
        :title="tab.label"
        @click="activateTab(tab.id)"
      />
    </div>
  </div>
  </div>
</template>
