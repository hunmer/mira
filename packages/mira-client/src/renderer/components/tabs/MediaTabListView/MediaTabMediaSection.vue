<script setup lang="ts">
import { ref } from 'vue'
import MediaGridComponent from '@renderer/components/business/MediaGridComponent.vue'
import MediaListComponent from '@renderer/components/business/MediaListComponent.vue'
import WaterfallComponent from '@renderer/components/business/WaterfallComponent.vue'
import ImportDropdown from '@renderer/views/HomeView/ImportDropdown.vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import { ChapterScrubber } from '@/components/ui/chapter-scrubber'
import type { Chapter } from '@/components/ui/chapter-scrubber'
import type { FileInfo } from '@/shared/types'
import type { MediaGroupingMode } from '@renderer/composables/LibraryPrefs'
import type { ImportFolderPayload, ImportTarget } from '@renderer/composables/useImportHandler'

/**
 * 媒体区块：分组导航 + 网格/列表/瀑布流三种视图 + 分组章节导航
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变；视图切换后的瀑布流刷新通过 expose 暴露给外壳。
 */
defineProps<{
  totalCount: number
  groupingOptions: Array<{ value: MediaGroupingMode; label: string }>
  groupingMode: MediaGroupingMode
  groupChapters: Chapter[]
  mediaGroups: Array<{ key: string; label: string; items: FileInfo[] }>
  viewMode: string
  selectedItems: string[]
  cardSize: 'small' | 'medium' | 'large'
  columnsPerRow: number
  dynamicColumnWidth: number
  compactWaterfall: boolean
  isTrash: boolean
  importTarget: ImportTarget
}>()

const emit = defineEmits<{
  groupingChange: [mode: MediaGroupingMode]
  chapterSelect: [chapter: Chapter, index: number]
  upload: []
  importFolder: [payload: ImportFolderPayload]
  mediaClick: [item: FileInfo, event?: MouseEvent]
  mediaDoubleClick: [item: FileInfo]
  mediaSelect: [item: FileInfo, selected: boolean, event?: MouseEvent]
  mediaContextMenu: [item: FileInfo, event: MouseEvent]
  mediaInfo: [item: FileInfo]
  mediaSetFolder: [item: FileInfo]
  mediaSetTags: [item: FileInfo]
  mediaDelete: [item: FileInfo]
  mediaRestore: [item: FileInfo]
}>()

const waterfallRef = ref<InstanceType<typeof WaterfallComponent> | InstanceType<typeof WaterfallComponent>[] | null>(null)

// 供外壳在视图切换为瀑布流后刷新布局
const refreshWaterfalls = () => {
  const waterfalls = Array.isArray(waterfallRef.value) ? waterfallRef.value : [waterfallRef.value]
  waterfalls.forEach(instance => instance?.refresh())
}

defineExpose({ refreshWaterfalls })
</script>

