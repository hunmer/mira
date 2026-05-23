<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import {
  Button,
  Card,
  message,
  Modal,
  Select,
  Table,
  Textarea,
} from 'ant-design-vue';

import { miraApiClient } from '#/api/mira/client';

defineOptions({ name: 'MiraDatabase' });

const loading = ref(false);
const dataLoading = ref(false);
const showSqlModal = ref(false);
const showDataModal = ref(false);
const selectedTableName = ref('');
const sqlQuery = ref('');
const sqlResult = ref<any[]>([]);
const tables = ref<any[]>([]);
const tableData = ref<any[]>([]);
const libraries = ref<any[]>([]);
const selectedLibraryId = ref<string>('');

const tableColumns = [
  { title: '表名', dataIndex: 'name', key: 'name', width: 200 },
  { title: '结构', dataIndex: 'schema', key: 'schema', ellipsis: true },
  { title: '行数', dataIndex: 'rowCount', key: 'rowCount', width: 100 },
  { title: '操作', key: 'actions', width: 120 },
];

const sqlResultColumns = computed(() => {
  if (sqlResult.value.length === 0) return [];
  return Object.keys(sqlResult.value[0]).map((key) => ({
    title: key,
    dataIndex: key,
    key,
    width: 120,
    ellipsis: true,
  }));
});

const dataColumns = computed(() => {
  if (tableData.value.length === 0) return [];
  return Object.keys(tableData.value[0]).map((key) => ({
    title: key,
    dataIndex: key,
    key,
    width: 150,
    ellipsis: true,
  }));
});

const loadLibraries = async () => {
  try {
    const response = await miraApiClient.get('/libraries');
    libraries.value = Array.isArray(response.data) ? response.data : [];
    if (libraries.value.length > 0 && !selectedLibraryId.value) {
      selectedLibraryId.value = libraries.value[0].id;
    }
  } catch (error) {
    console.error('Failed to load libraries:', error);
  }
};

const refreshData = async () => {
  if (!selectedLibraryId.value) return;
  loading.value = true;
  try {
    const response = await miraApiClient.get('/database/tables', {
      params: { libraryId: selectedLibraryId.value },
    });
    tables.value = response.data || [];
  } catch (error) {
    message.error('加载数据库表失败');
    console.error('Failed to load tables:', error);
  } finally {
    loading.value = false;
  }
};

const viewTableData = async (table: any) => {
  selectedTableName.value = table.name;
  showDataModal.value = true;
  dataLoading.value = true;

  try {
    const response = await miraApiClient.get(
      `/database/tables/${table.name}/data`,
      { params: { libraryId: selectedLibraryId.value } },
    );
    tableData.value = response.data || [];
  } catch (error) {
    message.error('加载表数据失败');
    console.error('Failed to load table data:', error);
    tableData.value = [];
  } finally {
    dataLoading.value = false;
  }
};

const executeSql = async () => {
  if (!sqlQuery.value.trim()) {
    message.warning('请输入SQL查询语句');
    return;
  }

  try {
    const response = await miraApiClient.post('/database/query', {
      sql: sqlQuery.value,
      libraryId: selectedLibraryId.value,
    });
    sqlResult.value = response.data || [];
    message.success(`查询执行成功，返回 ${sqlResult.value.length} 条记录`);
  } catch (error: any) {
    message.error(error.response?.data?.error || 'SQL执行失败');
  }
};

watch(selectedLibraryId, () => {
  tables.value = [];
  tableData.value = [];
  refreshData();
});

onMounted(() => {
  loadLibraries();
});
</script>

<template>
  <div class="p-4">
    <div class="header-section">
      <div>
        <h1 class="page-title">数据库预览器</h1>
        <p class="page-description">查看和管理SQLite数据库表结构和数据</p>
      </div>
      <div class="header-actions">
        <Select
          v-model:value="selectedLibraryId"
          placeholder="选择素材库"
          style="width: 200px"
          :options="
            libraries.map((lib) => ({ label: lib.name, value: lib.id }))
          "
        />
        <Button @click="refreshData" :disabled="!selectedLibraryId">
          刷新
        </Button>
        <Button
          type="primary"
          @click="showSqlModal = true"
          :disabled="!selectedLibraryId"
        >
          SQL查询
        </Button>
      </div>
    </div>

    <Card title="数据库表">
      <Table
        :loading="loading"
        :data-source="tables"
        :columns="tableColumns"
        :pagination="{ pageSize: 10 }"
        row-key="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <Button size="small" type="primary" @click="viewTableData(record)">
              查看数据
            </Button>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="showSqlModal"
      title="SQL查询"
      width="800px"
      @ok="executeSql"
    >
      <div class="modal-section">
        <Textarea
          v-model:value="sqlQuery"
          :rows="6"
          placeholder="请输入SQL查询语句..."
        />
      </div>

      <div v-if="sqlResult.length > 0" class="sql-result">
        <h4 class="result-title">查询结果 ({{ sqlResult.length }} 条记录)</h4>
        <Table
          :data-source="sqlResult"
          :columns="sqlResultColumns"
          :scroll="{ x: 800, y: 300 }"
          size="small"
          :pagination="{ pageSize: 10 }"
        />
      </div>
    </Modal>

    <Modal
      v-model:open="showDataModal"
      :title="`表数据: ${selectedTableName}`"
      width="1000px"
    >
      <Table
        :loading="dataLoading"
        :data-source="tableData"
        :columns="dataColumns"
        :scroll="{ x: 800, y: 400 }"
        size="small"
        :pagination="{ pageSize: 20 }"
      />
    </Modal>
  </div>
</template>

<style scoped>
.p-4 {
  padding: 1rem;
}

.header-section {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
}

.page-description {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.modal-section {
  margin-bottom: 1rem;
}

.sql-result {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

.result-title {
  margin-bottom: 0.5rem;
}
</style>
