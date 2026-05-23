<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  visible: boolean;
  installedNames: string[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  install: [name: string];
}>();

interface StorePlugin {
  name: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  dependencies: string;
}

const plugins: StorePlugin[] = [
  {
    name: 'mira_user',
    title: '用户认证',
    description: '用户登录认证插件，通过 SDK 连接 Mira 服务端进行权限验证，支持多角色管理和会话管理。',
    icon: '👤',
    category: '安全',
    dependencies: 'mira-server-sdk',
  },
  {
    name: 'mira_thumb',
    title: '缩略图生成',
    description: '自动为视频和图片生成缩略图，基于 ffmpeg 实现高效批量处理，支持自定义分辨率和格式。',
    icon: '🖼️',
    category: '存储',
    dependencies: 'fluent-ffmpeg, queue',
  },
  {
    name: 'upload_statistics',
    title: '上传统计',
    description: '记录和查询文件上传历史数据，提供上传量统计、趋势分析和存储空间监控。',
    icon: '📊',
    category: '工具',
    dependencies: '--',
  },
  {
    name: 'mira_n8n',
    title: 'n8n 集成',
    description: '通过 Webhook 和 WebSocket 将 Mira 事件转发到 n8n 工作流引擎，实现自动化任务编排。',
    icon: '🔗',
    category: '集成',
    dependencies: 'ws',
  },
];

const searchKeyword = ref('');

const filteredPlugins = () => {
  if (!searchKeyword.value) return plugins;
  const kw = searchKeyword.value.toLowerCase();
  return plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(kw) ||
      p.title.toLowerCase().includes(kw) ||
      p.description.toLowerCase().includes(kw),
  );
};

const isInstalled = (name: string) => props.installedNames.includes(name);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="plugin-store-overlay"
      @click.self="emit('update:visible', false)"
    >
      <div class="plugin-store-dialog">
        <div class="plugin-store-header">
          <h2>插件商店</h2>
          <button
            class="plugin-store-close"
            @click="emit('update:visible', false)"
          >
            ✕
          </button>
        </div>

        <div class="plugin-store-search">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索插件..."
            class="plugin-store-search-input"
          />
        </div>

        <div class="plugin-store-list">
          <div
            v-for="plugin in filteredPlugins()"
            :key="plugin.name"
            class="plugin-store-item"
          >
            <div class="plugin-store-item-icon">{{ plugin.icon }}</div>
            <div class="plugin-store-item-info">
              <div class="plugin-store-item-title">
                <span class="font-medium">{{ plugin.title }}</span>
                <span class="plugin-store-item-category">
                  {{ plugin.category }}
                </span>
                <span v-if="isInstalled(plugin.name)" class="plugin-store-item-installed">
                  已安装
                </span>
              </div>
              <div class="plugin-store-item-name">{{ plugin.name }}</div>
              <div class="plugin-store-item-desc">{{ plugin.description }}</div>
              <div v-if="plugin.dependencies !== '--'" class="plugin-store-item-deps">
                依赖: {{ plugin.dependencies }}
              </div>
            </div>
            <button
              :class="[
                'plugin-store-item-btn',
                isInstalled(plugin.name) ? 'btn-installed' : 'btn-install',
              ]"
              :disabled="isInstalled(plugin.name)"
              @click="emit('install', plugin.name)"
            >
              {{ isInstalled(plugin.name) ? '已安装' : '安装' }}
            </button>
          </div>

          <div v-if="filteredPlugins().length === 0" class="plugin-store-empty">
            没有找到匹配的插件
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.plugin-store-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 50%);
}

.plugin-store-dialog {
  width: 680px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 20%);
}

.plugin-store-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.plugin-store-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.plugin-store-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 6px;
  transition: all 0.2s;
}

.plugin-store-close:hover {
  color: #333;
  background: #f5f5f5;
}

.plugin-store-search {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.plugin-store-search-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}

.plugin-store-search-input:focus {
  border-color: #1677ff;
}

.plugin-store-list {
  flex: 1;
  padding: 16px 24px;
  overflow-y: auto;
}

.plugin-store-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  transition: all 0.2s;
}

.plugin-store-item:hover {
  border-color: #d6e4ff;
  box-shadow: 0 2px 8px rgb(22 119 255 / 8%);
}

.plugin-store-item:last-child {
  margin-bottom: 0;
}

.plugin-store-item-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: #f5f7fa;
  border-radius: 10px;
}

.plugin-store-item-info {
  flex: 1;
  min-width: 0;
}

.plugin-store-item-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 2px;
}

.plugin-store-item-category {
  padding: 1px 8px;
  font-size: 11px;
  color: #1677ff;
  background: #f0f5ff;
  border-radius: 4px;
}

.plugin-store-item-installed {
  padding: 1px 8px;
  font-size: 11px;
  color: #52c41a;
  background: #f6ffed;
  border-radius: 4px;
}

.plugin-store-item-name {
  font-size: 12px;
  color: #999;
}

.plugin-store-item-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #666;
}

.plugin-store-item-deps {
  margin-top: 4px;
  font-size: 11px;
  color: #aaa;
}

.plugin-store-item-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-install {
  color: white;
  background: #1677ff;
}

.btn-install:hover {
  background: #4096ff;
}

.btn-installed {
  color: #999;
  cursor: not-allowed;
  background: #f5f5f5;
}

.plugin-store-empty {
  padding: 40px 0;
  font-size: 14px;
  color: #999;
  text-align: center;
}
</style>
