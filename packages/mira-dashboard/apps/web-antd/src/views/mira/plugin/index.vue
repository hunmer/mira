<script setup lang="ts">
import PluginActionDropdown from './components/PluginActionDropdown.vue';
import PluginCard from './components/PluginCard.vue';
import PluginConfigDialog from './components/PluginConfigDialog.vue';
import PluginDetailDrawerContent from './components/PluginDetailDrawer.vue';
import PluginInstallModal from './components/PluginInstallModal.vue';
import PluginStoreDialog from './components/PluginStoreDialog.vue';
import { usePluginManager } from './composables/usePluginManager';

defineOptions({ name: 'MiraPlugin' });

const {
  // 状态
  loading,
  librariesWithPlugins,
  activeLibraryTab,
  searchKeywords,
  selectedPlugin,
  showConfigDialog,
  configuringPlugin,
  pluginConfig,
  installTab,
  selectedFile,
  installForm,
  activeDropdown,
  selectedPluginForAction,
  dropdownStyle,

  // 组件
  PluginDetailDrawer,
  VbenModal,

  // 工具
  getCategoryDisplayName,
  getActiveCount,
  getPluginRoutesForLibrary,
  getFilteredPlugins,

  // 操作
  togglePlugin,
  configurePlugin,
  savePluginConfig,
  handlePluginAction,
  handleFileSelect,
  openInstallDialog,
  showPluginDetail,
  toggleDropdown,
  openRouteInNewTab,
  showStoreDialog,
  getInstalledPluginNames,
  openStoreDialog,
  installFromStore,
} = usePluginManager();
</script>

<template>
  <div class="plugin-manager">
    <div
      v-for="library in librariesWithPlugins"
      :key="library.id"
      class="tab-content"
    >
      <div v-if="activeLibraryTab === library.id">
        <!-- 控制栏 -->
        <div class="mb-6 flex flex-wrap gap-4 rounded-lg p-4">
          <select
            v-model="activeLibraryTab"
            class="block rounded-md border border-gray-300 px-3 py-2 leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option
              v-for="lib in librariesWithPlugins"
              :key="lib.id"
              :value="lib.id"
            >
              {{ lib.name || lib.id }} ({{ lib.plugins.length }})
            </option>
          </select>

          <div class="relative min-w-64 flex-1">
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
              v-model="searchKeywords[library.id]"
              type="text"
              placeholder="搜索插件名称、作者或描述"
              class="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            @click="openInstallDialog(library.id)"
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
            安装插件
          </button>

          <button
            type="button"
            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            @click="openStoreDialog()"
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
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
              />
            </svg>
            插件商店
          </button>
        </div>

        <!-- 统计卡片 -->
        <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="stats-card total-plugins">
            <div class="stats-content">
              <div class="stats-icon">🔧</div>
              <div class="stats-info">
                <h3>插件数量</h3>
                <p class="stats-number">{{ library.plugins.length }}</p>
              </div>
            </div>
          </div>
          <div class="stats-card active-plugins">
            <div class="stats-content">
              <div class="stats-icon">✅</div>
              <div class="stats-info">
                <h3>已启用</h3>
                <p class="stats-number">
                  {{ getActiveCount(library.plugins) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 骨架屏 -->
        <div
          v-if="loading && library.plugins.length === 0"
          class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <div v-for="i in 8" :key="i" class="plugin-skeleton">
            <div class="animate-pulse">
              <div class="mb-4 flex items-center space-x-4">
                <div class="h-10 w-10 rounded-lg"></div>
                <div class="flex-1">
                  <div class="mb-2 h-4 w-3/4 rounded"></div>
                  <div class="h-3 w-1/2 rounded"></div>
                </div>
                <div class="h-6 w-12 rounded"></div>
              </div>
              <div class="space-y-2">
                <div class="h-3 rounded"></div>
                <div class="h-3 w-5/6 rounded"></div>
              </div>
              <div class="mt-4 flex justify-between">
                <div class="h-6 w-12 rounded"></div>
                <div class="h-6 w-12 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 插件网格 -->
        <div
          v-else
          class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <PluginCard
            v-for="plugin in getFilteredPlugins(library)"
            :key="plugin.name"
            :plugin="plugin"
            :routes="getPluginRoutesForLibrary(library.id, plugin.name)"
            @configure="configurePlugin"
            @detail="showPluginDetail"
            @toggle="togglePlugin"
            @dropdown="toggleDropdown"
            @open-route="openRouteInNewTab"
          >
            <template #category>
              {{ getCategoryDisplayName(plugin.category) }}
            </template>
          </PluginCard>
        </div>

        <!-- 空状态 -->
        <div
          v-if="!loading && getFilteredPlugins(library).length === 0"
          class="py-12 text-center"
        >
          <div class="mb-4 text-4xl">🔧</div>
          <p class="mb-2 text-lg font-medium">
            {{
              searchKeywords[library.id]
                ? '没有找到匹配的插件'
                : '暂无插件'
            }}
          </p>
          <p class="text-sm">
            {{
              searchKeywords[library.id]
                ? '请尝试调整搜索条件'
                : '点击"安装插件"开始添加'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <PluginDetailDrawer>
      <PluginDetailDrawerContent
        :plugin="selectedPlugin"
        :get-category-display-name="getCategoryDisplayName"
        :format-date="(d: string) => new Date(d).toLocaleString('zh-CN')"
        @configure="configurePlugin"
        @toggle="(p) => togglePlugin(p, p.status !== 'active')"
      />
    </PluginDetailDrawer>

    <!-- 配置对话框 -->
    <PluginConfigDialog
      :visible="showConfigDialog"
      :loading="loading"
      :plugin="configuringPlugin"
      :config="pluginConfig"
      @update:visible="showConfigDialog = $event"
      @save="savePluginConfig"
    />

    <!-- 安装弹窗 -->
    <VbenModal :loading="loading" :confirm-loading="loading">
      <PluginInstallModal
        :install-tab="installTab"
        :selected-file="selectedFile"
        :install-form="installForm"
        @update:install-tab="installTab = $event"
        @file-select="handleFileSelect"
      />
    </VbenModal>

    <!-- 下拉菜单 -->
    <PluginActionDropdown
      :visible="!!activeDropdown"
      :position="dropdownStyle"
      :plugin="selectedPluginForAction"
      @action="handlePluginAction"
      @close="activeDropdown = null"
    />

    <!-- 插件商店 -->
    <PluginStoreDialog
      :visible="showStoreDialog"
      :installed-names="getInstalledPluginNames"
      @update:visible="showStoreDialog = $event"
      @install="installFromStore"
    />
  </div>
</template>

<style scoped>
@media (max-width: 768px) {
  .plugin-manager {
    padding: 16px;
  }
  .flex.flex-wrap.gap-4 {
    flex-direction: column;
    gap: 16px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .grid.grid-cols-1.md\:grid-cols-2.lg\:grid-cols-3.xl\:grid-cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

.plugin-manager {
  min-height: 100vh;
  padding: 24px;
}

.stats-card {
  padding: 20px;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgb(0 0 0 / 10%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 8px 25px rgb(0 0 0 / 15%);
  transform: translateY(-2px);
}

.stats-card.total-plugins {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-card.active-plugins {
  background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
}

.stats-content {
  display: flex;
  gap: 16px;
  align-items: center;
}

.stats-icon {
  font-size: 24px;
  opacity: 0.9;
}

.stats-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
}

.stats-number {
  margin: 4px 0 0;
  font-size: 28px;
  font-weight: 700;
}

.plugin-skeleton {
  height: 320px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
</style>
