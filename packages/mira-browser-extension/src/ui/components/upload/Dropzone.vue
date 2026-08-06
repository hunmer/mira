<script setup lang="ts">
import { ref } from 'vue';
const emit = defineEmits<{ drop: [files: File[]] }>();
const hovering = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

function emitFiles(files: File[]) {
  if (files.length) emit('drop', files);
}

function onDrop(e: DragEvent) {
  hovering.value = false;
  emitFiles(Array.from(e.dataTransfer?.files ?? []));
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  emitFiles(Array.from(input.files ?? []));
  // 重置以便连续选择同一文件仍触发 change
  input.value = '';
}

function openPicker() {
  inputRef.value?.click();
}
</script>

<template>
  <div
    class="zone" :class="{ hover: hovering }"
    @click="openPicker"
    @dragover.prevent="hovering = true"
    @dragleave="hovering = false"
    @drop.prevent="onDrop"
  >
    <input ref="inputRef" type="file" multiple class="file-input" @change="onPick" />
    <span>拖放文件到此处,或点击选择</span>
  </div>
</template>

<style scoped>
.zone { padding: 24px; border: 2px dashed var(--border); border-radius: var(--radius); text-align: center; color: var(--muted); margin: 12px; transition: border-color .15s; cursor: pointer; }
.zone.hover { border-color: var(--primary); color: var(--fg); }
.file-input { display: none; }
</style>
