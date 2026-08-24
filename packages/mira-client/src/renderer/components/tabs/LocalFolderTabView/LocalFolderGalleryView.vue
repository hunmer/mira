<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import { FileIcon, FolderIcon } from '@/components/ui/file-icon'
import FileSystemInformation from '@/components/ui/file-system/FileSystemInformation.vue'
import type { LocalFileEntry } from '@/shared/types'
import type { FileSystemEntry, FileSystemIndex } from './localFolderUtils'
import { formatSize, informationKindLabel, type LocalFolderEntryActions } from './localFolderUtils'
import LocalFolderEntryMenu from './LocalFolderEntryMenu.vue'

const { t } = useI18n()

defineProps<{
  entries: LocalFileEntry[]
  galleryEntry: LocalFileEntry | null
  galleryPreviewUrl: string
  galleryInfoEntry: FileSystemEntry | null
  infoIndex: FileSystemIndex
  selectedPaths: string[]
  actions: LocalFolderEntryActions
}>()

const galleryScrollRef = ref<HTMLElement | null>(null)

defineExpose({ galleryScrollRef })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-background">
    <div class="flex min-h-0 flex-1 bg-muted/20">
      <div class="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
        <div v-if="galleryEntry" class="flex h-full min-h-0 max-w-full flex-col items-center gap-4 text-center">
          <img
            v-if="galleryPreviewUrl"
            :src="galleryPreviewUrl"
            :alt="galleryEntry.name"
            class="min-h-0 max-h-[calc(100%-4.5rem)] max-w-full rounded-md object-contain shadow-sm"
            @dblclick="actions.openEntry(galleryEntry)"
          />
          <FolderIcon v-else-if="galleryEntry.isDirectory" :name="galleryEntry.name" class="size-24" />
          <FileIcon v-else :name="galleryEntry.name" class="size-24" />
          <div class="max-w-xl">
            <h3 class="break-all text-sm font-medium">{{ galleryEntry.name }}</h3>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground">{{ $t('views.localFolder.empty') }}</div>
      </div>
      <aside
        v-if="galleryInfoEntry"
        class="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-background p-4 sm:flex"
      >
        <div class="flex items-center gap-3">
          <FolderIcon v-if="galleryInfoEntry.kind === 'folder'" :name="galleryInfoEntry.name" class="size-8" />
          <FileIcon v-else :name="galleryInfoEntry.name" class="size-8" />
          <div class="min-w-0 flex-1">
            <div class="break-words text-sm font-semibold">{{ galleryInfoEntry.name }}</div>
            <div class="text-xs text-muted-foreground">
              {{ informationKindLabel(galleryInfoEntry, t) }}
              <template v-if="galleryInfoEntry.kind === 'file' && galleryInfoEntry.size"> · {{ formatSize(galleryInfoEntry.size) }}</template>
            </div>
          </div>
        </div>
        <FileSystemInformation :entry="galleryInfoEntry" :index="infoIndex" />
      </aside>
    </div>
    <div
      ref="galleryScrollRef"
      class="flex h-28 shrink-0 gap-2 overflow-x-auto overflow-y-hidden border-t bg-background p-2"
      @scroll="actions.onGalleryScroll($event)"
    >
      <ContextMenu v-for="entry in entries" :key="entry.path">
        <ContextMenuTrigger as-child>
          <button
            type="button"
            draggable="true"
            :data-selectable-id="entry.path"
            class="flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded px-1 text-center text-xs hover:bg-accent/60"
            :class="selectedPaths.includes(entry.path) ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : ''"
            @click="actions.onGalleryItemClick(entry, $event)"
            @dblclick.stop="actions.openEntry(entry)"
            @contextmenu="actions.onContextMenu(entry)"
            @dragstart="actions.onDragStart(entry, $event)"
            @dragend="actions.onDragEnd()"
            @dragover="entry.isDirectory && $event.preventDefault()"
            @drop.stop.prevent="actions.onFolderDrop(entry, $event)"
          >
            <FolderIcon v-if="entry.isDirectory" :name="entry.name" class="size-8" />
            <FileIcon v-else :name="entry.name" class="size-8" />
            <span class="line-clamp-2 max-w-full break-all">{{ entry.name }}</span>
          </button>
        </ContextMenuTrigger>
        <LocalFolderEntryMenu :entry="entry" :actions="actions" />
      </ContextMenu>
    </div>
  </div>
</template>
