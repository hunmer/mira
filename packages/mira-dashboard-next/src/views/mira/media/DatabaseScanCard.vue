<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, Trash2Icon, UploadIcon } from '@lucide/vue'
import { fileManagerApi } from '@/api'
import { useLibrary } from '@/composables/useLibrary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

interface ScannedFile {
  id?: number
  name: string
  path: string
}

const PAGE_SIZE = 10
const { t } = useI18n()
const { selectedId } = useLibrary()
const { confirmDialog, requireConfirm } = useConfirmDialog()
const scanningMissing = ref(false)
const clearingMissing = ref(false)
const findingNew = ref(false)
const importingNew = ref(false)
const deletingNew = ref(false)
const missingFiles = ref<ScannedFile[]>([])
const newFiles = ref<ScannedFile[]>([])
const missingPage = ref(1)
const newPage = ref(1)

const missingPageCount = computed(() => Math.max(1, Math.ceil(missingFiles.value.length / PAGE_SIZE)))
const newPageCount = computed(() => Math.max(1, Math.ceil(newFiles.value.length / PAGE_SIZE)))
const pagedMissingFiles = computed(() => missingFiles.value.slice((missingPage.value - 1) * PAGE_SIZE, missingPage.value * PAGE_SIZE))
const pagedNewFiles = computed(() => newFiles.value.slice((newPage.value - 1) * PAGE_SIZE, newPage.value * PAGE_SIZE))

watch(selectedId, () => {
  missingFiles.value = []
  newFiles.value = []
  missingPage.value = 1
  newPage.value = 1
})

function errorMessage(error: any, fallback: string) {
  return error.response?.data?.error || error.message || fallback
}

async function scanMissing() {
  if (!selectedId.value) return
  scanningMissing.value = true
  try {
    const res = await fileManagerApi.scanMissing(selectedId.value)
    missingFiles.value = res.data.data || []
    missingPage.value = 1
    toast.success(t('databaseScan.missingResult', { count: missingFiles.value.length }))
  } catch (error: any) {
    toast.error(errorMessage(error, t('databaseScan.scanFailed')))
  } finally {
    scanningMissing.value = false
  }
}

async function clearMissing() {
  if (!selectedId.value || missingFiles.value.length === 0) return
  if (!await requireConfirm({
    title: t('databaseScan.clearMissingTitle'),
    description: t('databaseScan.clearConfirm', { count: missingFiles.value.length }),
    confirmText: t('databaseScan.clearRecords'),
  })) return
  clearingMissing.value = true
  try {
    const res = await fileManagerApi.clearMissing(selectedId.value)
    toast.success(t('databaseScan.clearResult', { count: res.data.data?.removed || 0 }))
    missingFiles.value = []
    missingPage.value = 1
  } catch (error: any) {
    toast.error(errorMessage(error, t('databaseScan.clearFailed')))
  } finally {
    clearingMissing.value = false
  }
}

async function findNewFiles() {
  if (!selectedId.value) return
  findingNew.value = true
  try {
    const res = await fileManagerApi.findNewFiles(selectedId.value)
    newFiles.value = res.data.data || []
    newPage.value = 1
    toast.success(t('databaseScan.newResult', { count: newFiles.value.length }))
  } catch (error: any) {
    toast.error(errorMessage(error, t('databaseScan.findFailed')))
  } finally {
    findingNew.value = false
  }
}

async function importNewFiles() {
  if (!selectedId.value || newFiles.value.length === 0) return
  importingNew.value = true
  try {
    const res = await fileManagerApi.importNewFiles(selectedId.value, newFiles.value.map(file => file.path))
    const imported = res.data.data || []
    toast.success(t('databaseScan.importResult', { count: imported.length }))
    newFiles.value = []
    newPage.value = 1
  } catch (error: any) {
    toast.error(errorMessage(error, t('databaseScan.importFailed')))
  } finally {
    importingNew.value = false
  }
}

