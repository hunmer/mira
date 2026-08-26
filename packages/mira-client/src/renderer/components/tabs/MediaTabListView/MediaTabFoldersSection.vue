<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import Folder from '@/components/ui/folder/Folder.vue'
import FolderContextMenu from '@renderer/components/business/FolderContextMenu.vue'
import StatusImage from '@/renderer/components/common/StatusImage.vue'
import type { BrowserItem } from '@renderer/components/business/GroupedCardBrowserDialog.vue'

/**
 * 子文件夹区块：卡片网格、封面、新增入口、拖放上传目标
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变；「超过两行折叠」展示逻辑随迁。
 */
const props = defineProps<{
  items: BrowserItem[]
  availableFolders: any[]
  folderCoverUrls: Record<string, string>
  folderCardUiSize: 'sm' | 'md' | 'lg'
  folderGridItemSize: number
  getFolderColor: (color: unknown) => string | undefined
  canUpload: boolean
}>()

const emit = defineEmits<{
  addFolder: []
  select: [folder: any, event?: MouseEvent | KeyboardEvent]
  refresh: []
  drop: [event: DragEvent, folderId: string]
  cardDragOver: [event: DragEvent]
  cardDragLeave: [event: DragEvent]
}>()

// 文件夹区超过两行时折叠：占位卡片占据第二行最后一格，点击切换展开/收起
const folderGridRef = ref<HTMLElement | null>(null)
const folderGridWidth = ref(0)
const FOLDER_GRID_GAP = 16 // 与 .folder-card-grid 的 gap: 1rem 保持一致
const folderColumns = computed(() => {
  const itemSize = props.folderGridItemSize
  if (!folderGridWidth.value || !itemSize) return 0
  return Math.max(1, Math.floor((folderGridWidth.value + FOLDER_GRID_GAP) / (itemSize + FOLDER_GRID_GAP)))
})
const folderGridOverflow = computed(() =>
  folderColumns.value > 0 && props.items.length > folderColumns.value * 2
)
const folderCollapsed = ref(true)
const visibleChildFolderItems = computed(() => {
  if (!folderGridOverflow.value || !folderCollapsed.value) return props.items
  return props.items.slice(0, folderColumns.value * 2 - 1)
})
const folderHiddenCount = computed(() => props.items.length - visibleChildFolderItems.value.length)

let folderGridObserver: ResizeObserver | null = null
watch(folderGridRef, el => {
  folderGridObserver?.disconnect()
  if (!el) {
    folderGridWidth.value = 0
    return
  }
  folderGridObserver = new ResizeObserver(entries => {
    folderGridWidth.value = entries[0]?.contentRect.width ?? 0
  })
  folderGridObserver.observe(el)
})

onUnmounted(() => {
  folderGridObserver?.disconnect()
  folderGridObserver = null
})
</script>

<template>
  <section>
    <header class="flex items-center justify-between px-5 pt-3 pb-1">
      <h3 class="text-sm font-medium text-foreground">{{ $t('views.sidebarModuleList.folders') }}</h3>
      <div class="flex items-center gap-2">
        <span
          class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{
            items.length }}</span>
        <button
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          :title="$t('views.sidebarModuleList.addFolder')" @click="emit('addFolder')"><span
            class="material-icons text-base leading-none">add</span></button>
      </div>
    </header>
    <div v-if="items.length > 0">
      <div ref="folderGridRef" class="folder-card-grid"
        :style="{ '--folder-grid-item-size': `${folderGridItemSize}px` }">
        <FolderContextMenu v-for="item in visibleChildFolderItems" :key="String(item.raw.id)"
          :folder="item.raw as any" :folders="availableFolders as any" @refresh="emit('refresh')">
          <div class="folder-card-button" role="button" tabindex="0" :title="item.label"
            @click="emit('select', item.raw, $event)"
            @keydown.enter.prevent="emit('select', item.raw, $event)"
            @keydown.space.prevent="emit('select', item.raw, $event)"
            @dragover.prevent.stop="canUpload && emit('cardDragOver', $event)"
            @dragleave.prevent.stop="canUpload && emit('cardDragLeave', $event)"
            @drop.prevent.stop="canUpload && emit('drop', $event, String(item.raw.id))">
            <Folder :size="folderCardUiSize" :label="item.label" :badge="item.count ?? 0"
              :thumbnail="folderCoverUrls[String(item.raw.id)]"
              :custom-color="getFolderColor(item.raw.color)" />
          </div>
        </FolderContextMenu>
        <!-- 超过两行时的展开/收起占位卡片 -->
        <button v-if="folderGridOverflow" type="button"
          class="flex flex-col items-center justify-center gap-1 rounded-3xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
          :style="{ width: `${folderGridItemSize}px`, height: `${folderGridItemSize}px` }"
          :title="folderCollapsed
            ? $t('tabs.mediaTabListView.expandFolders', { count: folderHiddenCount })
            : $t('tabs.mediaTabListView.collapseFolders')"
          @click="folderCollapsed = !folderCollapsed">
          <span class="material-icons text-2xl">{{ folderCollapsed ? 'expand_more' : 'expand_less' }}</span>
          <span v-if="folderCollapsed" class="text-xs font-medium tabular-nums">+{{ folderHiddenCount }}</span>
        </button>
      </div>
    </div>
    <div v-else class="py-4">
      <StatusImage name="empty" size="large" :text="$t('tabs.mediaTabListView.emptyFolderTitle')" />
    </div>
  </section>
</template>

<style scoped>
.folder-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, var(--folder-grid-item-size, 128px));
  gap: 1rem;
  align-items: start;
  justify-items: start;
  justify-content: space-around;
  padding: 1.25rem 1.25rem 0;
  box-shadow: none;
}

.folder-card-button {
  display: flex;
  width: auto;
  min-width: 0;
  padding: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.folder-card-button:focus,
.folder-card-button:focus-visible,
.folder-card-button:active {
  outline: none;
  box-shadow: none;
}

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
