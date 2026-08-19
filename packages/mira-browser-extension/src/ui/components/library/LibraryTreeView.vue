<script setup lang="ts">
/**
 * 薄包装:mira-plugin-ui/library 的 LibraryTreeView + 扩展运行时注入。
 *
 * 组件本体(搜索/树/拖放/右键编辑菜单)在组件库中;
 * 这里提供扩展侧依赖:background 数据服务、DialogHost 弹窗、vue-i18n 文案、
 * 上传队列(本地文件)与 URL 上传(service worker 的 UPLOAD_FROM_URL)。
 */
import { useI18n } from 'vue-i18n';
import { LibraryTreeView as MiraLibraryTreeView } from 'mira-plugin-ui/library';
import { useSettings } from '@/ui/composables/useSettings';
import { useUploadQueue } from '@/ui/composables/useUploadQueue';
import { useBackground } from '@/ui/composables/useBackground';
import { useDialog } from '@/ui/composables/useDialog';
import { extLibraryServices } from '@/ui/composables/useLibraryTree';
import { urlKind } from '@/shared/drag-data';
import { runConcurrent } from '@/shared/concurrency';
import { dbg } from '@/shared/debug';

defineProps<{ mode: 'folder' | 'tag' }>();

const { t } = useI18n();
const { settings } = useSettings();
const bg = useBackground();
const dialog = useDialog();
const { addFiles } = useUploadQueue();

const services = extLibraryServices();

// ---- 链接上传:走 service worker 的 UPLOAD_FROM_URL(fetch → File → 队列) ----
async function uploadUrls(urls: string[], target?: { folderId?: number; tags?: string[] }) {
  const libId = settings.value.libraryId;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;
  await runConcurrent(urls, 3, async url => {
    let uploadUrl = url;
    if (settings.value.imuEnabled && tabId) {
      try {
        const candidates = await bg.upgradeImageUrl(tabId, url, undefined, settings.value.imuRules);
        uploadUrl = candidates[0] ?? url;
        dbg.log('drag', 'upgraded', { original: url, uploadUrl, count: candidates.length });
      } catch (error) {
        dbg.warn('drag', 'upload URL upgrade failed, use original', { url, error });
      }
    } else {
      dbg.log('drag', 'upload URL maxurl skipped', { url, imuEnabled: settings.value.imuEnabled, tabId });
    }
    chrome.runtime.sendMessage({
      type: 'UPLOAD_FROM_URL',
      payload: {
        url: uploadUrl,
        kind: urlKind(uploadUrl),
        libraryId: libId,
        folderId: target?.folderId,
        tags: target?.tags,
        referrer: tab?.url,
      },
    });
  });
}

// ---- 本地文件上传:folder 落点 → folderId;tag 落点 → tags(按标题) ----
const upload = {
  files(files: File[], target?: { folderId?: number; tags?: string[] }) {
    const libId = settings.value.libraryId;
    if (target?.folderId != null) addFiles(files, libId, undefined, String(target.folderId));
    else if (target?.tags?.length) addFiles(files, libId, target.tags);
    else addFiles(files, libId);
  },
  urls(urls: string[], target?: { folderId?: number; tags?: string[] }) {
    void uploadUrls(urls, target);
  },
};
</script>

<template>
  <MiraLibraryTreeView
    :mode="mode"
    :library-id="settings.libraryId"
    :services="services"
    :dialog="dialog"
    :upload="upload"
    :t="(key, params) => (t as any)(key, params)"
  />
</template>
