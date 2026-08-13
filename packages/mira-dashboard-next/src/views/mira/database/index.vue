<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DatabaseTable, DatabaseRow } from '@/types/mira'
import { useLibrary } from '@/composables/useLibrary'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const { selectedId: selectedLib } = useLibrary()
const tables = ref<DatabaseTable[]>([])
const rows = ref<DatabaseRow[]>([])
const columns = ref<string[]>([])
const loading = ref(false)

// SQL 查询
const showSqlDialog = ref(false)
const sqlQuery = ref('')
const sqlResult = ref<any[]>([])
const sqlColumns = computed(() => sqlResult.value.length ? Object.keys(sqlResult.value[0]) : [])

// 表数据对话框
const showDataDialog = ref(false)
const dataTableName = ref('')
const dataRows = ref<any[]>([])
const dataColumns = computed(() => dataRows.value.length ? Object.keys(dataRows.value[0]) : [])
const dataLoading = ref(false)

async function loadTables() {
  if (!selectedLib.value) return
  loading.value = true
  try {
    const res = await client.get('/database/tables', { params: { libraryId: selectedLib.value } })
    tables.value = Array.isArray(res.data) ? res.data : []
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

async function loadTableData(table: DatabaseTable) {
  if (!selectedLib.value) return
  dataTableName.value = table.name
  dataLoading.value = true
  showDataDialog.value = true
  try {
    const res = await client.get(`/database/tables/${table.name}/data`, { params: { libraryId: selectedLib.value } })
    dataRows.value = Array.isArray(res.data) ? res.data : []
  } catch {
    toast.error(t('common.failed'))
    dataRows.value = []
  } finally {
    dataLoading.value = false
  }
}

async function executeSql() {
  if (!sqlQuery.value.trim()) {
    toast.warning('请输入SQL查询语句')
    return
  }
  try {
    const res = await client.post('/database/query', { sql: sqlQuery.value, libraryId: selectedLib.value })
    sqlResult.value = Array.isArray(res.data) ? res.data : []
    toast.success(`查询成功，返回 ${sqlResult.value.length} 条记录`)
  } catch (e: any) {
    toast.error(e.response?.data?.error || 'SQL执行失败')
  }
}

watch(selectedLib, () => { tables.value = []; rows.value = []; columns.value = []; loadTables() })
await loadTables()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('database.title') }}</h1>
      <div class="flex gap-2">
        <Button :disabled="!selectedLib" @click="loadTables">{{ t('common.refresh') }}</Button>
        <Button :disabled="!selectedLib" @click="showSqlDialog = true; sqlResult = []">SQL查询</Button>
      </div>
    </div>

    <div v-if="tables.length" class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-48">表名</TableHead>
            <TableHead>结构</TableHead>
            <TableHead class="w-24">行数</TableHead>
            <TableHead class="w-24">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="tbl in tables" :key="tbl.name">
            <TableCell class="font-mono">{{ tbl.name }}</TableCell>
            <TableCell class="max-w-md truncate text-muted-foreground">{{ tbl.schema }}</TableCell>
            <TableCell>{{ tbl.rowCount }}</TableCell>
            <TableCell>
              <Button size="sm" variant="outline" @click="loadTableData(tbl)">查看数据</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-else-if="selectedLib" class="py-12 text-center text-muted-foreground">
      {{ t('common.noData') }}
    </div>

    <!-- SQL 查询对话框 -->
    <Dialog :open="showSqlDialog" @update:open="showSqlDialog = $event">
      <DialogContent class="flex h-[85vh] w-[85vw] max-w-[85vw] flex-col sm:max-w-[85vw]">
        <DialogHeader>
          <DialogTitle>SQL 查询</DialogTitle>
        </DialogHeader>
        <Textarea
          v-model="sqlQuery"
          class="font-mono text-sm"
          :rows="6"
          placeholder="请输入SQL查询语句..."
        />
        <div v-if="sqlColumns.length" class="mt-4 flex min-h-0 flex-1 flex-col overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-for="col in sqlColumns" :key="col">{{ col }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, i) in sqlResult" :key="i">
                <TableCell v-for="col in sqlColumns" :key="col">{{ row[col] }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p class="p-2 text-center text-sm text-muted-foreground">共 {{ sqlResult.length }} 条记录</p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showSqlDialog = false">关闭</Button>
          <Button @click="executeSql">执行</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 表数据对话框 -->
    <Dialog :open="showDataDialog" @update:open="showDataDialog = $event">
      <DialogContent class="flex h-[85vh] w-[85vw] max-w-[85vw] flex-col sm:max-w-[85vw]">
        <DialogHeader>
          <DialogTitle>表数据: {{ dataTableName }}</DialogTitle>
        </DialogHeader>
        <div v-if="dataLoading" class="py-8 text-center text-sm text-muted-foreground">
          {{ t('common.loading') }}
        </div>
        <div v-else-if="dataColumns.length" class="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-for="col in dataColumns" :key="col">{{ col }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, i) in dataRows" :key="i">
                <TableCell v-for="col in dataColumns" :key="col">{{ row[col] }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-else class="py-8 text-center text-muted-foreground">无数据</div>
      </DialogContent>
    </Dialog>
  </div>
</template>
