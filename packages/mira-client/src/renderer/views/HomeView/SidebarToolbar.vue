<script setup lang="ts">
/**
 * SidebarToolbar —— HomeSidebar 顶部横向图标按钮列表。
 *
 * 包含：
 *   - 导入下拉（上传文件 / 导入文件夹）
 *   - 文件夹管理、标签管理、自定义布局
 *
 * 由原 HomeSidebar 拆出，逻辑零改动。自定义布局对话框内聚在此处（layoutDialogOpen 仅本组件使用）。
 */
import type { LocalFsNode } from '../../../shared/types'
import ImportDropdown from './ImportDropdown.vue'
import { useMediaStore } from '@/renderer/stores/media'
import { useMediaQuery } from '@vueuse/core'

defineOptions({ name: 'SidebarToolbar' })

const emit = defineEmits<{
  /** 打开文件上传对话框 */
  upload: []
  /** 导入本地文件夹：抛出根路径 + 递归目录树给父级 */
  importFolder: [payload: { rootPath: string; tree: LocalFsNode[] }]
  /** 打开文件夹管理对话框 */
  manageFolders: []
  /** 打开标签管理对话框 */
  manageTags: []
}>()

const mediaStore = useMediaStore()
const isMobile = useMediaQuery('(max-width: 767px)')

function closeDrawerIfMobile() {
  if (isMobile.value) mediaStore.showLeftSidebar = false
}

/** 文件夹管理：关闭抽屉后抛事件给父级 */
function handleManageFolders() {
  closeDrawerIfMobile()
  emit('manageFolders')
}

/** 标签管理：关闭抽屉后抛事件给父级 */
function handleManageTags() {
  closeDrawerIfMobile()
  emit('manageTags')
}
</script>

<template>
  <!-- 顶部横向图标按钮列表 -->
  <div class="shrink-0 flex items-center gap-1.5 px-2 py-2">
    <ImportDropdown @upload="emit('upload')" @import-folder="emit('importFolder', $event)" />

    <!-- 文件夹管理 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :title="$t('views.sidebarToolbar.manageFolders')"
      @click="handleManageFolders"
    >
      <span class="material-icons leading-none" style="font-size: 18px">drive_file_move</span>
    </button>

    <!-- 标签管理 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :title="$t('views.sidebarToolbar.manageTags')"
      @click="handleManageTags"
    >
      <span class="material-icons leading-none" style="font-size: 18px">sell</span>
    </button>

  </div>
</template>
