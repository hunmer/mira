<script setup lang="ts">
import LibraryFormModal from './components/LibraryFormModal.vue';
import LibrarySearchBar from './components/LibrarySearchBar.vue';
import LibraryTable from './components/LibraryTable.vue';
import { useLibrary } from './composables/useLibrary';

defineOptions({ name: 'MiraLibrary' });

const {
  loading,
  searchQuery,
  statusFilter,
  filteredLibraries,
  selectedLibraries,
  libraries,
  libraryForm,
  Modal,
  openAddDialog,
  editLibrary,
  saveLibrary,
  toggleStatus,
  deleteLibrary,
  handleSelectionChange,
  handleSelectAll,
} = useLibrary();
</script>

<template>
  <div class="mira-library">
    <!-- 页面头部 -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">资源库管理</h1>
        <p class="mt-1">管理本地和远程资源库，配置插件目录和连接设置</p>
      </div>
      <button
        type="button"
        @click="openAddDialog"
        class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg
          class="-ml-1 mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        添加资源库
      </button>
    </div>

    <!-- 搜索和筛选 -->
    <LibrarySearchBar
      v-model:search-query="searchQuery"
      v-model:status-filter="statusFilter"
    />

    <!-- 资源库列表 -->
    <LibraryTable
      :loading="loading"
      :filtered-libraries="filteredLibraries"
      :selected-libraries="selectedLibraries"
      :libraries="libraries"
      :search-query="searchQuery"
      :status-filter="statusFilter"
      @edit="editLibrary"
      @toggle-status="toggleStatus"
      @delete="deleteLibrary"
      @selection-change="handleSelectionChange"
      @select-all="handleSelectAll"
    />

    <!-- VbenModal 对话框 -->
    <Modal :loading="loading" :confirm-loading="loading">
      <LibraryFormModal v-model="libraryForm" @submit="saveLibrary" />
    </Modal>
  </div>
</template>

<style scoped>
.mira-library {
  min-height: 100vh;
  padding: 24px;
}
</style>
