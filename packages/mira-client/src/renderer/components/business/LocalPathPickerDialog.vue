<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import FolderTreeComponent from './FolderTreeComponent/FolderTreeComponent.vue'
import type { FolderItem } from '@renderer/types/components'
import type { LocalFileEntry } from '@/shared/types'

const props = withDefaults(defineProps<{
  modelValue: boolean
  initialPath: string
  selectionMode?: 'file' | 'directory'
  multiple?: boolean
}>(), {
  selectionMode: 'directory',
  multiple: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [paths: string[]]
}>()

const { t } = useI18n()
const folders = ref<FolderItem[]>([])
const selectedPaths = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const api = computed(() => window.electronAPI?.fs)

const basename = (targetPath: string) => targetPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || targetPath

function toTreeItem(entry: LocalFileEntry): FolderItem {
  return {
    id: entry.path,
    label: entry.name,
    icon: entry.isDirectory ? 'folder' : 'insert_drive_file',
    children: entry.isDirectory ? [] : undefined,
    originalData: entry,
  } as FolderItem
}

function findItem(items: FolderItem[], targetPath: string): FolderItem | undefined {
  for (const item of items) {
    if (item.id === targetPath) return item
    const child = item.children && findItem(item.children, targetPath)
    if (child) return child
  }
}

async function loadChildren(targetPath: string, force = false) {
  const node = findItem(folders.value, targetPath)
  if (!force && node?.children?.length) return
  const result = await api.value?.listDirectory(targetPath)
  if (!result?.success) {
    error.value = result?.message || t('views.localFolder.loadFailed')
    return
  }
  const children = (result.data || [])
    .filter((entry) => props.selectionMode === 'file' || entry.isDirectory)
    .map(toTreeItem)
  if (node) node.children = children
}

async function initialize() {
  if (!props.modelValue || !props.initialPath) return
  loading.value = true
  error.value = ''
  selectedPaths.value = []
  const root = {
    id: props.initialPath,
    label: basename(props.initialPath),
    icon: 'storage',
    open: true,
    children: [],
    originalData: { path: props.initialPath, isDirectory: true },
  } as FolderItem
  folders.value = [root]
  await loadChildren(props.initialPath, true)
  loading.value = false
}

function handleSelect(item: any) {
  if (item.id?.startsWith('__')) return
  const isDirectory = item.isDirectory ?? item.originalData?.isDirectory ?? (item.icon === 'folder' || item.icon === 'storage')
  if (isDirectory) loadChildren(item.path || item.id)
  if ((props.selectionMode === 'directory') !== isDirectory) return

  const targetPath = item.path || item.id
  if (!props.multiple) {
    selectedPaths.value = [targetPath]
    return
  }
  const next = new Set(selectedPaths.value)
  if (item.selected === false) next.delete(targetPath)
  else next.add(targetPath)
  selectedPaths.value = [...next]
}

function isSelectable(item: any) {
  const isDirectory = item.isDirectory ?? item.originalData?.isDirectory ?? (item.icon === 'folder' || item.icon === 'storage')
  return props.selectionMode === 'directory' ? isDirectory : !isDirectory
}

function handleExpand(item: any, expanded: boolean) {
  if (expanded && (item.isDirectory ?? item.originalData?.isDirectory ?? true)) {
    loadChildren(item.path || item.id)
  }
}

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm', selectedPaths.value)
  close()
}

watch(() => [props.modelValue, props.initialPath, props.selectionMode], initialize, { immediate: true })
</script>

<template>
  <Dialog :open="modelValue" @update:open="emit('update:modelValue', $event)">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ $t('views.localFolder.chooseTarget') }}</DialogTitle>
        <DialogDescription class="break-all">{{ initialPath }}</DialogDescription>
      </DialogHeader>

      <div class="min-h-72 rounded-md border p-2">
        <div v-if="loading" class="flex h-64 items-center justify-center text-sm text-muted-foreground">
          {{ $t('views.localFolder.loadingDirectory') }}
        </div>
        <FolderTreeComponent
          v-else
          :folders="folders"
          item-type="folder"
          :selection-mode="multiple ? 'multi' : 'single'"
          :selected-keys="selectedPaths"
          :selectable="isSelectable"
          read-only
          hide-header-actions
          :title="$t('views.localFolder.folderTree')"
          @select="handleSelect"
          @expand="handleExpand"
        />
        <p v-if="error" class="mt-2 text-xs text-destructive">{{ error }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="close">{{ $t('common.cancel') }}</Button>
        <Button :disabled="selectedPaths.length === 0" @click="confirm">
          {{ $t('common.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
