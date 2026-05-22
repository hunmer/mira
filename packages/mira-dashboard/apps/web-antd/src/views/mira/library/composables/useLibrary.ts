import type { Library } from '#/types/mira';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { notification } from 'ant-design-vue';

import { miraApiClient } from '#/api/mira/client';

interface LibraryFormData {
  name: string;
  path: string;
  type: 'local' | 'remote';
  description: string;
  icon: string;
  enableHash: boolean;
  enableAutoSync: boolean;
  useHttpFile: boolean;
  serverURL: string;
  serverPort: string;
  pluginsDir: string;
}

const createEmptyForm = (): LibraryFormData => ({
  name: '',
  path: '',
  type: 'local',
  description: '',
  icon: 'default',
  enableHash: false,
  enableAutoSync: true,
  useHttpFile: false,
  serverURL: '',
  serverPort: '',
  pluginsDir: '',
});

export function useLibrary() {
  const loading = ref(false);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const selectedLibraries = ref<string[]>([]);
  const editingLibrary = ref<Library | null>(null);
  const libraries = ref<Library[]>([]);
  const libraryForm = ref<LibraryFormData>(createEmptyForm());

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

  const cancelEdit = () => {
    modalApi.close();
    editingLibrary.value = null;
    libraryForm.value = createEmptyForm();
  };

  const openAddDialog = () => {
    editingLibrary.value = null;
    libraryForm.value = createEmptyForm();
    modalApi.setState({ title: '添加资源库' }).open();
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
      useHttpFile: library.customFields?.useHttpFile || library.useHttpFile || false,
      serverURL: library.serverURL || '',
      serverPort: library.serverPort || '',
      pluginsDir: library.pluginsDir || '',
    };
    modalApi.setState({ title: '编辑资源库' }).open();
  };

  const saveLibrary = async () => {
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
      const isRemote = libraryForm.value.type === 'remote';
      const submitData = {
        name: libraryForm.value.name,
        path: libraryForm.value.path,
        type: libraryForm.value.type,
        description: libraryForm.value.description,
        icon: libraryForm.value.icon,
        useHttpFile: libraryForm.value.useHttpFile,
        customFields: {
          path: libraryForm.value.path,
          enableHash: libraryForm.value.enableHash,
          enableAutoSync: libraryForm.value.enableAutoSync,
          useHttpFile: libraryForm.value.useHttpFile,
          ...(isRemote && {
            serverURL: libraryForm.value.serverURL,
            serverPort: libraryForm.value.serverPort,
          }),
        },
        ...(isRemote && {
          serverURL: libraryForm.value.serverURL,
          serverPort: libraryForm.value.serverPort,
        }),
        ...(libraryForm.value.pluginsDir && {
          pluginsDir: libraryForm.value.pluginsDir,
        }),
      };

      if (editingLibrary.value) {
        await miraApiClient.put(
          `/libraries/${editingLibrary.value.id}`,
          submitData,
        );
        notification.success({
          message: '更新成功',
          description: '资源库更新成功',
        });
      } else {
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

  const [Modal, modalApi] = useVbenModal({
    title: '添加资源库',
    class: 'w-[500px]',
    onConfirm: saveLibrary,
    onCancel: cancelEdit,
  });

  onMounted(() => {
    loadLibraries();
  });

  return {
    loading,
    searchQuery,
    statusFilter,
    selectedLibraries,
    libraries,
    libraryForm,
    filteredLibraries,
    Modal,
    loadLibraries,
    openAddDialog,
    editLibrary,
    cancelEdit,
    saveLibrary,
    toggleStatus,
    deleteLibrary,
    handleSelectionChange,
    handleSelectAll,
  };
}