<template>
  <div>
    <header class="flex items-center justify-between px-5 pt-3 pb-1">
      <h3 class="text-sm font-medium text-foreground">{{ $t('views.sidebarModuleList.media') }}</h3>
      <div class="flex items-center gap-2">
        <span
          class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{
            totalCount }}</span>
        <!-- 素材分组下拉菜单 -->
        <Dropdown :offset="{ x: 0, y: 4 }" placement="bottom-start">
          <template #trigger>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-white/60 bg-white/40 p-0 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-white/60 hover:text-primary dark:border-border dark:bg-muted/60 dark:hover:bg-muted"
              :title="groupingOptions.find(option => option.value === groupingMode)?.label">
              <span class="material-icons text-sm">view_agenda</span>
            </button>
          </template>
          <template #content="{ close }">
            <div class="min-w-[150px] py-1">
              <button v-for="option in groupingOptions" :key="option.value"
                :class="['w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 transition-colors', groupingMode === option.value ? 'bg-primary/10 text-primary' : 'text-foreground dark:text-muted-foreground']"
                @click="emit('groupingChange', option.value); close()">
                <span>{{ option.label }}</span>
                <span v-if="groupingMode === option.value"
                  class="material-icons ml-auto text-sm text-primary">check</span>
              </button>
            </div>
          </template>
        </Dropdown>
        <ImportDropdown :target="importTarget" @upload="emit('upload')"
          @import-folder="payload => emit('importFolder', payload)" />
      </div>
    </header>

    <!-- 分组章节导航：滚动时固定在视图右上角 -->
    <div v-if="groupingMode !== 'none' && groupChapters.length > 0"
      class="sticky top-2 z-20 flex h-0 justify-end px-5 pointer-events-none">
      <div class="pointer-events-auto px-1 py-2">
        <ChapterScrubber :chapters="groupChapters" side="left" :row-height="12" :peak-length="42"
          :label="$t('tabs.mediaTabListView.groupNavigation')"
          @select="(chapter, index) => emit('chapterSelect', chapter, index)" />
      </div>
    </div>

    <section v-for="(group, groupIndex) in mediaGroups" :key="group.key" class="mb-3"
      :data-media-group-index="groupIndex">
      <header v-if="groupingMode !== 'none'"
        class="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-5 pt-3 pb-1 backdrop-blur-sm">
        <h4 class="text-sm font-medium text-foreground">{{ group.label }}</h4>
        <span
          class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{
            group.items.length }}</span>
      </header>

      <!-- 网格视图 -->
      <MediaGridComponent v-if="viewMode === 'grid'" :key="`grid-${viewMode}-${group.key}`" class="p-5"
        :items="group.items" :selected-items="selectedItems" :card-size="cardSize"
        :columns-per-row="columnsPerRow" :is-trash="isTrash" @media-click="item => emit('mediaClick', item)"
        @media-double-click="item => emit('mediaDoubleClick', item)"
        @media-select="(item, selected, event) => emit('mediaSelect', item, selected, event)"
        @media-context-menu="(item, event) => emit('mediaContextMenu', item, event)"
        @media-info="item => emit('mediaInfo', item)" @media-set-folder="item => emit('mediaSetFolder', item)"
        @media-set-tags="item => emit('mediaSetTags', item)" @media-delete="item => emit('mediaDelete', item)"
        @media-restore="(item: FileInfo) => emit('mediaRestore', item)" />

      <!-- 列表视图 -->
      <MediaListComponent v-if="viewMode === 'list'" :key="`list-${viewMode}-${group.key}`" class="p-5"
        :items="group.items" :selected-items="selectedItems" :is-trash="isTrash"
        @click="(item: FileInfo, event: MouseEvent) => emit('mediaClick', item, event)" @dblclick="item => emit('mediaDoubleClick', item)"
        @media-context-menu="(item, event) => emit('mediaContextMenu', item, event)"
        @media-info="item => emit('mediaInfo', item)" @media-set-folder="item => emit('mediaSetFolder', item)"
        @media-set-tags="item => emit('mediaSetTags', item)"
        @media-select="(item, selected, event) => emit('mediaSelect', item, selected, event)"
        @media-delete="item => emit('mediaDelete', item)" @media-restore="item => emit('mediaRestore', item)" />

      <!-- 瀑布流视图 -->
      <div v-if="viewMode === 'waterfall'" class="w-full">
        <WaterfallComponent ref="waterfallRef" :key="`waterfall-${viewMode}-${group.key}`" class="p-5"
          :items="group.items" :selected-items="selectedItems" :is-trash="isTrash"
          :column-width="dynamicColumnWidth" :columns-per-row="columnsPerRow"
          :gap="compactWaterfall ? 0 : 16" :compact="compactWaterfall"
          :debug-label="`${groupIndex}:${group.label}`"
          :lazyload="groupingMode === 'none'"
          :enter-animation="groupingMode === 'none'" :layout-transition="groupingMode === 'none'"
          @click="item => emit('mediaClick', item)" @dblclick="item => emit('mediaDoubleClick', item)"
          @media-context-menu="(item, event) => emit('mediaContextMenu', item, event)"
          @media-info="item => emit('mediaInfo', item)" @media-set-folder="item => emit('mediaSetFolder', item)"
          @media-set-tags="item => emit('mediaSetTags', item)"
          @media-select="(item, selected, event) => emit('mediaSelect', item, selected, event)"
          @media-delete="item => emit('mediaDelete', item)" @media-restore="item => emit('mediaRestore', item)" />
      </div>
    </section>

    <!-- 如果没有匹配的视图模式 -->
    <div v-if="!['grid', 'list', 'waterfall'].includes(viewMode)"
      class="flex items-center justify-center h-40 text-muted-foreground dark:text-muted-foreground">
      {{ $t('tabs.mediaTabListView.unknownViewMode', { mode: viewMode }) }}
    </div>
  </div>
</template>

<style scoped>
.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}

.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
