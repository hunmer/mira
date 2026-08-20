<script setup lang="ts">
/**
 * 批量上传对话框宿主:App.vue 顶层挂载一次,状态来自 useBatchUpload 模块单例。
 * header 菜单「选择文件上传」/ 树右键「上传到此处」都经 useBatchUpload().open() 唤起。
 */
import BatchUploadDialog from 'mira-plugin-ui/src/BatchUploadDialog.vue';
import { useBatchUpload } from '@/ui/composables/useBatchUpload';

const {
  show, files, folders, tags, libraries,
  libraryId, initialFolderId, initialTagTitles,
  submit, onLibraryChange, createNode,
} = useBatchUpload();
</script>

<template>
  <BatchUploadDialog
    v-model:open="show"
    :libraries="libraries"
    :folders="folders"
    :tags="tags"
    :initial-library-id="libraryId"
    :initial-folder-id="initialFolderId"
    :initial-tag-titles="initialTagTitles"
    :initial-files="files"
    @upload="submit"
    @library-change="onLibraryChange"
    @create-node="createNode"
  />
</template>
