<script setup lang="ts">
import type { Library } from '#/types/mira';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { notification } from 'ant-design-vue';

import { miraApiClient } from '#/api/mira/client';

defineOptions({ name: 'MiraLibrary' });

const loading = ref(false);
const searchQuery = ref('');
const statusFilter = ref('');
const selectedLibraries = ref<string[]>([]);
const editingLibrary = ref<Library | null>(null);

const libraries = ref<Library[]>([]);

const libraryForm = ref({
  name: '',
  path: '',
  type: 'local' as 'local' | 'remote',
  description: '',
  icon: 'default',
  enableHash: false,
  enableAutoSync: true,
  serverURL: '',
  serverPort: '',
  pluginsDir: '',
});

const filteredLibraries = computed(() => {
  return libraries.value.filter((library) => {
    const searchLower = searchQuery.value.toLowerCase();
    const matchesSearch =
      !searchQuery.value ||
      library.name.toLowerCase().includes(searchLower) ||
      (library.path && library.path.toLowerCase().includes(searchLower)) ||
      (library.description &&
        library.description.toLowerCase().includes(searchLower));
    const matchesStatus =
      !statusFilter.value || library.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const loadLibraries = async () => {
  loading.value = true;
  try {
    const response = await miraApiClient.get('/libraries');
    libraries.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    notification.error({
      message: '加载失败',
      description: '加载资源库列表失败，请稍后重试',
    });
    console.error('Failed to load libraries:', error);
    libraries.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSelectionChange = (libraryId: string) => {
  const index = selectedLibraries.value.indexOf(libraryId);
  if (index === -1) {
    selectedLibraries.value.push(libraryId);
  } else {
    selectedLibraries.value.splice(index, 1);
  }
};

const handleSelectAll = () => {
  selectedLibraries.value =
    selectedLibraries.value.length === filteredLibraries.value.length
      ? []
      : filteredLibraries.value.map((lib) => lib.id);
};

const editLibrary = (library: Library) => {
  editingLibrary.value = library;
  libraryForm.value = {
    name: library.name,
    path: library.path,
    type: library.type,
    description: library.description || '',
    icon: library.icon || 'default',
    enableHash: library.customFields?.enableHash || false,
    enableAutoSync: library.customFields?.enableAutoSync ?? true,
    serverURL: library.serverURL || '',
    serverPort: library.serverPort || '',
    pluginsDir: library.pluginsDir || '',
  };
  modalApi.setState({ title: '编辑资源库' }).open();
};

const cancelEdit = () => {
  modalApi.close();
  editingLibrary.value = null;
  libraryForm.value = {
    name: '',
    path: '',
    type: 'local',
    description: '',
    icon: 'default',
    enableHash: false,
    enableAutoSync: true,
    serverURL: '',
    serverPort: '',
    pluginsDir: '',
  };
};

const openAddDialog = () => {
  editingLibrary.value = null;
  libraryForm.value = {
    name: '',
    path: '',
    type: 'local',
    description: '',
    icon: 'default',
    enableHash: false,
    enableAutoSync: true,
    serverURL: '',
    serverPort: '',
    pluginsDir: '',
  };
  modalApi.setState({ title: '添加资源库' }).open();
};

const saveLibrary = async () => {
  // 基本验证
  if (!libraryForm.value.name || !libraryForm.value.path) {
    notification.error({
      message: '验证失败',
      description: '请填写必要的字段',
    });
    return;
  }

  if (libraryForm.value.type === 'remote') {
    if (!libraryForm.value.serverURL || !libraryForm.value.serverPort) {
      notification.error({
        message: '验证失败',
        description: '远程库需要填写服务器地址和端口',
      });
      return;
    }

    const port = Number(libraryForm.value.serverPort);
    if (Number.isNaN(port) || port < 1 || port > 65_535) {
      notification.error({
        message: '验证失败',
        description: '端口号必须是1-65535之间的数字',
      });
      return;
    }
  }

  loading.value = true;
  try {
    // 构建提交数据，符合后端期望的格式
    const submitData = {
      name: libraryForm.value.name,
      path: libraryForm.value.path,
      type: libraryForm.value.type,
      description: libraryForm.value.description,
      icon: libraryForm.value.icon,
      customFields: {
        path: libraryForm.value.path,
        enableHash: libraryForm.value.enableHash,
        enableAutoSync: libraryForm.value.enableAutoSync,
      },
      ...(libraryForm.value.type === 'remote' && {
        serverURL: libraryForm.value.serverURL,
        serverPort: libraryForm.value.serverPort,
      }),
      ...(libraryForm.value.pluginsDir && {
        pluginsDir: libraryForm.value.pluginsDir,
      }),
    };

    if (editingLibrary.value) {
      // 更新资源库
      await miraApiClient.put(
        `/libraries/${editingLibrary.value.id}`,
        submitData,
      );
      notification.success({
        message: '更新成功',
        description: '资源库更新成功',
      });
    } else {
      // 添加资源库
      await miraApiClient.post('/libraries', submitData);
      notification.success({
        message: '创建成功',
        description: '资源库添加成功',
      });
    }

    cancelEdit();
    await loadLibraries();
  } catch (error: any) {
    notification.error({
      message: '操作失败',
      description: error.response?.data?.message || '操作失败，请稍后重试',
    });
  } finally {
    loading.value = false;
  }
};

const toggleStatus = async (library: Library) => {
  try {
    const newStatus = library.status === 'active' ? 'inactive' : 'active';
    await miraApiClient.put(`/libraries/${library.id}/status`, {
      status: newStatus,
    });

    // 更新本地状态
    const libraryIndex = libraries.value.findIndex(
      (lib) => lib.id === library.id,
    );
    if (libraryIndex !== -1) {
      libraries.value[libraryIndex] = {
        ...libraries.value[libraryIndex]!,
        status: newStatus,
      };
    }

    notification.success({
      message: '状态更新',
      description: `资源库已${newStatus === 'active' ? '启用' : '禁用'}`,
    });
  } catch (error: any) {
    console.error('Toggle status error:', error);
    notification.error({
      message: '状态切换失败',
      description: error.response?.data?.error || '状态切换失败，请稍后重试',
    });
  }
};

const deleteLibrary = async (library: Library) => {
  // 检查是否是激活状态，如果是，则不允许删除
  if (library.status === 'active') {
    notification.warning({
      message: '无法删除',
      description: '请先禁用资源库再进行删除操作',
    });
    return;
  }

  // eslint-disable-next-line no-alert
  if (!confirm(`确定要删除资源库 "${library.name}" 吗？此操作不可撤销。`)) {
    return;
  }

  try {
    await miraApiClient.delete(`/libraries/${library.id}`);
    notification.success({
      message: '删除成功',
      description: '资源库删除成功',
    });
    await loadLibraries();
  } catch (error: any) {
    console.error('Delete library error:', error);
    notification.error({
      message: '删除失败',
      description: error.response?.data?.error || '删除失败，请稍后重试',
    });
  }
};

// 使用 VbenModal - 在所有函数定义完成后
const [Modal, modalApi] = useVbenModal({
  title: '添加资源库',
  class: 'w-[500px]',
  onConfirm: saveLibrary,
  onCancel: cancelEdit,
});

onMounted(() => {
  loadLibraries();
});
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
    <div class="mb-6 flex gap-4">
      <div class="relative">
        <div
          class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索资源库..."
          class="block w-64 rounded-md border border-gray-300 py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <select
        v-model="statusFilter"
        class="block w-32 rounded-md border border-gray-300 px-3 py-2 leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">全部状态</option>
        <option value="active">活跃</option>
        <option value="inactive">未活跃</option>
      </select>
    </div>

    <!-- 资源库列表 -->
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
                  @change="handleSelectAll"
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
                  @change="handleSelectionChange(library.id)"
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
                    @click="editLibrary(library)"
                    class="rounded px-2 py-1 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    @click="toggleStatus(library)"
                    class="rounded px-2 py-1 text-sm"
                    :class="[library.status === 'active' ? '' : '']"
                  >
                    {{ library.status === 'active' ? '禁用' : '启用' }}
                  </button>
                  <button
                    @click="deleteLibrary(library)"
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

    <!-- VbenModal 对话框 -->
    <Modal :loading="loading" :confirm-loading="loading">
      <form @submit.prevent="saveLibrary" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            名称
          </label>
          <input
            v-model="libraryForm.name"
            type="text"
            required
            placeholder="请输入资源库名称"
            class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            路径
          </label>
          <input
            v-model="libraryForm.path"
            type="text"
            required
            placeholder="请输入资源库路径"
            class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            类型
          </label>
          <select
            v-model="libraryForm.type"
            required
            class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="local">本地</option>
            <option value="remote">远程</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            图标
          </label>
          <input
            v-model="libraryForm.icon"
            type="text"
            placeholder="图标名称（默认：default）"
            class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div class="flex items-center">
          <input
            id="enableHash"
            v-model="libraryForm.enableHash"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label for="enableHash" class="ml-2 block text-sm text-gray-700">
            启用文件哈希校验
          </label>
        </div>

        <div class="flex items-center">
          <input
            id="enableAutoSync"
            v-model="libraryForm.enableAutoSync"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label for="enableAutoSync" class="ml-2 block text-sm text-gray-700">
            启用自动同步（监控文件夹新文件）
          </label>
        </div>

        <!-- 远程库相关配置 -->
        <template v-if="libraryForm.type === 'remote'">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              服务器地址
            </label>
            <input
              v-model="libraryForm.serverURL"
              type="text"
              :required="libraryForm.type === 'remote'"
              placeholder="例如：http://127.0.0.1"
              class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              服务器端口
            </label>
            <input
              v-model="libraryForm.serverPort"
              type="text"
              :required="libraryForm.type === 'remote'"
              placeholder="例如：3000"
              class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </template>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            插件目录
          </label>
          <input
            v-model="libraryForm.pluginsDir"
            type="text"
            placeholder="插件目录路径（可选）"
            class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            描述
          </label>
          <textarea
            v-model="libraryForm.description"
            rows="3"
            placeholder="请输入描述（可选）"
            class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          ></textarea>
        </div>
      </form>
    </Modal>
  </div>
</template>

<style scoped>
.mira-library {
  min-height: 100vh;
  padding: 24px;
}
</style>
