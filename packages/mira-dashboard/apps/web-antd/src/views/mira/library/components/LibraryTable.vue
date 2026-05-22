<script setup lang="ts">
import type { Library } from '#/types/mira';

defineProps<{
  loading: boolean;
  filteredLibraries: Library[];
  selectedLibraries: string[];
  libraries: Library[];
  searchQuery: string;
  statusFilter: string;
}>();

defineEmits<{
  edit: [library: Library];
  toggleStatus: [library: Library];
  delete: [library: Library];
  selectionChange: [libraryId: string];
  selectAll: [];
}>();

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="loading && libraries.length === 0" class="rounded-lg shadow-sm">
    <div class="animate-pulse">
      <div class="border-b border-gray-200 px-6 py-4">
        <div class="h-6 w-1/4 rounded"></div>
      </div>
      <div
        v-for="i in 8"
        :key="i"
        class="border-b border-gray-200 px-6 py-4 last:border-b-0"
      >
        <div class="flex items-center space-x-4">
          <div class="h-4 w-1/4 rounded"></div>
          <div class="h-4 w-1/3 rounded"></div>
          <div class="h-4 w-1/6 rounded"></div>
          <div class="h-4 w-1/6 rounded"></div>
          <div class="h-4 w-1/6 rounded"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Table -->
  <div v-else class="overflow-hidden rounded-lg shadow-sm">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            >
              <input
                type="checkbox"
                :checked="
                  selectedLibraries.length === filteredLibraries.length &&
                  filteredLibraries.length > 0
                "
                :indeterminate="
                  selectedLibraries.length > 0 &&
                  selectedLibraries.length < filteredLibraries.length
                "
                @change="$emit('selectAll')"
                class="h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
              />
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            >
              名称
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            >
              路径
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            >
              类型
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            >
              状态
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            >
              文件数
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            >
              大小
            </th>
            <th class="relative px-6 py-3">
              <span class="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="library in filteredLibraries" :key="library.id">
            <td class="whitespace-nowrap px-6 py-4">
              <input
                type="checkbox"
                :checked="selectedLibraries.includes(library.id)"
                @change="$emit('selectionChange', library.id)"
                class="h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
              />
            </td>
            <td class="whitespace-nowrap px-6 py-4">
              <div class="flex items-center">
                <div class="mr-3 text-2xl">📁</div>
                <div>
                  <div class="text-sm font-medium">{{ library.name }}</div>
                  <div v-if="library.description" class="text-sm">
                    {{ library.description }}
                  </div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="max-w-xs truncate text-sm" :title="library.path">
                {{ library.path }}
              </div>
            </td>
            <td class="whitespace-nowrap px-6 py-4">
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                :class="[library.type === 'local' ? '' : '']"
              >
                {{ library.type === 'local' ? '本地' : '远程' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-6 py-4">
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                :class="[library.status === 'active' ? '' : '']"
              >
                {{ library.status === 'active' ? '活跃' : '未活跃' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm">
              {{ library.fileCount || 0 }}
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm">
              {{ formatFileSize(library.size || 0) }}
            </td>
            <td
              class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium"
            >
              <div class="flex items-center justify-end space-x-2">
                <button
                  @click="$emit('edit', library)"
                  class="rounded px-2 py-1 text-sm"
                >
                  编辑
                </button>
                <button
                  @click="$emit('toggleStatus', library)"
                  class="rounded px-2 py-1 text-sm"
                  :class="[library.status === 'active' ? '' : '']"
                >
                  {{ library.status === 'active' ? '禁用' : '启用' }}
                </button>
                <button
                  @click="$emit('delete', library)"
                  :disabled="library.status === 'active'"
                  class="rounded px-2 py-1 text-sm"
                  :class="[
                    library.status === 'active' ? 'cursor-not-allowed' : '',
                  ]"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredLibraries.length === 0">
            <td colspan="8" class="px-6 py-12 text-center">
              <div class="">
                <div class="mb-2 text-4xl">📂</div>
                <p class="text-lg font-medium">
                  {{
                    searchQuery || statusFilter
                      ? '没有找到匹配的资源库'
                      : '暂无资源库'
                  }}
                </p>
                <p class="mt-1 text-sm">
                  {{
                    searchQuery || statusFilter
                      ? '请尝试调整搜索条件'
                      : '点击"添加资源库"开始创建'
                  }}
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
