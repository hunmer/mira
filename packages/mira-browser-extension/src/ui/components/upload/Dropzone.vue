<script setup lang="ts">
import { ref } from 'vue';
import { canAcceptDrop } from '@/shared/drag-data';
const emit = defineEmits<{ drop: [files: File[]] }>();
const hovering = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

function emitFiles(files: File[]) {
  if (files.length) emit('drop', files);
}

function onDragOver(e: DragEvent) {
  // 文件或链接都高亮(链接 drop 由外层 .view 处理 → UPLOAD_FROM_URL)
  if (!canAcceptDrop(e.dataTransfer)) return;
  e.preventDefault();
  hovering.value = true;
}

function onDrop(e: DragEvent) {
  hovering.value = false;
  // 本地文件 → emit;链接(files 空)不 emit,冒泡到外层处理
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
    @dragover="onDragOver"
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
