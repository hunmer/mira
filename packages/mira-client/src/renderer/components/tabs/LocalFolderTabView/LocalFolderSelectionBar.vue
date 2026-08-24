<script setup lang="ts">
import { Copy, FolderInput, Import, Move, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { LocalFileEntry } from '@/shared/types'
import type { LocalFolderEntryActions } from './localFolderUtils'

defineProps<{
  selectedPaths: string[]
  selectedFiles: LocalFileEntry[]
  actions: LocalFolderEntryActions
}>()
</script>

<template>
  <div class="flex shrink-0 justify-center overflow-x-auto border-t bg-background px-3 py-2">
    <div class="flex max-w-full items-center gap-1">
      <span class="px-2 text-xs text-muted-foreground">{{ $t('views.localFolder.selectedCount', { count: selectedPaths.length }) }}</span>
      <Button size="sm" variant="ghost" :disabled="selectedFiles.length === 0" @click="actions.importFiles(selectedFiles)"><Import />{{ $t('views.localFolder.batchImport') }}</Button>
      <Button size="sm" variant="ghost" :disabled="selectedFiles.length === 0" @click="actions.openImportTo(selectedFiles)"><FolderInput />{{ $t('views.localFolder.batchImportTo') }}</Button>
      <Button size="sm" variant="ghost" @click="actions.showPicker('copy', selectedPaths)"><Copy />{{ $t('views.localFolder.batchCopy') }}</Button>
      <Button size="sm" variant="ghost" @click="actions.showPicker('move', selectedPaths)"><Move />{{ $t('views.localFolder.batchMove') }}</Button>
      <Button size="sm" variant="ghost" class="text-destructive" @click="actions.removeEntries(selectedPaths)"><Trash2 />{{ $t('views.localFolder.batchDelete') }}</Button>
    </div>
  </div>
</template>
