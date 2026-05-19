<template>
  <div class="mira-overview">
    <!-- 页面头部 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">系统概览</h1>
        <p class="mt-1">Mira管理系统运行状态概览</p>
      </div>
      <button
        type="button"
        :disabled="loading"
        @click="refreshData"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          v-if="loading"
          class="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <svg
          v-else
          class="-ml-1 mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          ></path>
        </svg>
        {{ loading ? '加载中...' : '刷新数据' }}
      </button>
    </div>
    
    <!-- 统计卡片 -->
    <div v-if="loading && stats.libraries === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div
        v-for="i in 4"
        :key="i"
        class="rounded-lg shadow-sm p-6 animate-pulse"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="h-4 rounded w-3/4 mb-2"></div>
            <div class="h-8 rounded w-1/2"></div>
          </div>
          <div class="w-12 h-12 rounded-lg"></div>
        </div>
      </div>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="资源库总数"
        :value="stats.libraries"
        icon="Folder"
        color="blue"
      />
      <StatCard
        title="插件总数"
        :value="stats.plugins"
        icon="Grid"
        color="green"
      />
      <StatCard
        title="管理员数量"
        :value="stats.admins"
        icon="User"
        color="purple"
      />
      <StatCard
        title="数据库大小"
        :value="stats.dbSize"
        icon="DataBase"
        color="orange"
      />
    </div>

    <!-- 系统信息 -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-lg shadow-sm p-6 animate-pulse">
        <div class="h-6 rounded w-1/3 mb-4"></div>
        <div class="space-y-3">
          <div v-for="i in 4" :key="i" class="flex justify-between">
            <div class="h-4 rounded w-1/3"></div>
            <div class="h-4 rounded w-1/4"></div>
          </div>
        </div>
      </div>
      <div class="rounded-lg shadow-sm p-6 animate-pulse">
        <div class="h-6 rounded w-1/3 mb-4"></div>
        <div class="space-y-3">
          <div v-for="i in 3" :key="i" class="flex items-center p-3 rounded">
            <div class="w-6 h-6 rounded mr-3"></div>
            <div class="flex-1">
              <div class="h-4 rounded w-3/4 mb-1"></div>
              <div class="h-3 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-lg shadow-sm p-6">
        <div class="flex items-center mb-4">
          <div class="w-6 h-6 mr-3">💻</div>
          <h3 class="text-lg font-semibold">系统信息</h3>
        </div>
        
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <span class="">服务器状态</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
              运行中
            </span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <span class="">运行时间</span>
            <span class="font-medium">{{ systemInfo.uptime }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <span class="">系统版本</span>
            <span class="font-medium">{{ systemInfo.version }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <span class="">Node.js 版本</span>
            <span class="font-medium">{{ systemInfo.nodeVersion }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-lg shadow-sm p-6">
        <div class="flex items-center mb-4">
          <div class="w-6 h-6 mr-3">📊</div>
          <h3 class="text-lg font-semibold">最近活动</h3>
        </div>
        
        <div class="space-y-3">
          <div
            v-for="activity in recentActivities"
            :key="activity.id"
            class="flex items-center p-3 rounded-lg"
          >
            <div class="w-6 h-6 mr-3">ℹ️</div>
            <div class="flex-1">
              <p class="text-sm font-medium">{{ activity.message }}</p>
              <p class="text-xs mt-1">{{ activity.time }}</p>
            </div>
          </div>
          <div v-if="recentActivities.length === 0" class="text-center py-8">
            <div class="text-4xl mb-2">📋</div>
            <p>暂无最近活动</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

import { notification } from 'ant-design-vue';

import StatCard from '#/components/mira/StatCard.vue';
import miraApiClient from '#/api/mira/client';

defineOptions({ name: 'MiraOverview' });

const loading = ref(false);

const stats = ref({
  libraries: 0,
  plugins: 0,
  admins: 0,
  dbSize: '0 MB',
});

const systemInfo = ref({
  uptime: '0天 0小时',
  version: '1.0.0',
  nodeVersion: '18.0.0',
});

const recentActivities = ref([
  {
    id: 1,
    message: '系统启动完成',
    time: '刚刚',
  },
  {
    id: 2,
    message: '管理员登录',
    time: '5分钟前',
  },
  {
    id: 3,
    message: '新增资源库',
    time: '1小时前',
  },
]);

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化运行时间
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}天 ${hours}小时`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

const loadStats = async () => {
  try {
    // 并行请求所有需要的数据
    const [librariesRes, pluginsRes, adminsRes] = await Promise.all([
      miraApiClient.get('/libraries'),
      miraApiClient.get('/plugins'),
      miraApiClient.get('/admins'),
    ]);

    const libraries = Array.isArray(librariesRes.data) ? librariesRes.data : [];
    const plugins = Array.isArray(pluginsRes.data) ? pluginsRes.data : [];
    const admins = Array.isArray(adminsRes.data) ? adminsRes.data : [];

    // 计算总数据库大小（所有库的文件大小总和）
    const totalSize = libraries.reduce((sum: number, lib: any) => sum + (lib.size || 0), 0);

    stats.value = {
      libraries: libraries.length,
      plugins: plugins.length,
      admins: admins.length,
      dbSize: formatFileSize(totalSize),
    };

    // TODO: 获取最近活动
    recentActivities.value = [];
  } catch (error) {
    console.error('加载统计数据失败:', error);
    notification.error({
      message: '加载失败',
      description: '加载统计数据失败，请稍后重试',
    });
  }
};

const loadSystemInfo = async () => {
  try {
    // 获取系统健康信息
    const healthRes = await miraApiClient.get('/health');
    const healthData = healthRes.data as any;

    systemInfo.value = {
      uptime: formatUptime(healthData.uptime || 0),
      version: healthData.version || '1.0.0',
      nodeVersion: healthData.nodeVersion || '18.0.0',
    };
  } catch (error) {
    console.error('加载系统信息失败:', error);
    // 如果健康检查失败，使用默认值
    systemInfo.value = {
      uptime: '未知',
      version: '1.0.0',
      nodeVersion: '18.0.0',
    };
  }
};

const refreshData = async () => {
  loading.value = true;
  try {
    await Promise.all([loadStats(), loadSystemInfo()]);
  } catch (error) {
    console.error('刷新数据失败:', error);
    notification.error({
      message: '刷新失败',
      description: '刷新数据失败，请稍后重试',
    });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.mira-overview {
  padding: 24px;
  min-height: 100vh;
}
</style>
