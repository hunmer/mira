<script setup lang="ts">
defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();
const tabs = [
  { id: 'upload', label: '上传' },
  { id: 'screenshot', label: '截图' },
  { id: 'sniffer', label: '嗅探' },
  { id: 'settings', label: '设置' },
];
</script>

<template>
  <div class="tabs">
    <button
      v-for="t in tabs" :key="t.id"
      class="tab" :class="{ active: modelValue === t.id }"
      @click="emit('update:modelValue', t.id)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
.tabs { display: flex; border-bottom: 1px solid var(--border); }
.tab { flex: 1; padding: 8px; background: transparent; border: none; color: var(--muted); cursor: pointer; font: inherit; border-bottom: 2px solid transparent; }
.tab.active { color: var(--fg); border-bottom-color: var(--primary); }
</style>
