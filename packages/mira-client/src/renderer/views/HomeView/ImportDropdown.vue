<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useToast } from '@/renderer/composables/useToast'
import { useUrlImportStore } from '@/renderer/stores/urlImport'
import { useMediaStore } from '@/renderer/stores/media'
import { useMediaQuery } from '@vueuse/core'
import type { LocalFsNode } from '../../../shared/types'

const { t } = useI18n()
const toast = useToast()
const urlImportStore = useUrlImportStore()
const mediaStore = useMediaStore()
const isMobile = useMediaQuery('(max-width: 767px)')
const isImporting = ref(false)

const emit = defineEmits<{
  upload: []
  importFolder: [payload: { rootPath: string; tree: LocalFsNode[] }]
}>()

function closeDrawerIfMobile() {
  if (isMobile.value) mediaStore.showLeftSidebar = false
}

function handleUpload() {
  closeDrawerIfMobile()
  emit('upload')
}

async function handleImportFolder() {
  if (isImporting.value) return
  closeDrawerIfMobile()
  isImporting.value = true
  try {
    const dirRes = await window.electronAPI.fs.selectDirectory(t('views.sidebarToolbar.selectImportFolder'))
    if (!dirRes.success || !dirRes.path) return
    const treeRes = await window.electronAPI.fs.readDirTree(dirRes.path)
    if (!treeRes.success || !treeRes.data) {
      toast.add({ severity: 'error', summary: t('views.sidebarToolbar.importFailed'), detail: treeRes.message || t('views.sidebarToolbar.readTreeFailed'), life: 3000 })
      return
    }
    emit('importFolder', { rootPath: dirRes.path, tree: treeRes.data })
  } catch (error) {
    toast.add({ severity: 'error', summary: t('views.sidebarToolbar.importFailed'), detail: error instanceof Error ? error.message : t('views.common.unknownError'), life: 3000 })
  } finally {
    isImporting.value = false
  }
}

function handleUrlImport() {
  closeDrawerIfMobile()
  urlImportStore.open()
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :disabled="isImporting" :title="$t('views.sidebarToolbar.import')">
        <span class="material-icons leading-none" style="font-size: 18px">{{ isImporting ? 'hourglass_top' : 'drive_folder_upload' }}</span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-40">
      <DropdownMenuItem @click="handleUpload"><span class="material-icons text-base mr-2">upload_file</span><span>{{ $t('views.sidebarToolbar.uploadFile') }}</span></DropdownMenuItem>
      <DropdownMenuItem @click="handleImportFolder"><span class="material-icons text-base mr-2">folder_open</span><span>{{ $t('views.sidebarToolbar.importFolder') }}</span></DropdownMenuItem>
      <DropdownMenuItem @click="handleUrlImport"><span class="material-icons text-base mr-2">cloud_download</span><span>{{ $t('business.homeHeader.importFromUrl') }}</span></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