async function clearNewFiles() {
  if (!selectedId.value || newFiles.value.length === 0) return
  if (!await requireConfirm({
    title: t('databaseScan.deleteNewTitle'),
    description: t('databaseScan.deleteNewConfirm', { count: newFiles.value.length }),
    confirmText: t('databaseScan.deleteFiles'),
  })) return
  deletingNew.value = true
  try {
    const res = await fileManagerApi.deleteNewFiles(selectedId.value, newFiles.value.map(file => file.path))
    toast.success(t('databaseScan.deleteNewResult', { count: res.data.data?.removed || 0 }))
    newFiles.value = []
    newPage.value = 1
  } catch (error: any) {
    toast.error(errorMessage(error, t('databaseScan.deleteNewFailed')))
  } finally {
    deletingNew.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('databaseScan.title') }}</CardTitle>
      <CardDescription>{{ t('databaseScan.subtitle') }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-8">
      <section class="space-y-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-sm font-semibold">{{ t('databaseScan.missingTitle') }}</h3>
            <p class="mt-1 text-xs text-muted-foreground">{{ t('databaseScan.missingDesc') }}</p>
          </div>
          <div class="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" :disabled="!selectedId || scanningMissing" @click="scanMissing">
              <SearchIcon class="mr-1 size-4" />
              {{ scanningMissing ? t('databaseScan.scanning') : t('databaseScan.scanMissing') }}
            </Button>
            <Button size="sm" variant="destructive" :disabled="!missingFiles.length || clearingMissing" @click="clearMissing">
              <Trash2Icon class="mr-1 size-4" />
              {{ clearingMissing ? t('databaseScan.clearing') : t('databaseScan.clearAll') }}
            </Button>
          </div>
        </div>
        <div class="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead class="w-20">ID</TableHead><TableHead>{{ t('common.name') }}</TableHead><TableHead>{{ t('databaseScan.path') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="file in pagedMissingFiles" :key="file.id">
                <TableCell>{{ file.id }}</TableCell><TableCell>{{ file.name }}</TableCell><TableCell class="max-w-0 truncate font-mono" :title="file.path">{{ file.path }}</TableCell>
              </TableRow>
              <TableRow v-if="!pagedMissingFiles.length"><TableCell colspan="3" class="h-20 text-center text-muted-foreground">{{ t('databaseScan.noMissing') }}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="missingFiles.length" class="flex items-center justify-between text-xs text-muted-foreground">
          <span>{{ t('databaseScan.total', { count: missingFiles.length }) }}</span>
          <div class="flex items-center gap-2"><Button size="icon" variant="outline" class="size-7" :disabled="missingPage <= 1" :title="t('databaseScan.previous')" @click="missingPage--"><ChevronLeftIcon class="size-4" /></Button><span>{{ missingPage }} / {{ missingPageCount }}</span><Button size="icon" variant="outline" class="size-7" :disabled="missingPage >= missingPageCount" :title="t('databaseScan.next')" @click="missingPage++"><ChevronRightIcon class="size-4" /></Button></div>
        </div>
      </section>

      <section class="space-y-3 border-t pt-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-sm font-semibold">{{ t('databaseScan.newTitle') }}</h3>
            <p class="mt-1 text-xs text-muted-foreground">{{ t('databaseScan.newDesc') }}</p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" :disabled="!selectedId || findingNew || importingNew || deletingNew" @click="findNewFiles">
              <SearchIcon class="mr-1 size-4" />
              {{ findingNew ? t('databaseScan.finding') : t('databaseScan.findNew') }}
            </Button>
            <Button size="sm" :disabled="!newFiles.length || importingNew || deletingNew" @click="importNewFiles">
              <UploadIcon class="mr-1 size-4" />
              {{ importingNew ? t('databaseScan.importing') : t('databaseScan.importAll') }}
            </Button>
            <Button size="sm" variant="destructive" :disabled="!newFiles.length || importingNew || deletingNew" @click="clearNewFiles">
              <Trash2Icon class="mr-1 size-4" />
              {{ deletingNew ? t('databaseScan.deleting') : t('databaseScan.clearAll') }}
            </Button>
          </div>
        </div>
        <div class="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead class="w-20">#</TableHead><TableHead>{{ t('common.name') }}</TableHead><TableHead>{{ t('databaseScan.path') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="(file, index) in pagedNewFiles" :key="file.path">
                <TableCell>{{ (newPage - 1) * PAGE_SIZE + index + 1 }}</TableCell><TableCell>{{ file.name }}</TableCell><TableCell class="max-w-0 truncate font-mono" :title="file.path">{{ file.path }}</TableCell>
              </TableRow>
              <TableRow v-if="!pagedNewFiles.length"><TableCell colspan="3" class="h-20 text-center text-muted-foreground">{{ t('databaseScan.noNew') }}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="newFiles.length" class="flex items-center justify-between text-xs text-muted-foreground">
          <span>{{ t('databaseScan.total', { count: newFiles.length }) }}</span>
          <div class="flex items-center gap-2"><Button size="icon" variant="outline" class="size-7" :disabled="newPage <= 1" :title="t('databaseScan.previous')" @click="newPage--"><ChevronLeftIcon class="size-4" /></Button><span>{{ newPage }} / {{ newPageCount }}</span><Button size="icon" variant="outline" class="size-7" :disabled="newPage >= newPageCount" :title="t('databaseScan.next')" @click="newPage++"><ChevronRightIcon class="size-4" /></Button></div>
        </div>
      </section>
    </CardContent>
    <ConfirmDialog
      v-bind="confirmDialog"
      @update:open="confirmDialog.open = $event"
      @confirm="confirmDialog.resolve(true)"
      @cancel="confirmDialog.resolve(false)"
    />
  </Card>
</template>
