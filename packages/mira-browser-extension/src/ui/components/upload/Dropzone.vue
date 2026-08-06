<script setup lang="ts">
import { ref } from 'vue';
const emit = defineEmits<{ drop: [files: File[]] }>();
const hovering = ref(false);
function onDrop(e: DragEvent) {
  hovering.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []);
  if (files.length) emit('drop', files);
}
</script>

<template>
  <div
    class="zone" :class="{ hover: hovering }"
    @dragover.prevent="hovering = true"
    @dragleave="hovering = false"
    @drop.prevent="onDrop"
  >
    拖放文件到此处上传
  </div>
</template>

<style scoped>
.zone { padding: 24px; border: 2px dashed var(--border); border-radius: var(--radius); text-align: center; color: var(--muted); margin: 12px; transition: border-color .15s; }
.zone.hover { border-color: var(--primary); color: var(--fg); }
</style>
