<script setup lang="ts">
import { Copy, FolderInput, FolderOpen, Import, Move, Trash2 } from 'lucide-vue-next'
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu'
import type { LocalFileEntry } from '@/shared/types'
import type { LocalFolderEntryActions } from './localFolderUtils'

defineProps<{
  entry: LocalFileEntry
  actions: LocalFolderEntryActions
}>()
</script>

<template>
  <ContextMenuContent class="w-48">
    <ContextMenuItem @click="actions.openEntry(entry)"><FolderOpen />{{ $t('views.localFolder.open') }}</ContextMenuItem>
    <ContextMenuItem :disabled="entry.isDirectory" @click="actions.importFiles([entry])"><Import />{{ $t('views.localFolder.import') }}</ContextMenuItem>
    <ContextMenuItem :disabled="entry.isDirectory" @click="actions.openImportTo([entry])"><FolderInput />{{ $t('views.localFolder.importTo') }}</ContextMenuItem>
    <ContextMenuItem @click="actions.locate(entry)"><FolderInput />{{ $t('views.localFolder.locate') }}</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem @click="actions.showPicker('copy', actions.dragPathsFor(entry))"><Copy />{{ $t('views.localFolder.copy') }}</ContextMenuItem>
    <ContextMenuItem @click="actions.showPicker('move', actions.dragPathsFor(entry))"><Move />{{ $t('views.localFolder.move') }}</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem class="text-destructive" @click="actions.removeEntries(actions.dragPathsFor(entry))"><Trash2 />{{ $t('views.localFolder.delete') }}</ContextMenuItem>
  </ContextMenuContent>
</template>
