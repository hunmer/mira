<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Library } from '@/types/mira'
import { libraryApi } from '@/api'
import { useLibrary } from '@/composables/useLibrary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import LibraryFormDialog from './LibraryFormDialog.vue'
import type { LibraryFormData } from './LibraryFormDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { toast } from 'vue-sonner'
import {
  RiAddLine, RiSearchLine, RiEditLine, RiDeleteBinLine,
} from '@remixicon/vue'

const { t } = useI18n()
const { confirmDialog, requireConfirm } = useConfirmDialog()
const { loadLibraries: refreshGlobalLibs } = useLibrary()
const libraries = ref<Library[]>([])
const loading = ref(false)
const searchQuery = ref('')
const dialogOpen = ref(false)
const editingLib = ref<(LibraryFormData & { _id?: string }) | null>(null)

const filtered = computed(() => {
  if (!searchQuery.value) return libraries.value
  const q = searchQuery.value.toLowerCase()
  return libraries.value.filter((l) => l.name.toLowerCase().includes(q) || l.path.toLowerCase().includes(q))
})

async function loadLibraries() {
  loading.value = true
  try {
    const res = await libraryApi.list()
    libraries.value = Array.isArray(res.data) ? res.data : []
    refreshGlobalLibs()
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

function getDefaultForm(): LibraryFormData {
  return {
    name: '', path: '', description: '',
    icon: '', enableHash: false, enableAutoSync: false, enableThumbScan: true, enableAutoBackup: true,
    pluginsDir: '',
    allowedRoles: ['super', 'admin', 'user'],
    syncFilterMode: 'blacklist',
    syncBlacklist: '',
    syncWhitelist: '',
  }
}

function openCreate() {
  editingLib.value = { ...getDefaultForm() }
  dialogOpen.value = true
}

function openEdit(lib: Library) {
  editingLib.value = {
    ...getDefaultForm(),
    name: lib.name,
    path: lib.path,
    description: lib.description ?? '',
    icon: lib.icon ?? '',
    pluginsDir: lib.pluginsDir ?? '',
    enableHash: lib.customFields?.enableHash ?? false,
    enableAutoSync: lib.customFields?.enableAutoSync ?? false,
    enableThumbScan: lib.customFields?.enableThumbScan ?? true,
    enableAutoBackup: lib.customFields?.enableAutoBackup ?? true,
    syncFilterMode: (lib.customFields?.syncFilterMode === 'whitelist' ? 'whitelist' : 'blacklist'),
    syncBlacklist: lib.customFields?.syncBlacklist ?? '',
    syncWhitelist: lib.customFields?.syncWhitelist ?? '',
    allowedRoles: (lib as any).allowedRoles ?? ['super', 'admin', 'user'],
    _id: lib.id,
  }
  dialogOpen.value = true
}

async function handleSave() {
  if (!editingLib.value) return
  try {
    const {
      _id, enableHash, enableAutoSync, enableThumbScan, enableAutoBackup,
      syncFilterMode, syncBlacklist, syncWhitelist,
      ...rest
    } = editingLib.value as LibraryFormData & { _id?: string }
    const data = {
      ...rest,
      customFields: {
        enableHash, enableAutoSync, enableThumbScan, enableAutoBackup,
        syncFilterMode, syncBlacklist, syncWhitelist,
      },
    }
    if (_id) {
      await libraryApi.update(_id, data)
    } else {
      await libraryApi.create(data)
    }
    toast.success(t('common.success'))
    dialogOpen.value = false
    await loadLibraries()
  } catch {
    toast.error(t('common.failed'))
  }
}

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
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('library.title') }}</h1>
      <Button @click="openCreate">
        <RiAddLine class="mr-2 size-4" /> {{ t('library.createLibrary') }}
      </Button>
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
      @update:open="dialogOpen = $event"
      @save="handleSave"
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
