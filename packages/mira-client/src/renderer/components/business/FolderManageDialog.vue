<script setup lang="ts">
/**
 * 文件夹管理对话框
 * 用 3D 动画卡片展示所有文件夹，悬停时扇形展开前几张缩略图预览，
 * 点击卡片抛回原始 Folder，由父级走 handleFolderSelect 打开对应 tab。
 *
 * 数据源直接用 store 的扁平数组（不依赖 folderTree computed 的根节点判定，
 * 后者在 parent_id 为 null/0 时可能过滤掉全部节点），所有文件夹都会展示。
 *
 * 搜索栏右侧提供 dots 菜单：扫描空文件夹 -> 确认后批量删除。
 */
import { computed, ref } from 'vue'
import GroupedCardBrowserDialog, { type BrowserItem } from './GroupedCardBrowserDialog.vue'
import AnimatedFolderCard from './AnimatedFolderCard.vue'
import { useFolderStore } from '@renderer/stores/folder'
import { useLibraryStore } from '@renderer/stores/library'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

defineOptions({ name: 'FolderManageDialog' })

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [folder: any]
}>()

const folderStore = useFolderStore()
const libraryStore = useLibraryStore()

// 扁平展示所有文件夹，与侧栏树共享同一份数据
const items = computed<BrowserItem[]>(() =>
  (folderStore.folders || []).map((f: any) => ({
    raw: f,
    label: f.title || f.name || `Folder ${f.id}`,
    count: f.fileCount,
    icon: 'folder',
    color: f.color,
    description: f.description,
  }))
)

// 批量删除：逐个调用 SDK，完成后强制刷新文件夹列表
const handleBatchDelete = async (raws: any[], deleteWithFiles: boolean) => {
  const libraryId = libraryStore.currentLibrary?.id
  if (!libraryId || !raws.length) return
  for (const folder of raws) {
    try {
      await miraSDKService.deleteFolder(libraryId, parseInt(String(folder.id), 10), deleteWithFiles)
    } catch (error) {
      console.error(`Failed to delete folder ${folder?.id}:`, error)
    }
  }
  await folderStore.fetchFolders(libraryId, true)
}

// ----------------------------------------
// 空文件夹清理：dots 菜单 -> 扫描 -> 确认 -> 批量删除
// ----------------------------------------
const isScanningEmptyFolders = ref(false)
const showEmptyScanDialog = ref(false)
const pendingEmptyFolders = ref<any[]>([])

/**
 * 扫描空文件夹：空 = 子树内（含子孙文件夹）非回收文件总数为 0。
 * file_count 是后端 getAllFolders 返回的直接文件数（snake_case），兼容 fileCount。
 */
const collectEmptyFolders = (folders: any[]): any[] => {
  const childrenOf = new Map<number, any[]>()
  const roots: any[] = []
  for (const f of folders) {
    if (!f.parent_id) {
      roots.push(f)
    } else {
      const list = childrenOf.get(f.parent_id)
      if (list) list.push(f)
      else childrenOf.set(f.parent_id, [f])
    }
  }

  const visited = new Set<number>()
  const empty: { folder: any; depth: number }[] = []

  // 返回以 folder 为根的子树文件总数；全空的文件夹收集进 empty
  const walk = (folder: any, depth: number): number => {
    visited.add(folder.id)
    let total = Number(folder.file_count ?? folder.fileCount ?? 0) || 0
    for (const child of childrenOf.get(folder.id) || []) {
      total += walk(child, depth + 1)
    }
    if (total === 0) empty.push({ folder, depth })
    return total
  }
  for (const root of roots) walk(root, 0)
  // 孤儿节点（parent_id 指向已不存在的文件夹）按根处理，避免漏扫
  for (const f of folders) {
    if (!visited.has(f.id)) walk(f, 0)
  }

  // 深度优先：子文件夹先删，父文件夹递归删除子树后不会残留已删行
  return empty.sort((a, b) => b.depth - a.depth).map(e => e.folder)
}

