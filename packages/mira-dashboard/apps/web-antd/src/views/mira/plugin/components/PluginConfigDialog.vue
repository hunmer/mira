<script setup lang="ts">
import type { Plugin } from '#/types/mira';

defineProps<{
  visible: boolean;
  loading: boolean;
  plugin: Plugin | null;
  config: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  save: [];
}>();
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50"
  >
    <div class="relative top-10 mx-auto w-2/3 max-w-4xl rounded-md border p-5 shadow-lg">
      <div class="mt-3">
        <h3 class="mb-4 text-lg font-medium">
          配置 {{ plugin?.name }}
        </h3>

        <div v-if="plugin" class="config-editor">
          <div class="mb-4">
            <h4 class="mb-2 text-sm font-semibold">配置预览</h4>
            <div class="max-h-96 overflow-auto rounded border p-4">
              <pre class="whitespace-pre-wrap text-sm">{{ config }}</pre>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            class="rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2"
            @click="emit('update:visible', false)"
          >
            取消
          </button>
          <button
            type="button"
            :disabled="loading"
            class="rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            @click="emit('save')"
          >
            {{ loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
