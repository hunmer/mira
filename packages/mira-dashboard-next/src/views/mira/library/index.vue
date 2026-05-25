<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Library } from '@/types/mira'
import { libraryApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import {
  RiAddLine, RiSearchLine, RiEditLine, RiDeleteBinLine,
} from '@remixicon/vue'

const { t } = useI18n()
const libraries = ref<Library[]>([])
const loading = ref(false)
const searchQuery = ref('')
const dialogOpen = ref(false)
const editingLib = ref<Partial<Library> | null>(null)

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
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingLib.value = { name: '', path: '', type: 'local', description: '' }
  dialogOpen.value = true
}

function openEdit(lib: Library) {
  editingLib.value = { ...lib }
  dialogOpen.value = true
}

async function handleSave() {
  if (!editingLib.value) return
  try {
    if (editingLib.value.id) {
      await libraryApi.update(editingLib.value.id, editingLib.value)
    } else {
      await libraryApi.create(editingLib.value)
    }
    toast.success(t('common.success'))
    dialogOpen.value = false
    await loadLibraries()
  } catch {
    toast.error(t('common.failed'))
  }
}

async function handleDelete(id: string) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await libraryApi.delete(id)
    toast.success(t('common.success'))
    await loadLibraries()
  } catch {
    toast.error(t('common.failed'))
  }
}

onMounted(loadLibraries)
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
            <TableHead>{{ t('library.type') }}</TableHead>
            <TableHead>{{ t('common.status') }}</TableHead>
            <TableHead>{{ t('library.fileCount') }}</TableHead>
            <TableHead>{{ t('common.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell :colspan="6" class="py-8 text-center text-muted-foreground">{{ t('common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!filtered.length">
            <TableCell :colspan="6" class="py-8 text-center text-muted-foreground">{{ t('common.noData') }}</TableCell>
          </TableRow>
          <TableRow v-for="lib in filtered" :key="lib.id">
            <TableCell class="font-medium">{{ lib.name }}</TableCell>
            <TableCell class="max-w-[200px] truncate text-muted-foreground">{{ lib.path }}</TableCell>
            <TableCell>
              <Badge variant="outline">{{ lib.type === 'local' ? t('library.local') : t('library.remote') }}</Badge>
            </TableCell>
            <TableCell>
              <Badge :variant="lib.status === 'active' ? 'default' : 'secondary'">
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
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingLib?.id ? t('library.editLibrary') : t('library.createLibrary') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4" v-if="editingLib">
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('common.name') }}</label>
            <Input v-model="editingLib.name" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('library.path') }}</label>
            <Input v-model="editingLib.path" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('common.description') }}</label>
            <Input v-model="editingLib.description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button @click="handleSave">{{ t('common.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
