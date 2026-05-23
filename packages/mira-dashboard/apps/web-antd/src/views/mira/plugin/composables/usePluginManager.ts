import type { PluginRouteDefinition } from '#/api/core/plugin-routes';
import type { Plugin } from '#/types/mira';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { Modal, notification } from 'ant-design-vue';

import { getPluginRoutesByLibrary } from '#/api/core/plugin-routes';
import miraApiClient from '#/api/mira/client';

export interface LibraryWithPlugins {
  id: string;
  name: string;
  description: string;
  plugins: Plugin[];
}

export function usePluginManager() {
  const router = useRouter();

  // 核心状态
  const loading = ref(false);
  const librariesWithPlugins = ref<LibraryWithPlugins[]>([]);
  const activeLibraryTab = ref('');

  // 搜索/排序/过滤
  const searchKeywords = reactive<{ [key: string]: string }>({});
  const sortOptions = reactive<{ [key: string]: string }>({});
  const categoryFilters = reactive<{ [key: string]: string }>({});

  // 插件路由
  const pluginRoutes = reactive<{ [key: string]: PluginRouteDefinition[] }>({});

  // 详情抽屉
  const [PluginDetailDrawer, pluginDetailDrawerApi] = useVbenDrawer({
    title: '插件详细信息',
    class: 'w-[500px]',
    footer: false,
  });
  const selectedPlugin = ref<Plugin | null>(null);

  // 配置对话框
  const showConfigDialog = ref(false);
  const configuringPlugin = ref<Plugin | null>(null);
  const pluginConfig = ref('');

  // 安装弹窗
  const installTab = ref('local');
  const selectedFile = ref<File | null>(null);
  const currentInstallLibraryId = ref('');
  const installForm = ref({
    name: '',
    version: 'latest',
    proxy: '',
  });

  // 下拉菜单
  const activeDropdown = ref<string | null>(null);
  const selectedPluginForAction = ref<Plugin | null>(null);
  const dropdownPosition = reactive({ x: 0, y: 0 });

  const dropdownStyle = computed(() => ({
    left: `${dropdownPosition.x}px`,
    top: `${dropdownPosition.y}px`,
    position: 'fixed' as const,
  }));

  // --- 工具函数 ---

  const getCategoryDisplayName = (category?: string) => {
    const map: Record<string, string> = {
      general: '通用',
      security: '安全',
      storage: '存储',
      ui: '界面',
      utility: '工具',
      integration: '集成',
      development: '开发',
    };
    return map[category || 'general'] || category || '通用';
  };

  const getAvailableCategories = (plugins: Plugin[]) => {
    const categories = new Set(plugins.map((p) => p.category || 'general'));
    return [...categories].sort();
  };

  const getActiveCount = (plugins: Plugin[]) =>
    plugins.filter((p) => p.status === 'active').length;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('zh-CN');

  const getPluginRoutesForLibrary = (libraryId: string, pluginName: string) =>
    (pluginRoutes[libraryId] || []).filter(
      (route) => route.pluginName === pluginName,
    );

  const getFilteredPlugins = (library: LibraryWithPlugins) => {
    let result = library.plugins;

    const searchKeyword = searchKeywords[library.id] || '';
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.author.toLowerCase().includes(keyword) ||
          (p.description && p.description.toLowerCase().includes(keyword)),
      );
    }

    const categoryFilter = categoryFilters[library.id] || '';
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    const sortBy = sortOptions[library.id] || 'status';
    result.sort((a, b) => {
      switch (sortBy) {
        case 'author': return a.author.localeCompare(b.author);
        case 'category': return (a.category || '').localeCompare(b.category || '');
        case 'createdAt': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name': return a.name.localeCompare(b.name);
        case 'status': {
          if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
          return a.name.localeCompare(b.name);
        }
        default: return 0;
      }
    });

    return result;
  };

  // --- 数据加载 ---

  const loadPluginRoutes = async (libraryId: string) => {
    try {
      pluginRoutes[libraryId] = await getPluginRoutesByLibrary(libraryId);
    } catch {
      pluginRoutes[libraryId] = [];
    }
  };

  const loadLibrariesWithPlugins = async () => {
    loading.value = true;
    try {
      const response = await miraApiClient.get('/plugins/by-library');
      librariesWithPlugins.value = (response.data as LibraryWithPlugins[]) || [];

      librariesWithPlugins.value.forEach((library) => {
        if (!searchKeywords[library.id]) searchKeywords[library.id] = '';
        if (!sortOptions[library.id]) sortOptions[library.id] = 'status';
        if (!categoryFilters[library.id]) categoryFilters[library.id] = '';
      });

      if (librariesWithPlugins.value.length > 0 && !activeLibraryTab.value) {
        activeLibraryTab.value = librariesWithPlugins.value[0]!.id;
      }

      for (const library of librariesWithPlugins.value) {
        await loadPluginRoutes(library.id);
      }
    } catch {
      notification.error({ message: '加载失败', description: '加载插件列表失败，请稍后重试' });
      librariesWithPlugins.value = [];
    } finally {
      loading.value = false;
    }
  };

  // --- 插件操作 ---

  const togglePlugin = async (plugin: Plugin, checked?: boolean) => {
    const newStatus: 'active' | 'inactive' =
      checked === undefined
        ? plugin.status === 'active' ? 'inactive' : 'active'
        : checked ? 'active' : 'inactive';

    try {
      await miraApiClient.post('/plugins/toggle-status', {
        pluginName: plugin.name,
        libraryId: plugin.libraryId,
        status: newStatus,
      });
      plugin.status = newStatus;
      if (selectedPlugin.value?.name === plugin.name) {
        selectedPlugin.value.status = newStatus;
      }
      notification.success({
        message: '状态更新',
        description: `插件已${newStatus === 'active' ? '启用' : '禁用'}`,
      });
    } catch (error: any) {
      notification.error({
        message: '操作失败',
        description: error.response?.data?.error || error.message || '未知错误',
      });
    }
  };

  const configurePlugin = async (plugin: Plugin) => {
    try {
      const response = await miraApiClient.get(`/plugins/${plugin.name}/config`, {
        params: { libraryId: plugin.libraryId },
      });
      pluginConfig.value = JSON.stringify(response.data, null, 2);
      configuringPlugin.value = plugin;
      showConfigDialog.value = true;
      pluginDetailDrawerApi.close();
    } catch {
      notification.error({ message: '加载失败', description: '加载插件配置失败' });
    }
  };

  const savePluginConfig = async () => {
    if (!configuringPlugin.value) return;
    try {
      const config = JSON.parse(pluginConfig.value);
      await miraApiClient.put(
        `/plugins/${configuringPlugin.value.name}/config`,
        { ...config, libraryId: configuringPlugin.value.libraryId },
      );
      notification.success({ message: '保存成功', description: '配置保存成功' });
      showConfigDialog.value = false;
    } catch (error: any) {
      notification.error({
        message: error instanceof SyntaxError ? '格式错误' : '保存失败',
        description: error instanceof SyntaxError ? 'JSON 格式错误' : '保存失败',
      });
    }
  };

  const handlePluginAction = async (command: string, plugin: Plugin) => {
    activeDropdown.value = null;

    if (command === 'uninstall') {
      Modal.confirm({
        title: '确认卸载',
        content: `确定要卸载插件 "${plugin.name}" 吗？此操作不可撤销。`,
        onOk: async () => {
          try {
            await miraApiClient.delete(`/plugins/${plugin.name}`);
            notification.success({ message: '卸载成功', description: '插件卸载成功' });
            if (selectedPlugin.value?.name === plugin.name) {
              pluginDetailDrawerApi.close();
              selectedPlugin.value = null;
            }
            loadLibrariesWithPlugins();
          } catch {
            notification.error({ message: '卸载失败', description: '卸载失败' });
          }
        },
      });
    } else if (command === 'update') {
      try {
        await miraApiClient.post(`/plugins/${plugin.name}/update`);
        notification.success({ message: '更新成功', description: '插件更新成功' });
        loadLibrariesWithPlugins();
      } catch {
        notification.error({ message: '更新失败', description: '更新失败' });
      }
    }
  };

  // --- 安装 ---

  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) selectedFile.value = target.files[0] || null;
  };

  const uploadPlugin = async () => {
    if (!selectedFile.value) {
      notification.error({ message: '文件错误', description: '请选择插件包文件' });
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', selectedFile.value);
      if (currentInstallLibraryId.value) {
        formData.append('libraryId', currentInstallLibraryId.value);
      }
      await miraApiClient.post('/plugins/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      notification.success({ message: '安装成功', description: '插件上传安装成功，稍后刷新插件列表' });
      cancelInstall();
      setTimeout(loadLibrariesWithPlugins, 3000);
    } catch {
      notification.error({ message: '安装失败', description: '插件安装失败' });
    }
  };

  const installFromRepository = async () => {
    if (!installForm.value.name) {
      notification.error({ message: '输入错误', description: '请输入插件名称' });
      return;
    }
    try {
      const requestData = {
        ...installForm.value,
        libraryId: currentInstallLibraryId.value,
        ...(installForm.value.proxy && { proxy: installForm.value.proxy }),
      };
      await miraApiClient.post('/plugins/install', requestData);
      notification.success({ message: '安装成功', description: '插件安装成功，稍后刷新插件列表' });
      cancelInstall();
      setTimeout(loadLibrariesWithPlugins, 3000);
    } catch (error: any) {
      notification.error({
        message: '安装失败',
        description: error.response?.data?.error || '安装失败',
      });
    }
  };

  // --- 弹窗/抽屉控制 ---

  const openInstallDialog = (libraryId: string) => {
    currentInstallLibraryId.value = libraryId;
    const library = librariesWithPlugins.value.find((lib) => lib.id === libraryId);
    const libraryName = library ? library.name || library.id : '插件';
    modalApi.setState({ title: `为 ${libraryName} 安装插件` }).open();
  };

  const cancelInstall = () => {
    modalApi.close();
    selectedFile.value = null;
    currentInstallLibraryId.value = '';
    installForm.value = { name: '', version: 'latest', proxy: '' };
  };

  const handleInstallOk = async () => {
    await (installTab.value === 'repository' ? installFromRepository() : uploadPlugin());
  };

  const [VbenModal, modalApi] = useVbenModal({
    title: '安装插件',
    class: 'w-[500px]',
    onConfirm: handleInstallOk,
    onCancel: cancelInstall,
  });

  const showPluginDetail = (plugin: Plugin) => {
    selectedPlugin.value = plugin;
    pluginDetailDrawerApi.open();
    activeDropdown.value = null;
  };

  const toggleDropdown = (pluginName: string, plugin: Plugin, event: MouseEvent) => {
    if (activeDropdown.value === pluginName) {
      activeDropdown.value = null;
      selectedPluginForAction.value = null;
    } else {
      activeDropdown.value = pluginName;
      selectedPluginForAction.value = plugin;
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      dropdownPosition.x = rect.right - 128;
      dropdownPosition.y = rect.bottom + 4;
    }
  };

  const openRouteInNewTab = (route: PluginRouteDefinition) => {
    const pageKey = `${route.name}_${Date.now()}`;
    router.push({ path: route.path, query: { pageKey } });
  };

  const handleIconError = (event: Event) => {
    (event.target as HTMLImageElement).style.display = 'none';
  };

  onMounted(loadLibrariesWithPlugins);

  return {
    // 状态
    loading,
    librariesWithPlugins,
    activeLibraryTab,
    searchKeywords,
    sortOptions,
    categoryFilters,
    selectedPlugin,
    showConfigDialog,
    configuringPlugin,
    pluginConfig,
    installTab,
    selectedFile,
    currentInstallLibraryId,
    installForm,
    activeDropdown,
    selectedPluginForAction,
    dropdownStyle,

    // 组件
    PluginDetailDrawer,
    VbenModal,

    // 工具
    getCategoryDisplayName,
    getAvailableCategories,
    getActiveCount,
    formatDate,
    getPluginRoutesForLibrary,
    getFilteredPlugins,
    handleIconError,

    // 操作
    loadLibrariesWithPlugins,
    togglePlugin,
    configurePlugin,
    savePluginConfig,
    handlePluginAction,
    handleFileSelect,
    openInstallDialog,
    cancelInstall,
    showPluginDetail,
    toggleDropdown,
    openRouteInNewTab,
  };
}
