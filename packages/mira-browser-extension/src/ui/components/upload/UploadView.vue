<script setup lang="ts">
import { useUploadQueue } from '@/ui/composables/useUploadQueue';
import { useSettings } from '@/ui/composables/useSettings';
import Dropzone from './Dropzone.vue';
import UploadQueue from './UploadQueue.vue';

const { tasks, load, addFiles, cancel } = useUploadQueue();
const { settings } = useSettings();
load();

function onDrop(files: File[]) {
  addFiles(files, settings.value.libraryId, settings.value.tags, settings.value.folderId);
}
</script>

<template>
  <div class="view">
    <Dropzone v-if="settings.dropZoneEnabled" @drop="onDrop" />
    <UploadQueue :tasks="tasks" @cancel="cancel" @retry="load" />
  </div>
</template>

<style scoped>
.view { display: flex; flex-direction: column; height: 100%; }
</style>
