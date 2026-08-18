<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useMediaStore } from '@/renderer/stores/media'
import { useMediaQuery } from '@vueuse/core'
import { useImportHandler, type ImportTarget, type ImportFolderPayload } from '@/renderer/composables/useImportHandler'

const { t } = useI18n()
const mediaStore = useMediaStore()
const isMobile = useMediaQuery('(max-width: 767px)')
const isImporting = ref(false)

const props = defineProps<{ target?: ImportTarget }>()

const emit = defineEmits<{
  upload: []
  importFolder: [payload: ImportFolderPayload]
}>()

function closeDrawerIfMobile() {
  if (isMobile.value) mediaStore.showLeftSidebar = false
}

function handleUpload() {
  closeDrawerIfMobile()
  emit('upload')
}

const target = computed(() => props.target)
const importHandler = useImportHandler({
  t,
  target,
  onUpload: handleUpload,
  onImportFolder: (payload) => emit('importFolder', payload),
})

async function handleImportFolder() {
  if (isImporting.value) return
  closeDrawerIfMobile()
  isImporting.value = true
  try {
    await importHandler.handleImportFolder()
  } finally {
    isImporting.value = false
  }
}

function handleUrlImport() {
  closeDrawerIfMobile()
  importHandler.handleUrlImport()
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
