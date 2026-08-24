<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ArrowLeft, Folder, LoaderCircle, Pencil, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LocalFileEntry } from '@/shared/types'
import { getParentPath, normalizePath, type LocalFolderCrumb } from './localFolderUtils'

const props = defineProps<{
  isAtRoot: boolean
  currentPath: string
  breadcrumbs: LocalFolderCrumb[]
}>()

const emit = defineEmits<{
  up: []
  navigate: [path: string]
  refresh: []
  submit: [rawPath: string]
}>()

const editing = defineModel<boolean>('editing', { default: false })
const pathInput = ref('')
const pathInputRef = ref<InstanceType<typeof Input> | null>(null)

async function startEditing() {
  pathInput.value = props.currentPath
  editing.value = true
  await nextTick()
  const input = pathInputRef.value?.$el as HTMLInputElement | undefined
  input?.focus()
  input?.select()
}

const openCrumbPath = ref('')
const crumbFolders = ref<LocalFileEntry[]>([])
const crumbLoading = ref(false)

async function loadCrumbFolders(crumb: LocalFolderCrumb) {
  openCrumbPath.value = crumb.path
  crumbFolders.value = []
  crumbLoading.value = true
  const parentPath = getParentPath(crumb.path)
  const listPath = parentPath === crumb.path ? crumb.path : parentPath
  const result = await window.electronAPI?.fs.listDirectory(listPath)
  if (openCrumbPath.value !== crumb.path) return
  crumbLoading.value = false
  if (result?.success) {
    crumbFolders.value = (result.data || []).filter((entry) => entry.isDirectory)
  }
}

function isCurrentCrumb(folder: LocalFileEntry, crumb: LocalFolderCrumb) {
  return normalizePath(folder.path) === normalizePath(crumb.path)
}
</script>

<template>
  <header class="flex min-h-12 shrink-0 items-center gap-2 border-b px-3">
    <Button variant="ghost" size="icon-sm" :disabled="isAtRoot" :title="$t('views.localFolder.up')" @click="emit('up')">
      <ArrowLeft />
    </Button>
    <Input
      v-if="editing"
      ref="pathInputRef"
      v-model="pathInput"
      class="h-8 min-w-0 flex-1"
      :aria-label="$t('views.localFolder.pathInput')"
      @keydown.enter.prevent="emit('submit', pathInput)"
      @keydown.escape.prevent="editing = false"
    />
    <nav v-else class="flex min-w-0 flex-1 items-center overflow-hidden text-sm" aria-label="Breadcrumb">
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
        <span v-if="index" class="px-1 text-muted-foreground">/</span>
        <DropdownMenu @update:open="open => open && loadCrumbFolders(crumb)">
          <DropdownMenuTrigger as-child>
            <button class="min-w-0 truncate rounded px-1.5 py-1 hover:bg-accent" :title="crumb.path">
              {{ crumb.label }}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="max-h-72 min-w-40 overflow-y-auto">
            <div v-if="crumbLoading" class="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <LoaderCircle class="size-3.5 animate-spin" />{{ $t('views.localFolder.loadingDirectory') }}
            </div>
            <template v-else>
              <DropdownMenuItem
                v-for="folder in crumbFolders"
                :key="folder.path"
                :class="isCurrentCrumb(folder, crumb) ? 'bg-accent font-medium' : ''"
                @click="emit('navigate', folder.path)"
              >
                <Folder class="size-4 shrink-0" />
                <span class="min-w-0 truncate">{{ folder.name }}</span>
              </DropdownMenuItem>
              <div v-if="!crumbFolders.length" class="px-2 py-1.5 text-xs text-muted-foreground">
                {{ $t('views.localFolder.empty') }}
              </div>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </nav>
    <Button
      v-if="!editing"
      variant="ghost"
      size="icon-sm"
      :title="$t('views.localFolder.editPath')"
      @click="startEditing"
    >
      <Pencil />
    </Button>
    <Button variant="ghost" size="icon-sm" :title="$t('views.localFolder.refresh')" @click="emit('refresh')">
      <RefreshCw />
    </Button>
  </header>
</template>
