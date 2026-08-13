<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, Trash2Icon } from '@lucide/vue'
import { fileManagerApi } from '@/api'
import { useLibrary } from '@/composables/useLibrary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ScannedFile {
  id: number
  name: string
  path: string
}

const PAGE_SIZE = 10
const { t } = useI18n()
const { selectedId, selectedLibrary } = useLibrary()
const scanningMissing = ref(false)
const clearingMissing = ref(false)
const findingNew = ref(false)
const missingFiles = ref<ScannedFile[]>([])
const newFiles = ref<ScannedFile[]>([])
const missingPage = ref(1)
const newPage = ref(1)

const autoSyncEnabled = computed(() => selectedLibrary.value?.customFields?.enableAutoSync ?? true)
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
  if (!confirm(t('databaseScan.clearConfirm', { count: missingFiles.value.length }))) return
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
  if (!selectedId.value || autoSyncEnabled.value) return
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
            <p class="mt-1 text-xs text-muted-foreground">{{ autoSyncEnabled ? t('databaseScan.disableAutoSync') : t('databaseScan.newDesc') }}</p>
          </div>
          <Button size="sm" variant="outline" :disabled="!selectedId || autoSyncEnabled || findingNew" @click="findNewFiles">
            <SearchIcon class="mr-1 size-4" />
            {{ findingNew ? t('databaseScan.finding') : t('databaseScan.findNew') }}
          </Button>
        </div>
        <div class="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead class="w-20">ID</TableHead><TableHead>{{ t('common.name') }}</TableHead><TableHead>{{ t('databaseScan.path') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="file in pagedNewFiles" :key="file.id">
                <TableCell>{{ file.id }}</TableCell><TableCell>{{ file.name }}</TableCell><TableCell class="max-w-0 truncate font-mono" :title="file.path">{{ file.path }}</TableCell>
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
  </Card>
</template>
