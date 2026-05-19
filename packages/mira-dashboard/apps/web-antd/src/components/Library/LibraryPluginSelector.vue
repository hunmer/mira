<script setup lang="ts">
import type { LibraryInfo } from '#/api/core/plugin-routes';

import { onMounted, ref } from 'vue';

import { getLibrariesWithPluginRoutes } from '#/api/core/plugin-routes';

// 暴露给父组件的事件
const emit = defineEmits<{
  librarySelected: [library: LibraryInfo];
}>();

// 响应式数据
const isDrawerOpen = ref(false);
const loading = ref(false);
const error = ref<null | string>(null);
const libraries = ref<LibraryInfo[]>([]);

// 方法
const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value;
  if (isDrawerOpen.value && libraries.value.length === 0) {
    void loadLibraries();
  }
};

const closeDrawer = () => {
  isDrawerOpen.value = false;
};

const loadLibraries = async () => {
  try {
    loading.value = true;
    error.value = null;

    const data = await getLibrariesWithPluginRoutes();
    libraries.value = data.libraries;

    if (data.libraries.length === 0) {
      error.value = '暂无可用的插件素材库';
    }
  } catch (error_) {
    error.value = error_ instanceof Error ? error_.message : '加载失败';
  } finally {
    loading.value = false;
  }
};

const refreshData = () => {
  void loadLibraries();
};

const selectLibrary = (library: LibraryInfo) => {
  // 这里可以根据需要跳转到特定的插件页面
  // 或者显示该素材库下的所有插件路由

  // 示例：跳转到第一个插件路由
  // router.push(`/mira/library/${library.id}/plugins`);

  // 暂时关闭抽屉
  closeDrawer();

  // 可以触发一个事件，让父组件处理
  emit('librarySelected', library);
};

// 生命周期
onMounted(() => {
  // 可以在这里预加载数据，或者等用户点击时再加载
  void loadLibraries();
});
</script>

<template>
  <div class="library-plugin-selector">
    <!-- 触发按钮 -->
    <button
      class="selector-trigger"
      :class="{ active: isDrawerOpen }"
      @click="toggleDrawer"
    >
      <span class="icon-[lucide--layers] mr-2"></span>
      <span>素材库插件</span>
      <span
        class="icon-[lucide--chevron-down] ml-2 transition-transform"
        :class="{ 'rotate-180': isDrawerOpen }"
      ></span>
    </button>

    <!-- 下拉抽屉 -->
    <div v-if="isDrawerOpen" class="plugin-drawer" @click.stop>
      <div class="drawer-header">
        <h3>选择素材库插件</h3>
        <button class="close-btn" @click="closeDrawer">
          <span class="icon-[lucide--x]"></span>
        </button>
      </div>

      <div class="drawer-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <span class="icon-[lucide--loader-2] mr-2 animate-spin"></span>
          加载中...
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-state">
          <span class="icon-[lucide--alert-circle] mr-2"></span>
          {{ error }}
          <button class="retry-btn" @click="refreshData">
            <span class="icon-[lucide--refresh-cw] mr-1"></span>
            重试
          </button>
        </div>

        <!-- 素材库列表 -->
        <div v-else class="libraries-list">
          <div
            v-for="library in libraries"
            :key="library.id"
            class="library-item"
            @click="selectLibrary(library)"
          >
            <div class="library-info">
              <h4>{{ library.name }}</h4>
              <span class="route-count">{{ library.routeCount }} 个插件</span>
            </div>
            <span class="icon-[lucide--chevron-right] expand-icon"></span>
          </div>

          <!-- 无数据状态 -->
          <div v-if="libraries.length === 0" class="empty-state">
            <span class="icon-[lucide--package] empty-icon"></span>
            <p>暂无可用的插件</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景遮罩 -->
    <div v-if="isDrawerOpen" class="drawer-overlay" @click="closeDrawer"></div>
  </div>
</template>

<style scoped>
.library-plugin-selector {
  position: relative;
  display: inline-block;
}

.selector-trigger {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: #374151;
}

.selector-trigger:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.selector-trigger.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.plugin-drawer {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  min-width: 320px;
  max-width: 480px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;
}

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  z-index: 999;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.drawer-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
}

.drawer-content {
  max-height: 400px;
  overflow-y: auto;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: #6b7280;
  font-size: 14px;
}

.error-state {
  flex-direction: column;
  gap: 12px;
}

.retry-btn {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #e5e7eb;
}

.libraries-list {
  padding: 8px 0;
}

.library-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.library-item:hover {
  background: #f9fafb;
}

.library-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.route-count {
  font-size: 12px;
  color: #6b7280;
}

.expand-icon {
  color: #9ca3af;
  transition: color 0.2s ease;
}

.library-item:hover .expand-icon {
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>
