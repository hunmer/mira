<template>
  <aside class="flex-1 min-h-0 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_var(--shadow-primary-md)] overflow-hidden flex flex-col">
    <Tabs v-model="activeTab" class="flex-1 min-h-0 flex flex-col gap-0">
      <TabsContent v-for="tab in tabs" :key="tab.id" :value="tab.id" class="detail-tab-panel flex-1 min-h-0 overflow-y-auto p-4">
        <template v-if="visitedTabs.has(tab.id)">
        <component :is="tab.component" :item="item" :items="currentItems" :library-id="libraryId" :sortable="true" v-bind="tab.props" />
        </template>
      </TabsContent>
      <TabsList class="shrink-0 h-9 w-full flex rounded-none border-t border-border/60 bg-transparent p-0">
        <LayoutGroup id="detail-sidebar-tabs">
          <TabsTrigger v-for="tab in tabs" :key="tab.id" :value="tab.id" :title="tab.label" class="relative flex-1 items-center justify-center gap-1 rounded-md border-0 text-xs text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none">
            <!-- 激活态背景：共享 layoutId，切换 tab 时由 motion-v 在按钮间平滑滑动 -->
            <Motion v-if="activeTab === tab.id" layoutId="detail-sidebar-active-tab" :transition="{ type: 'spring', stiffness: 400, damping: 32 }" class="absolute inset-0 z-0 rounded-md bg-primary/10" />
            <span class="relative z-[1] material-icons text-sm">{{ tab.icon }}</span>
          </TabsTrigger>
        </LayoutGroup>
      </TabsList>
    </Tabs>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Motion, LayoutGroup } from 'motion-v'
import type { FileInfo } from '../../../shared/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { DetailSidebarTab } from './detailSidebarRegistry'

const props = defineProps<{ item?: FileInfo; items?: FileInfo[]; libraryId: string; tabs: DetailSidebarTab[] }>()
const activeTab = ref(props.tabs[0]?.id || '')
const visitedTabs = ref(new Set(props.tabs[0]?.id ? [props.tabs[0].id] : []))
const currentItems = ref<FileInfo[]>([])
watch(activeTab, value => { if (value) visitedTabs.value.add(value) })
watch(() => props.tabs, value => {
  if (!value.some(tab => tab.id === activeTab.value)) activeTab.value = value[0]?.id || ''
  visitedTabs.value.forEach(id => { if (!value.some(tab => tab.id === id)) visitedTabs.value.delete(id) })
}, { deep: true })
watch(() => [props.item, props.items], async () => {
  currentItems.value = props.items?.length ? props.items : (props.item ? [props.item] : [])
  const context = { item: props.item, items: currentItems.value, libraryId: props.libraryId }
  await Promise.all(props.tabs.map(tab => tab.onFilesChange?.(context)))
}, { immediate: true, deep: true })
</script>

<style scoped>
/* 切换 tab 内容渐显动画 */
.detail-tab-panel {
  animation: tab-panel-in 0.2s ease;
}
@keyframes tab-panel-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
