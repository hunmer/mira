<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ChevronRight, LoaderCircle } from 'lucide-vue-next'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import { FileIcon, FolderIcon } from '@/components/ui/file-icon'
import FileSystemInformation from '@/components/ui/file-system/FileSystemInformation.vue'
import type { LocalFileEntry } from '@/shared/types'
import type { FileEntry, FileSystemIndex } from './localFolderUtils'
import { formatSize, informationKindLabel, type LocalFolderEntryActions } from './localFolderUtils'
import LocalFolderEntryMenu from './LocalFolderEntryMenu.vue'

const { t } = useI18n()

defineProps<{
  levels: Array<{ path: string, entries: LocalFileEntry[] }>
  levelTotals: number[]
  loadingColumnPath: string
  selectedPaths: string[]
  selectedFileInfoEntry: FileEntry | null
  infoIndex: FileSystemIndex
  actions: LocalFolderEntryActions
}>()
</script>

<template>
  <div class="flex h-full min-h-0 overflow-x-auto rounded-md border bg-background">
    <section
      v-for="(level, levelIndex) in levels"
      :key="level.path"
      class="w-64 shrink-0 overflow-y-auto border-r p-1 last:border-r-0"
      @scroll="actions.onColumnScroll($event, level.path, levelTotals[levelIndex] ?? level.entries.length)"
    >
      <ContextMenu v-for="entry in level.entries" :key="entry.path">
        <ContextMenuTrigger as-child>
          <button
            type="button"
            draggable="true"
            :data-selectable-id="entry.path"
            class="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-accent/60"
            :class="selectedPaths.includes(entry.path) ? 'bg-primary/10 text-primary' : ''"
            @click="actions.onColumnItemClick(entry, levelIndex, $event)"
            @dblclick.stop="actions.openEntry(entry)"
            @contextmenu="actions.onContextMenu(entry)"
            @dragstart="actions.onDragStart(entry, $event)"
            @dragend="actions.onDragEnd()"
            @dragover="entry.isDirectory && $event.preventDefault()"
            @drop.stop.prevent="actions.onFolderDrop(entry, $event)"
          >
            <FolderIcon v-if="entry.isDirectory" :name="entry.name" />
            <FileIcon v-else :name="entry.name" />
            <span class="min-w-0 flex-1 truncate">{{ entry.name }}</span>
            <ChevronRight v-if="entry.isDirectory" class="size-4 shrink-0 text-muted-foreground" />
          </button>
        </ContextMenuTrigger>
        <LocalFolderEntryMenu :entry="entry" :actions="actions" />
      </ContextMenu>
      <div v-if="loadingColumnPath === level.path" class="flex h-8 items-center gap-2 px-2 text-xs text-muted-foreground">
        <LoaderCircle class="size-3.5 animate-spin" />{{ $t('views.localFolder.loadingDirectory') }}
      </div>
      <div v-if="level.entries.length === 0" class="flex h-24 items-center justify-center text-xs text-muted-foreground">
        {{ $t('views.localFolder.empty') }}
      </div>
    </section>
    <div
      v-if="selectedFileInfoEntry"
      class="flex min-w-60 flex-1 flex-col items-center justify-center overflow-y-auto p-4"
    >
      <div class="flex w-full max-w-lg flex-col items-stretch gap-3">
        <FileIcon :name="selectedFileInfoEntry.name" class="mx-auto size-24" />
        <div class="text-center">
          <div class="break-words text-sm font-semibold">{{ selectedFileInfoEntry.name }}</div>
          <div class="text-xs text-muted-foreground">
            {{ informationKindLabel(selectedFileInfoEntry, t) }}
            <template v-if="selectedFileInfoEntry.size"> · {{ formatSize(selectedFileInfoEntry.size) }}</template>
          </div>
        </div>
        <FileSystemInformation :entry="selectedFileInfoEntry" :index="infoIndex" />
      </div>
    </div>
  </div>
</template>
