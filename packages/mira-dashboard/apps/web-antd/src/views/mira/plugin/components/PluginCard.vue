<script setup lang="ts">
import type { PluginRouteDefinition } from '#/api/core/plugin-routes';
import type { Plugin } from '#/types/mira';

defineProps<{
  plugin: Plugin;
  routes: PluginRouteDefinition[];
}>();

const emit = defineEmits<{
  configure: [plugin: Plugin];
  detail: [plugin: Plugin];
  toggle: [plugin: Plugin, checked: boolean];
  dropdown: [pluginName: string, plugin: Plugin, event: MouseEvent];
  openRoute: [route: PluginRouteDefinition];
}>();

const handleIconError = (event: Event) => {
  (event.target as HTMLImageElement).style.display = 'none';
};
</script>

<template>
  <div
    class="plugin-card cursor-pointer transition-all duration-200"
    :class="[
      plugin.status === 'active' ? 'border-green-200' : 'border-gray-200',
    ]"
  >
    <div class="plugin-header mb-4 flex items-center justify-between">
      <div class="flex items-center">
        <div class="mr-3 flex h-10 w-10 items-center justify-center rounded-lg">
          <img
            v-if="plugin.icon"
            :src="plugin.icon"
            :alt="plugin.name"
            class="h-8 w-8 object-contain"
            @error="handleIconError"
          />
          <span v-else class="text-xl">🔧</span>
        </div>
        <div>
          <h3 class="truncate text-lg font-semibold">{{ plugin.name }}</h3>
          <p class="text-sm">v{{ plugin.version }}</p>
        </div>
      </div>
      <label class="switch">
        <input
          type="checkbox"
          :checked="plugin.status === 'active'"
          @change="(e) => emit('toggle', plugin, (e.target as HTMLInputElement).checked)"
        />
        <span class="slider"></span>
      </label>
    </div>

    <p class="mb-4 line-clamp-2 text-sm">
      {{ plugin.description || '暂无描述' }}
    </p>

    <div class="plugin-info mb-4 space-y-2">
      <div class="flex justify-between text-sm">
        <span>作者:</span>
        <span class="ml-2 truncate">{{ plugin.author }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span>分类:</span>
        <span class="rounded px-2 py-1 text-xs">
          <slot name="category" />
        </span>
      </div>
    </div>

    <div class="plugin-actions mt-auto flex gap-2">
      <button
        type="button"
        class="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @click="emit('detail', plugin)"
      >
        详情
      </button>

      <button
        v-if="plugin.configurable"
        type="button"
        class="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        @click="emit('configure', plugin)"
      >
        配置
      </button>

      <button
        type="button"
        class="rounded bg-gray-500 px-3 py-2 text-sm text-white hover:bg-gray-600 focus:outline-none focus:ring-2"
        @click="emit('dropdown', plugin.name, plugin, $event)"
      >
        更多
        <svg class="ml-1 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <div v-if="routes.length > 0" class="mt-3 border-t pt-3">
      <h4 class="mb-2 text-xs font-semibold text-foreground/70">插件入口</h4>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="route in routes"
          :key="route.path"
          class="rounded bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary"
          @click="emit('openRoute', route)"
        >
          {{ route.meta?.title || route.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 320px;
  padding: 20px;
  overflow: hidden;
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  animation: fadeInUp 0.3s ease-out;
  transition: all 0.3s ease;
}

.plugin-card:hover {
  background-color: hsl(var(--accent));
  box-shadow: 0 8px 30px rgb(0 0 0 / 12%);
  transform: translateY(-2px);
}

.plugin-card.border-green-200 {
  border-color: hsl(var(--primary) / 0.3);
}

.plugin-card.border-gray-200 {
  border-color: hsl(var(--border));
}

.plugin-card.border-green-200::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  content: '';
  background: #52c41a;
  border-radius: 0 4px 4px 0;
}

.plugin-card.border-gray-200::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  content: '';
  background: #d9d9d9;
  border-radius: 0 4px 4px 0;
}

.plugin-header {
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.plugin-info {
  padding: 12px;
  background-color: hsl(var(--muted));
  border-radius: 6px;
}

.plugin-actions {
  margin-top: auto;
}

.line-clamp-2 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  width: 0;
  height: 0;
  opacity: 0;
}

.slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  border-radius: 24px;
  transition: 0.4s;
}

.slider::before {
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  content: '';
  background-color: var(--ant-color-bg-base, white);
  border-radius: 50%;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #52c41a;
}

input:checked + .slider::before {
  transform: translateX(26px);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
