<script setup lang="ts">
/**
 * 批量上传窗口页(非 dialog):直接渲染 BatchUploadForm 全屏表单。
 * 文件选择/拖放由表单自己触发;「取消」按钮关窗。
 */
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BatchUploadForm from 'mira-plugin-ui/src/BatchUploadForm.vue';
import { useBatchUpload } from '@/ui/composables/useBatchUpload';
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import { dbg } from '@/shared/debug';

const { t } = useI18n();
const batchUpload = useBatchUpload();
// 表单的 initialLibraryId 只在挂载时取一次:必须等 settings/库列表就绪后再渲染,
// 否则以空值挂载会回落到第一个库而非当前选中库
const ready = ref(false);

function closeWindow() {
  window.close();
}

onMounted(async () => {
  const { settings, load } = useSettings();
  await load();
  // 恢复会话(验 token / 自动登录),成功后 libraries 可用;失败不阻断,表单仍可手动切库
  const { verify } = useConnection();
  await verify({
    serverURL: settings.value.serverURL,
    username: settings.value.username,
    password: settings.value.password,
  }).catch(() => {});
  // 初始库:URL params 传入(打开方为 popup 当前选中库),缺省回落 settings
  const libraryId = new URLSearchParams(location.search).get('libraryId') || undefined;
  dbg.info('upload-page', 'init', { href: location.href, libraryId });
  await batchUpload.open({ libraryId });
  ready.value = true;
});
</script>

<template>
  <main class="bg-background text-foreground flex h-screen flex-col gap-4 p-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold tracking-tight">{{ t('header.uploadInWindow') }}</h1>
      <p class="text-muted-foreground text-sm">{{ t('upload.dropHint') }}</p>
    </header>
    <BatchUploadForm
      v-if="ready"
      class="min-h-0 flex-1"
      :libraries="batchUpload.libraries.value"
      :folders="batchUpload.folders.value"
      :tags="batchUpload.tags.value"
      :initial-library-id="batchUpload.libraryId.value"
      :initial-folder-id="batchUpload.initialFolderId.value"
      :initial-tag-titles="batchUpload.initialTagTitles.value"
      :initial-files="batchUpload.files.value"
      @upload="batchUpload.submit"
      @library-change="batchUpload.onLibraryChange"
      @create-node="batchUpload.createNode"
      @cancel="closeWindow"
    />
  </main>
</template>
