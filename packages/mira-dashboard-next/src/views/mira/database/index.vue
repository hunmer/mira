<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Library, DatabaseTable, DatabaseRow } from '@/types/mira'
import { libraryApi } from '@/api'
import client from '@/api/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const libraries = ref<Library[]>([])
const selectedLib = ref('')
const tables = ref<DatabaseTable[]>([])
const selectedTable = ref('')
const rows = ref<DatabaseRow[]>([])
const columns = ref<string[]>([])
const loading = ref(false)

async function loadLibraries() {
  try {
    const res = await libraryApi.list()
    libraries.value = Array.isArray(res.data) ? res.data : []
  } catch { /* ignore */ }
}

async function loadTables() {
  if (!selectedLib.value) return
  loading.value = true
  try {
    const res = await client.get(`/libraries/${selectedLib.value}/tables`)
    tables.value = Array.isArray(res.data) ? res.data : []
    if (tables.value.length) selectedTable.value = tables.value[0].name
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

async function loadTableData() {
  if (!selectedLib.value || !selectedTable.value) return
  loading.value = true
  try {
    const res = await client.get(`/libraries/${selectedLib.value}/tables/${selectedTable.value}/rows`)
    const data = Array.isArray(res.data) ? res.data : []
    rows.value = data
    columns.value = data.length ? Object.keys(data[0]) : []
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

watch(selectedLib, () => { tables.value = []; rows.value = []; columns.value = []; loadTables() })
watch(selectedTable, () => { loadTableData() })

onMounted(loadLibraries)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ t('database.title') }}</h1>

    <div class="flex items-center gap-4">
      <Select v-model="selectedLib">
        <SelectTrigger class="w-64">
          <SelectValue :placeholder="t('database.selectLibrary')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</SelectItem>
        </SelectContent>
      </Select>

      <Select v-if="tables.length" v-model="selectedTable">
        <SelectTrigger class="w-64">
          <SelectValue :placeholder="t('database.tables')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="tbl in tables" :key="tbl.name" :value="tbl.name">{{ tbl.name }} ({{ tbl.rowCount }})</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <Card v-if="loading">
      <CardContent class="space-y-3 p-6">
        <Skeleton v-for="i in 5" :key="i" class="h-8" />
      </CardContent>
    </Card>

    <div v-else-if="columns.length" class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead v-for="col in columns" :key="col">{{ col }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, i) in rows" :key="i">
            <TableCell v-for="col in columns" :key="col">{{ row[col] }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-else-if="selectedLib" class="py-12 text-center text-muted-foreground">
      {{ t('common.noData') }}
    </div>
  </div>
</template>
