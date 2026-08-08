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
import { ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import SidebarLayoutDialog from './SidebarLayoutDialog.vue'
import { useToast } from '@/renderer/composables/useToast'
import type { LocalFsNode } from '../../../shared/types'

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

const toast = useToast()
const isImporting = ref(false)
const layoutDialogOpen = ref(false)

/**
 * 导入本地文件夹：
 * 1. 选择目录 -> 2. 递归读取目录树 -> 3. 抛给父级打开上传对话框
 */
async function handleImportFolder() {
  if (isImporting.value) return
  isImporting.value = true
  try {
    const dirRes = await window.electronAPI.fs.selectDirectory('选择要导入的文件夹')
    if (!dirRes.success || !dirRes.path) return // 用户取消

    const treeRes = await window.electronAPI.fs.readDirTree(dirRes.path)
    if (!treeRes.success || !treeRes.data) {
      toast.add({ severity: 'error', summary: '导入失败', detail: treeRes.message || '读取文件夹结构失败', life: 3000 })
      return
    }

    emit('importFolder', { rootPath: dirRes.path, tree: treeRes.data })
  } catch (error) {
    console.error('导入文件夹失败:', error)
    toast.add({
      severity: 'error',
      summary: '导入失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 3000,
    })
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <!-- 顶部横向图标按钮列表 -->
  <div class="shrink-0 flex items-center gap-1.5 px-2 py-2">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isImporting"
          title="导入"
        >
          <span class="material-icons leading-none" style="font-size: 18px">
            {{ isImporting ? 'hourglass_top' : 'drive_folder_upload' }}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-40">
        <DropdownMenuItem @click="emit('upload')">
          <span class="material-icons text-base mr-2">upload_file</span>
          <span>上传文件</span>
        </DropdownMenuItem>
        <DropdownMenuItem @click="handleImportFolder">
          <span class="material-icons text-base mr-2">folder_open</span>
          <span>导入文件夹</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- 文件夹管理 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="文件夹管理"
      @click="emit('manageFolders')"
    >
      <span class="material-icons leading-none" style="font-size: 18px">drive_file_move</span>
    </button>

    <!-- 标签管理 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="标签管理"
      @click="emit('manageTags')"
    >
      <span class="material-icons leading-none" style="font-size: 18px">sell</span>
    </button>

    <!-- 自定义布局 -->
    <button
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="自定义布局"
      @click="layoutDialogOpen = true"
    >
      <span class="material-icons leading-none" style="font-size: 18px">dashboard_customize</span>
    </button>
  </div>

  <!-- 自定义布局对话框 -->
  <SidebarLayoutDialog v-model="layoutDialogOpen" />
</template>