const handleScanEmptyFolders = async () => {
  const libraryId = libraryStore.currentLibrary?.id
  if (!libraryId || isScanningEmptyFolders.value) return
  isScanningEmptyFolders.value = true
  try {
    // 强制刷新拿最新 file_count 再判定
    const result = await folderStore.fetchFolders(libraryId, true)
    if (!result.success) return
    pendingEmptyFolders.value = collectEmptyFolders(folderStore.folders || [])
    showEmptyScanDialog.value = true
  } finally {
    isScanningEmptyFolders.value = false
  }
}

// 注意：不要在关闭路径清空 pendingEmptyFolders —— reka-ui AlertDialogAction 的内部
// 关闭处理器先于外部 @click 执行（mergeProps 顺序），关闭时会同步触发 update:open，
// 若此时清空 pending，随后执行的 @click 读到的就是空数组，导致确认删除静默失效。
const closeEmptyScanDialog = () => {
  showEmptyScanDialog.value = false
}

const confirmDeleteEmptyFolders = () => {
  // 空文件夹内没有文件，deleteFiles=false 即可，不会影响任何素材
  const raws = pendingEmptyFolders.value
  showEmptyScanDialog.value = false
  if (!raws.length) return
  pendingEmptyFolders.value = []
  handleBatchDelete(raws, false)
}
</script>

<template>
  <GroupedCardBrowserDialog
    :visible="props.visible"
    :title="$t('business.folderManageDialog.title')"
    :item-type-label="$t('business.folderManageDialog.itemTypeLabel')"
    empty-icon="folder_off"
    :items="items"
    :card-component="AnimatedFolderCard"
    :card-props="{ size: 160 }"
    :library-id="libraryStore.currentLibrary?.id"
    :delete-with-files="true"
    @update:visible="emit('update:visible', $event)"
    @select="emit('select', $event)"
    @batch-delete="handleBatchDelete"
  >
    <template #toolbar-extra>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            :disabled="isScanningEmptyFolders"
            :title="$t('business.folderManageDialog.moreActions')"
          >
            <span class="material-icons" style="font-size: 18px">more_vert</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            :disabled="isScanningEmptyFolders"
            @click="handleScanEmptyFolders"
          >
            <span class="material-icons" style="font-size: 16px">folder_delete</span>
            {{ isScanningEmptyFolders
              ? $t('business.folderManageDialog.scanningEmptyFolders')
              : $t('business.folderManageDialog.deleteEmptyFolders') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </GroupedCardBrowserDialog>

  <!-- 空文件夹扫描结果：无空文件夹提示 / 删除确认 -->
  <AlertDialog v-if="showEmptyScanDialog" :open="true" @update:open="!$event && closeEmptyScanDialog()">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ pendingEmptyFolders.length
            ? $t('business.folderManageDialog.emptyConfirmTitle')
            : $t('business.folderManageDialog.noEmptyTitle') }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ pendingEmptyFolders.length
            ? $t('business.folderManageDialog.emptyConfirmDesc', { count: pendingEmptyFolders.length })
            : $t('business.folderManageDialog.noEmptyDesc') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel v-if="pendingEmptyFolders.length" @click="closeEmptyScanDialog">
          {{ $t('business.folderManageDialog.cancel') }}
        </AlertDialogCancel>
        <!-- 不能用三元式按 pendingEmptyFolders.length 分支：点击瞬间内部关闭先清状态，分支会错 -->
        <AlertDialogAction
          v-if="pendingEmptyFolders.length"
          class="bg-destructive text-white hover:bg-destructive/90"
          @click="confirmDeleteEmptyFolders"
        >
          {{ $t('business.folderManageDialog.delete') }}
        </AlertDialogAction>
        <AlertDialogAction v-else @click="closeEmptyScanDialog">
          {{ $t('business.folderManageDialog.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
