<script setup lang="ts">
import type { Plugin } from '#/types/mira';

const props = defineProps<{
  plugin: Plugin | null;
  getCategoryDisplayName: (category?: string) => string;
  formatDate: (dateString: string) => string;
}>();

const emit = defineEmits<{
  configure: [plugin: Plugin];
  toggle: [plugin: Plugin];
}>();

const handleIconError = (event: Event) => {
  (event.target as HTMLImageElement).style.display = 'none';
};
</script>

<template>
  <div v-if="plugin" class="plugin-detail">
    <div class="mb-6 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg">
        <img
          v-if="plugin.icon"
          :src="plugin.icon"
          :alt="plugin.name"
          class="h-12 w-12 object-contain"
          @error="handleIconError"
        />
        <span v-else class="text-3xl">🔧</span>
      </div>
      <h2 class="text-xl font-bold">{{ plugin.name }}</h2>
      <p>v{{ plugin.version }}</p>
      <span
        class="mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium"
        :class="[
          plugin.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800',
        ]"
      >
        {{ plugin.status === 'active' ? '已启用' : '已禁用' }}
      </span>
    </div>

    <div class="space-y-4">
      <div class="detail-item">
        <label class="detail-label">描述</label>
        <div class="detail-value">{{ plugin.description || '暂无描述' }}</div>
      </div>
      <div class="detail-item">
        <label class="detail-label">作者</label>
        <div class="detail-value">{{ plugin.author }}</div>
      </div>
      <div class="detail-item">
        <label class="detail-label">分类</label>
        <div class="detail-value">{{ props.getCategoryDisplayName(plugin.category) }}</div>
      </div>
      <div class="detail-item">
        <label class="detail-label">所属库</label>
        <div class="detail-value">{{ plugin.libraryName || plugin.libraryId || '未知' }}</div>
      </div>
      <div class="detail-item">
        <label class="detail-label">依赖数量</label>
        <div class="detail-value">{{ plugin.dependencies.length }} 个</div>
      </div>
      <div class="detail-item">
        <label class="detail-label">入口文件</label>
        <div class="detail-value">{{ plugin.main }}</div>
      </div>
      <div class="detail-item">
        <label class="detail-label">安装时间</label>
        <div class="detail-value">{{ props.formatDate(plugin.createdAt) }}</div>
      </div>
      <div class="detail-item">
        <label class="detail-label">更新时间</label>
        <div class="detail-value">{{ props.formatDate(plugin.updatedAt) }}</div>
      </div>
    </div>

    <div v-if="plugin.tags && plugin.tags.length > 0" class="mt-6">
      <h4 class="mb-2 font-semibold">标签</h4>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in plugin.tags"
          :key="tag"
          class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div v-if="plugin.dependencies.length > 0" class="mt-6">
      <h4 class="mb-2 font-semibold">依赖项</h4>
      <div class="space-y-1">
        <span
          v-for="dep in plugin.dependencies"
          :key="dep"
          class="block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
        >
          {{ dep }}
        </span>
      </div>
    </div>

    <div class="mt-6 flex gap-2">
      <button
        type="button"
        :disabled="!plugin.configurable"
        class="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('configure', plugin)"
      >
        配置插件
      </button>
      <button
        type="button"
        class="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        @click="emit('toggle', plugin)"
      >
        {{ plugin.status === 'active' ? '禁用' : '启用' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.plugin-detail {
  padding: 16px 0;
}

.detail-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
}

.detail-value {
  font-size: 14px;
  word-break: break-word;
}
</style>
