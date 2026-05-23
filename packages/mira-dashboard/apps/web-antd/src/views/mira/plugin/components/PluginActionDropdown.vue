<script setup lang="ts">
import type { Plugin } from '#/types/mira';

defineProps<{
  visible: boolean;
  position: { left: string; top: string };
  plugin: Plugin | null;
}>();

const emit = defineEmits<{
  action: [command: string, plugin: Plugin];
  close: [];
}>();
</script>

<template>
  <template v-if="visible && plugin">
    <div
      class="fixed z-[9999] mt-1 w-32 rounded-md border border-gray-200 bg-white shadow-lg"
      :style="{ left: position.left, top: position.top, position: 'fixed' }"
    >
      <button
        class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
        @click="emit('action', 'update', plugin)"
      >
        更新
      </button>
      <hr class="border-gray-100" />
      <button
        class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        @click="emit('action', 'uninstall', plugin)"
      >
        卸载
      </button>
    </div>
    <!-- 点击遮罩关闭 -->
    <div class="fixed inset-0 z-[9998]" @click="emit('close')" />
  </template>
</template>
