<script setup lang="ts">
import { ref, onActivated, onDeactivated, nextTick } from 'vue'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/renderer/composables/useToast'
import type { LocalFsNode } from '../../../shared/types'

defineOptions({ name: 'HomeSidebar' })

defineProps<{
  homeController: {
    folderTree: { value: any[] }
    selectedFolder: { value: any }
    handleFolderExpand: (...args: any[]) => void
    toggleSearch: () => void
  }
  tags: any[]
}>()

const emit = defineEmits<{
  folderSelect: [folder: any]
  tagSelect: [tag: any]
  refreshFolders: []
  refreshTags: []
  emptyTrash: []
  /** 导入本地文件夹：抛出根路径 + 递归目录树给父级 */
  importFolder: [payload: { rootPath: string; tree: LocalFsNode[] }]
}>()

const toast = useToast()
const isImporting = ref(false)

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
      life: 3000
    })
  } finally {
    isImporting.value = false
  }
}

// keep-alive 滚动位置保持
const sidebarScrollRef = ref<HTMLElement>()
const savedScrollTop = ref(0)
const folderTreeRef = ref<{ locateNode: (id: string) => Promise<boolean> }>()
const tagTreeRef = ref<{ locateNode: (id: string) => Promise<boolean> }>()

onDeactivated(() => {
  if (sidebarScrollRef.value) {
    savedScrollTop.value = sidebarScrollRef.value.scrollTop
  }
})

onActivated(() => {
  nextTick(() => {
    if (sidebarScrollRef.value) {
      sidebarScrollRef.value.scrollTop = savedScrollTop.value
    }
  })
})

const locateItem = async (type: 'folder' | 'tag', id: string) => {
  await nextTick()
  const container = sidebarScrollRef.value
  console.log('[DEBUG-locate-sidebar] sidebar locateItem start', {
    type,
    id,
    hasContainer: Boolean(container),
    hasFolderTreeRef: Boolean(folderTreeRef.value),
    hasTagTreeRef: Boolean(tagTreeRef.value),
  })
  if (!container) return

  let nodeId = id
  if (type === 'tag' && !id.startsWith('tag-')) {
    nodeId = `tag-${id}`
  } else if (type === 'folder' && id.startsWith('folder-')) {
    nodeId = id.slice('folder-'.length)
  }

  const tree = type === 'tag' ? tagTreeRef.value : folderTreeRef.value
  console.log('[DEBUG-locate-sidebar] sidebar normalized target', {
    type,
    nodeId,
    hasTreeRef: Boolean(tree),
  })
  const locatedByTree = await tree?.locateNode(nodeId)
  console.log('[DEBUG-locate-sidebar] sidebar tree locate result', {
    nodeId,
    locatedByTree,
  })
  if (locatedByTree) return

  const el = container.querySelector(`[data-folder-tree-node-id="${nodeId}"]`) as HTMLElement
  console.log('[DEBUG-locate-sidebar] sidebar fallback query', {
    nodeId,
    found: Boolean(el),
  })
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({ locateItem })
</script>

<template>
  <!-- 顶部横向图标按钮列表 -->
  <div class="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-border dark:border-border">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          class="flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isImporting"
          title="导入"
        >
          <span class="material-icons leading-none" style="font-size: 18px">
            {{ isImporting ? 'hourglass_top' : 'drive_folder_upload' }}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-40">
        <DropdownMenuItem @click="handleImportFolder">
          <span class="material-icons text-base mr-2">folder_open</span>
          <span>导入文件夹</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  <!-- 文件夹树形导航 -->
  <div ref="sidebarScrollRef" class="flex-grow p-2 overflow-y-auto min-w-0 space-y-4">
    <FolderTreeComponent
      ref="folderTreeRef"
      item-type="folder"
      :draggable="true"
      :folders="homeController.folderTree.value"
      :selected-key="homeController.selectedFolder.value"
      :show-base-categories="true"
      @select="emit('folderSelect', $event)"
      @expand="homeController.handleFolderExpand"
      @refresh="emit('refreshFolders')"
      @empty-trash="emit('emptyTrash')"
    />
    <FolderTreeComponent
      ref="tagTreeRef"
      item-type="tag"
      :tags="tags"
      @select="emit('tagSelect', $event)"
      @refresh="emit('refreshTags')"
    />
  </div>
  <!-- 底部搜索胶囊 -->
  <div class="shrink-0 px-2 pb-2 pt-1">
    <button
      class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-muted border border-border dark:border-border hover:bg-muted dark:hover:bg-muted transition-colors cursor-pointer text-muted-foreground text-xs"
      @click="homeController.toggleSearch"
    >
      <span class="material-icons text-sm">search</span>
      <span>搜索</span>
    </button>
  </div>
</template>
