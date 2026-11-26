<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { Library } from '@/types/mira'
import type { LibraryRelocationProgress, UpdateLibraryRequest } from 'mira-app-core/shared/sdk'
import { libraryApi } from '@/api'
import { useLibrary } from '@/composables/useLibrary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import LibraryFormDialog from './LibraryFormDialog.vue'
import type { LibraryFormData } from './LibraryFormDialog.vue'
import ImportDialog from './ImportDialog.vue'
import OpenLibraryDialog from './OpenLibraryDialog.vue'
import ShareDialog from './ShareDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { toast } from 'vue-sonner'
import {
  RiAddLine, RiSearchLine, RiEditLine, RiDeleteBinLine, RiShareLine,
  RiDownload2Line, RiDownloadCloudLine, RiFolderOpenLine,
} from '@remixicon/vue'

const { t } = useI18n()
const { confirmDialog, requireConfirm } = useConfirmDialog()
const { loadLibraries: refreshGlobalLibs } = useLibrary()
const libraries = ref<Library[]>([])
const loading = ref(false)
const searchQuery = ref('')
const dialogOpen = ref(false)
const editingLib = ref<(LibraryFormData & { _id?: string }) | null>(null)
const editingOriginalPath = ref('')
const saving = ref(false)
const relocationProgress = ref<LibraryRelocationProgress | null>(null)
let relocationTimer: ReturnType<typeof setTimeout> | null = null
const shareOpen = ref(false)
const sharingLib = ref<Library | null>(null)
const importOpen = ref(false)
const importSource = ref<'eagle' | 'billfish'>('eagle')
const openLibOpen = ref(false)

function openImport(source: 'eagle' | 'billfish') {
  importSource.value = source
  importOpen.value = true
}

const filtered = computed(() => {
  if (!searchQuery.value) return libraries.value
  const q = searchQuery.value.toLowerCase()
  return libraries.value.filter((l) => l.name.toLowerCase().includes(q) || l.path.toLowerCase().includes(q))
})

