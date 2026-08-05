<script setup lang="ts">
import ServerManagementDialog from '@renderer/components/business/ServerManagementDialog.vue'
import ServerEditDialog from '@renderer/components/business/ServerEditDialog.vue'
import ShortcutManagerDialog from '@renderer/components/business/ShortcutManagerDialog.vue'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import PluginsDialog from '@renderer/components/business/PluginsDialog.vue'
import SettingsDialog from '@renderer/components/business/SettingsDialog.vue'
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

defineProps<{
  editingServer: ServerConfig | null
  uploadInitialFolderId?: string
  uploadInitialTagIds?: string[]
  uploadInitialTree?: { rootPath: string; tree: LocalFsNode[] }
}>()

const emit = defineEmits<{
  createLibrary: []
  editServer: [server: ServerConfig]
  addServer: []
  serverSaved: []
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
        <h3 class="text-lg font-semibold">没有可用的素材库</h3>
      </div>
      <p class="text-muted-foreground dark:text-muted-foreground mb-6">
        系统检测到您还没有创建任何素材库。素材库是用来管理和组织您的媒体文件的。
      </p>
      <div class="flex justify-end space-x-3">
        <button
          @click="showNoLibraryDialog = false"
          class="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md"
        >
          稍后创建
        </button>
        <button
          @click="emit('createLibrary')"
          class="px-4 py-2 bg-primary text-white hover:bg-primary rounded-md"
        >
          创建素材库
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
  />

  <!-- 插件管理对话框 -->
  <PluginsDialog
    v-model:visible="showPluginsDialog"
  />

  <!-- 设置对话框 -->
  <SettingsDialog
    v-model:visible="showSettingsDialog"
  />

  <!-- 权限不足对话框 -->
  <AlertDialog v-model:open="showAccessDeniedDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>权限不足</AlertDialogTitle>
        <AlertDialogDescription>
          您的角色没有访问该素材库的权限，请选择其他素材库。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction @click="showAccessDeniedDialog = false">确定</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
