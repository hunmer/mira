<script setup lang="ts">
import ServerManagementDialog from '@renderer/components/business/ServerManagementDialog.vue'
import ServerEditDialog from '@renderer/components/business/ServerEditDialog.vue'
import ShortcutManagerDialog from '@renderer/components/business/ShortcutManagerDialog.vue'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import PluginsDialog from '@renderer/components/business/PluginsDialog.vue'
import SettingsDialog from '@renderer/components/business/SettingsDialog.vue'
import FolderManageDialog from '@renderer/components/business/FolderManageDialog.vue'
import TagManageDialog from '@renderer/components/business/TagManageDialog.vue'
import AboutDialog from '@renderer/components/business/AboutDialog.vue'
import DeviceShareDialog from '@renderer/components/business/DeviceShareDialog/DeviceShareDialog.vue'
import IncomingShareDialog from '@renderer/components/business/DeviceShareDialog/IncomingShareDialog.vue'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction
} from '@/components/ui/alert-dialog'
import type { ServerConfig } from '@renderer/stores/serverList'
import type { LocalFsNode } from '../../../shared/types'

defineOptions({ name: 'HomeDialogs' })

const showNoLibraryDialog = defineModel<boolean>('showNoLibraryDialog', { required: true })
const showServerManagementDialog = defineModel<boolean>('showServerManagementDialog', { required: true })
const showServerEditDialog = defineModel<boolean>('showServerEditDialog', { required: true })
const showShortcutDialog = defineModel<boolean>('showShortcutDialog', { required: true })
const showFileUploadDialog = defineModel<boolean>('showFileUploadDialog', { required: true })
const showPluginsDialog = defineModel<boolean>('showPluginsDialog', { required: true })
const showSettingsDialog = defineModel<boolean>('showSettingsDialog', { required: true })
const showAccessDeniedDialog = defineModel<boolean>('showAccessDeniedDialog', { required: true })
const showFolderManageDialog = defineModel<boolean>('showFolderManageDialog', { required: true })
const showTagManageDialog = defineModel<boolean>('showTagManageDialog', { required: true })
const showAboutDialog = defineModel<boolean>('showAboutDialog', { required: true })

defineProps<{
  editingServer: ServerConfig | null
  uploadInitialFolderId?: string
  uploadInitialTagIds?: string[]
  uploadInitialTree?: { rootPath: string; tree: LocalFsNode[] }
  screenshotFile?: File
}>()

const emit = defineEmits<{
  createLibrary: []
  editServer: [server: ServerConfig]
  addServer: []
  serverSaved: []
  selectFolder: [folder: any]
  selectTag: [tag: any]
}>()
</script>

<template>
  <!-- 无素材库提示对话框 -->
  <div
    v-if="showNoLibraryDialog"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white dark:bg-muted rounded-lg p-6 max-w-md mx-4">
      <div class="flex items-center mb-4">
        <span class="material-icons text-yellow-500 mr-3">warning</span>
        <h3 class="text-lg font-semibold">{{ $t('views.homeDialogs.noLibraryTitle') }}</h3>
      </div>
      <p class="text-muted-foreground dark:text-muted-foreground mb-6">
        {{ $t('views.homeDialogs.noLibraryDesc') }}
      </p>
      <div class="flex justify-end space-x-3">
        <button
          @click="showNoLibraryDialog = false"
          class="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md"
        >
          {{ $t('views.homeDialogs.later') }}
        </button>
        <button
          @click="emit('createLibrary')"
          class="px-4 py-2 bg-primary text-white hover:bg-primary rounded-md"
        >
          {{ $t('views.homeDialogs.createLibrary') }}
        </button>
      </div>
    </div>
  </div>

  <!-- 素材库管理对话框 -->
  <ServerManagementDialog
    v-model:visible="showServerManagementDialog"
    @edit-server="emit('editServer', $event)"
    @add-server="emit('addServer')"
  />

  <!-- 素材库编辑对话框 -->
  <ServerEditDialog
    v-model:visible="showServerEditDialog"
    :library="editingServer"
    @saved="emit('serverSaved')"
  />

  <!-- 快捷键管理对话框 -->
  <ShortcutManagerDialog
    v-model:visible="showShortcutDialog"
  />

  <!-- 文件上传对话框 -->
  <FileUploadDialog
    v-model:visible="showFileUploadDialog"
    :initial-folder-id="uploadInitialFolderId"
    :initial-tag-ids="uploadInitialTagIds"
    :initial-local-tree="uploadInitialTree"
    :initial-files="screenshotFile ? [screenshotFile] : undefined"
  />

  <!-- 插件管理对话框 -->
  <PluginsDialog
    v-model:visible="showPluginsDialog"
  />

  <!-- 设置对话框 -->
  <SettingsDialog
    v-model:visible="showSettingsDialog"
  />

  <!-- 文件夹管理对话框 -->
  <FolderManageDialog
    v-model:visible="showFolderManageDialog"
    @select="emit('selectFolder', $event)"
  />

  <!-- 标签管理对话框 -->
  <TagManageDialog
    v-model:visible="showTagManageDialog"
    @select="emit('selectTag', $event)"
  />

  <!-- 关于对话框 -->
  <AboutDialog
    v-model:visible="showAboutDialog"
  />

  <!-- 发送到其他设备（设备选择 + 配对 QR） -->
  <DeviceShareDialog />

  <!-- 接收其他设备分享的文件（确认 + 下载） -->
  <IncomingShareDialog />

  <!-- 权限不足对话框 -->
  <AlertDialog v-model:open="showAccessDeniedDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('views.homeDialogs.accessDeniedTitle') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('views.homeDialogs.accessDeniedDesc') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction @click="showAccessDeniedDialog = false">{{ $t('views.homeDialogs.ok') }}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