async function loadLibraries() {
  loading.value = true
  try {
    libraries.value = await libraryApi.list()
    await refreshGlobalLibs()
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

function getDefaultForm(): LibraryFormData {
  return {
    name: '', path: '', description: '',
    icon: '', enableHash: false, skipSameName: false, enableAutoSync: false, enableThumbScan: true, enableAutoBackup: true, importType: 'copy',
    enableDbMirror: false,
    pluginsDir: '',
    allowedRoles: ['super', 'admin', 'user'],
    syncFilterMode: 'blacklist',
    syncBlacklist: '',
    syncWhitelist: '',
  }
}

function openCreate() {
  editingOriginalPath.value = ''
  relocationProgress.value = null
  promptedPath = ''
  editingLib.value = { ...getDefaultForm() }
  dialogOpen.value = true
}

function openShare(lib: Library) {
  sharingLib.value = lib
  shareOpen.value = true
}

function openEdit(lib: Library) {
  editingOriginalPath.value = lib.path
  relocationProgress.value = null
  editingLib.value = {
    ...getDefaultForm(),
    name: lib.name,
    path: lib.path,
    description: lib.description ?? '',
    icon: lib.icon ?? '',
    pluginsDir: lib.pluginsDir ?? '',
    enableHash: lib.customFields?.enableHash ?? false,
    skipSameName: lib.customFields?.skipSameName ?? false,
    enableAutoSync: lib.customFields?.enableAutoSync ?? false,
    enableThumbScan: lib.customFields?.enableThumbScan ?? true,
    enableAutoBackup: lib.customFields?.enableAutoBackup ?? true,
    enableDbMirror: lib.customFields?.enableDbMirror ?? false,
    importType: ['copy', 'move', 'link'].includes(lib.customFields?.importType) ? lib.customFields?.importType as 'copy' | 'move' | 'link' : 'copy',
    syncFilterMode: (lib.customFields?.syncFilterMode === 'whitelist' ? 'whitelist' : 'blacklist'),
    syncBlacklist: lib.customFields?.syncBlacklist ?? '',
    syncWhitelist: lib.customFields?.syncWhitelist ?? '',
    allowedRoles: (lib as any).allowedRoles ?? ['super', 'admin', 'user'],
    _id: lib.id,
  }
  dialogOpen.value = true
}

// 创建素材库时检测所选目录：若已是素材库目录，提示是否导入
let pathCheckTimer: ReturnType<typeof setTimeout> | null = null
let promptedPath = ''

watch(() => editingLib.value?.path, (path) => {
  if (pathCheckTimer) clearTimeout(pathCheckTimer)
  // 仅创建模式且对话框打开时检测；编辑模式路径变更走迁移流程
  if (!dialogOpen.value || editingLib.value?._id || !path?.trim()) return
  const target = path.trim()
  if (target === promptedPath) return
  pathCheckTimer = setTimeout(() => {
    pathCheckTimer = null
    void checkExistingLibrary(target)
  }, 500)
})

async function checkExistingLibrary(p: string) {
  // 对话框已关闭或路径已变化则不提示
  if (!dialogOpen.value || !editingLib.value || editingLib.value._id) return
  if ((editingLib.value.path || '').trim() !== p) return
  try {
    const result = await libraryApi.checkPath(p)
    if (!result.isLibrary) return
    if (result.registered) {
      toast.info(t('library.alreadyInList'))
      return
    }
    promptedPath = p
    const ok = await requireConfirm({
      title: t('library.createLibrary'),
      description: t('library.existingLibraryPrompt'),
      confirmText: t('library.importExisting'),
    })
    if (!ok) return
    // 导入已有素材库：以目录名作为库名，保持原路径不变（服务端将打开已有 library_data.db）
    await libraryApi.create({ name: result.name, path: p, description: '' })
    toast.success(t('common.success'))
    dialogOpen.value = false
    editingLib.value = null
    await loadLibraries()
  } catch (error: any) {
    toast.error(error?.response?.data?.error || error?.message || t('common.failed'))
  }
}

onBeforeUnmount(() => {
  if (pathCheckTimer) clearTimeout(pathCheckTimer)
})

async function handleSave() {
  if (!editingLib.value || saving.value) return
  saving.value = true
  try {
    const {
      _id, enableHash, skipSameName, enableAutoSync, enableThumbScan, enableAutoBackup, enableDbMirror, importType,
      syncFilterMode, syncBlacklist, syncWhitelist,
      ...rest
    } = editingLib.value as LibraryFormData & { _id?: string }
    const data = {
      ...rest,
      customFields: {
        enableHash, skipSameName, enableAutoSync, enableThumbScan, enableAutoBackup, enableDbMirror, importType,
        syncFilterMode, syncBlacklist, syncWhitelist,
      },
    }
    if (_id && data.path !== editingOriginalPath.value) {
      const result = await libraryApi.relocate(_id, data.path)
      relocationProgress.value = {
        id: result.relocationId,
        libraryId: _id,
        sourcePath: editingOriginalPath.value,
        destinationPath: data.path,
        status: 'preparing',
        totalFiles: 0,
        movedFiles: 0,
        totalBytes: 0,
        movedBytes: 0,
        current: '',
        startedAt: Date.now(),
      }
      pollRelocation(_id, result.relocationId, data)
      return
    } else if (_id) {
      await libraryApi.update(_id, data)
    } else {
      await libraryApi.create(data)
    }
    toast.success(t('common.success'))
    dialogOpen.value = false
    await loadLibraries()
  } catch (error: any) {
    toast.error(error?.response?.data?.error || error?.message || t('common.failed'))
  } finally {
    if (!relocationTimer) saving.value = false
  }
}

function stopRelocationPolling() {
  if (relocationTimer) clearTimeout(relocationTimer)
  relocationTimer = null
}

function pollRelocation(id: string, relocationId: string, data: UpdateLibraryRequest) {
  stopRelocationPolling()
  const poll = async () => {
    try {
      const progress = await libraryApi.getRelocationProgress(id, relocationId)
      relocationProgress.value = progress
      if (progress.status === 'completed') {
        stopRelocationPolling()
        editingOriginalPath.value = progress.destinationPath
        await libraryApi.update(id, data)
        toast.success(t('library.relocationCompleted'))
        dialogOpen.value = false
        await loadLibraries()
        saving.value = false
        return
      }
      if (progress.status === 'error') {
        stopRelocationPolling()
        toast.error(`${t('common.failed')}: ${progress.error ?? ''}`)
        await loadLibraries()
        saving.value = false
        return
      }
      relocationTimer = setTimeout(poll, 500)
    } catch (error: any) {
      stopRelocationPolling()
      toast.error(error?.response?.data?.error || error?.message || t('common.failed'))
      saving.value = false
    }
  }
  relocationTimer = setTimeout(poll, 200)
}

onBeforeUnmount(stopRelocationPolling)

async function handleDelete(id: string) {
  if (!(await requireConfirm({
    description: t('library.deleteOnlyRemoveFromList'),
  }))) return
  try {
    await libraryApi.delete(id)
    toast.success(t('common.success'))
    await loadLibraries()
  } catch {
    toast.error(t('common.failed'))
  }
}

async function toggleStatus(lib: Library) {
  const next = lib.status === 'active' ? 'inactive' : 'active'
  try {
    await libraryApi.toggleStatus(lib.id, next)
    toast.success(t('common.success'))
    await loadLibraries()
  } catch {
    toast.error(t('common.failed'))
  }
}

await loadLibraries()

// 支持 URL 参数直接打开指定素材库编辑面板：/dashboard/#/library?lib=<id>
const route = useRoute()
const router = useRouter()
const requestedLibId = route.query.lib ? String(route.query.lib) : null
if (requestedLibId) {
  const target = libraries.value.find(l => l.id === requestedLibId)
  if (target) openEdit(target)
  void router.replace({ query: { ...route.query, lib: undefined } })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('library.title') }}</h1>
      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              <RiDownload2Line class="mr-2 size-4" /> {{ t('library.importFrom') }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="openImport('eagle')">
              <RiDownloadCloudLine class="mr-2 size-4" /> {{ t('library.importEagle') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="openImport('billfish')">
              <RiDownloadCloudLine class="mr-2 size-4" /> {{ t('library.importBillfish') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" @click="openLibOpen = true">
          <RiFolderOpenLine class="mr-2 size-4" /> {{ t('library.openLibrary') }}
        </Button>
        <Button @click="openCreate">
          <RiAddLine class="mr-2 size-4" /> {{ t('library.createLibrary') }}
        </Button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="relative max-w-sm flex-1">
        <RiSearchLine class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="searchQuery" :placeholder="t('common.search')" class="pl-9" />
      </div>
    </div>

    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('common.name') }}</TableHead>
            <TableHead>{{ t('library.path') }}</TableHead>
            <TableHead>{{ t('common.status') }}</TableHead>
            <TableHead>{{ t('library.fileCount') }}</TableHead>
            <TableHead>{{ t('common.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!filtered.length">
            <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.noData') }}</TableCell>
          </TableRow>
          <TableRow v-for="lib in filtered" :key="lib.id">
            <TableCell class="font-medium">{{ lib.name }}</TableCell>
            <TableCell class="max-w-[200px] truncate text-muted-foreground">{{ lib.path }}</TableCell>
            <TableCell>
              <Badge
                class="cursor-pointer select-none"
                :variant="lib.status === 'active' ? 'default' : 'secondary'"
                @click="toggleStatus(lib)"
              >
                {{ lib.status === 'active' ? t('library.active') : t('library.inactive') }}
              </Badge>
            </TableCell>
            <TableCell>{{ lib.fileCount }}</TableCell>
            <TableCell>
              <div class="flex gap-1">
                <Button variant="ghost" size="icon" :title="t('library.share')" @click="openShare(lib)">
                  <RiShareLine class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="openEdit(lib)">
                  <RiEditLine class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="handleDelete(lib.id)">
                  <RiDeleteBinLine class="size-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create/Edit Dialog -->
    <LibraryFormDialog
      v-model="editingLib"
      :open="dialogOpen"
      :is-edit="!!editingLib?._id"
      :saving="saving"
      :relocation-progress="relocationProgress"
      @update:open="dialogOpen = $event"
      @save="handleSave"
    />

    <!-- Import from Eagle/Billfish -->
    <ImportDialog
      :open="importOpen"
      :source="importSource"
      @update:open="importOpen = $event"
      @imported="loadLibraries"
    />

    <!-- Open an existing library folder -->
    <OpenLibraryDialog
      v-model:open="openLibOpen"
      @imported="loadLibraries"
    />

    <!-- Share dialog -->
    <ShareDialog
      :open="shareOpen"
      :library="sharingLib"
      @update:open="shareOpen = $event"
    />

    <!-- Delete confirmation -->
    <ConfirmDialog
      v-bind="confirmDialog"
      @update:open="confirmDialog.open = $event"
      @confirm="confirmDialog.resolve(true)"
      @cancel="confirmDialog.resolve(false)"
    />
  </div>
</template>
