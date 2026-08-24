<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Folder } from 'lucide-vue-next'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import { FileIcon, FolderIcon } from '@/components/ui/file-icon'
import type { LocalFileEntry } from '@/shared/types'
import type { LocalFolderEntryActions } from './localFolderUtils'
import { formatSize } from './localFolderUtils'
import LocalFolderEntryMenu from './LocalFolderEntryMenu.vue'

const { locale } = useI18n()

defineProps<{
  viewMode: 'list' | 'grid'
  entries: LocalFileEntry[]
  totalCount: number
  filteredCount: number
  selectedPaths: string[]
  gridItemSize: number
  gridIconSize: number
  thumbnailUrls: Record<string, string>
  actions: LocalFolderEntryActions
}>()
</script>

<template>
  <div
    :class="viewMode === 'grid' ? 'grid min-h-full content-start gap-2 p-1' : 'min-h-full space-y-0.5'"
    :style="viewMode === 'grid' ? { gridTemplateColumns: `repeat(auto-fill, minmax(${gridItemSize}px, 1fr))` } : undefined"
    @wheel="viewMode === 'grid' ? actions.onGridWheel($event) : undefined"
  >
    <ContextMenu v-for="entry in entries" :key="entry.path">
      <ContextMenuTrigger as-child>
        <button
          type="button"
          draggable="true"
          :data-selectable-id="entry.path"
          :class="[
            viewMode === 'list'
              ? 'grid h-10 w-full grid-cols-[minmax(0,1fr)_110px_170px] items-center gap-3 px-2 text-left text-sm'
              : 'flex min-w-0 flex-col items-center justify-center gap-2 px-2 text-center text-xs',
            'rounded hover:bg-accent/60',
            selectedPaths.includes(entry.path) ? 'bg-primary/10 text-primary' : '',
          ]"
          :style="viewMode === 'grid' ? { height: `${gridItemSize}px` } : undefined"
          @click="actions.onItemClick(entry, $event)"
          @dblclick.stop="actions.openEntry(entry)"
          @contextmenu="actions.onContextMenu(entry)"
          @dragstart="actions.onDragStart(entry, $event)"
          @dragend="actions.onDragEnd()"
          @dragover="entry.isDirectory && $event.preventDefault()"
          @drop.stop.prevent="actions.onFolderDrop(entry, $event)"
        >
          <span :class="viewMode === 'list' ? 'flex min-w-0 items-center gap-2' : 'flex min-w-0 max-w-full flex-col items-center gap-2'">
            <template v-if="viewMode === 'grid'">
              <img
                v-if="thumbnailUrls[entry.path]"
                :src="thumbnailUrls[entry.path]"
                :alt="entry.name"
                class="shrink-0 rounded object-contain"
                :style="{ width: `${gridIconSize}px`, height: `${gridIconSize}px` }"
              />
              <FolderIcon v-else-if="entry.isDirectory" :name="entry.name" :style="{ width: `${gridIconSize}px`, height: `${gridIconSize}px` }" />
              <FileIcon v-else :name="entry.name" :style="{ width: `${gridIconSize}px`, height: `${gridIconSize}px` }" />
            </template>
            <template v-else>
              <FolderIcon v-if="entry.isDirectory" :name="entry.name" />
              <FileIcon v-else :name="entry.name" />
            </template>
            <span :class="viewMode === 'list' ? 'truncate' : 'line-clamp-2 max-w-full break-all'">{{ entry.name }}</span>
          </span>
          <span v-if="viewMode === 'list'" class="text-xs text-muted-foreground">{{ entry.isDirectory ? '—' : formatSize(entry.size) }}</span>
          <span v-if="viewMode === 'list'" class="text-xs text-muted-foreground">{{ new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(entry.modifiedAt) }}</span>
        </button>
      </ContextMenuTrigger>
      <LocalFolderEntryMenu :entry="entry" :actions="actions" />
    </ContextMenu>

    <div v-if="filteredCount === 0" class="col-span-full flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Folder class="size-8" />
      {{ totalCount ? $t('views.localFolder.noMatches') : $t('views.localFolder.empty') }}
    </div>
  </div>
</template>
