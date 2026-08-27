<script setup lang="ts">
/**
 * 拖拽上传浮层(Vue 版,宿主为 dragdrop.ts)。
 *
 * 外层 dragdrop.ts 负责拖拽侦测/浮层定位/页面级自动滚动;
 * 这里承载浮层 UI:
 *  - 顶部 zone:「📂 不设文件夹」(根区直接上传) + 「⚙ 自定义上传」(走宿主上传对话框/sidepanel)
 *  - 批量动作区(拖拽源元素下含多图时):批量导入 / 批量复制url
 *  - 左右两栏树:文件夹树 | 标签树(mira-plugin-ui 的 LibraryTreeView,
 *    树内拖放默认直接上传,右键「上传到此处」/工具栏上传走 upload.pick = 自定义上传对话框)
 *  - 未连接素材库时树区域替换为空态 zone,拖入释放打开自定义上传
 * 数据与动作全部经 props 注入(services/upload/回调),组件不直接访问 chrome API。
 */
import { onMounted, ref } from 'vue';
import { LibraryTreeView } from 'mira-plugin-ui/library';
import type { LibraryTreeServices, LibraryTreeUpload } from 'mira-plugin-ui/library';
import type { DragSource, DragDropPayload } from '../dragdrop';

const props = defineProps<{
  source: DragSource;
  /** 当前素材库 id(挂载后异步取,树据此加载) */
  getLibraryId: () => Promise<string | null>;
  services: LibraryTreeServices;
  /** 树上传服务:files/urls 直接上传,pick = 自定义上传对话框 */
  upload: LibraryTreeUpload;
  /** 提供后才显示「⚙ 自定义上传」zone */
  showCustomUpload: boolean;
  /** 「📂 不设文件夹」zone 释放 → 根区上传(沿用 DragDropPayload 语义) */
  onUploadPayload: (payload: DragDropPayload) => void;
  onCustomUpload: () => void;
  batchUrls?: string[];
  onBatchImport?: (urls: string[]) => void;
  onCopyUrls?: (urls: string[]) => void;
  /** 任一 zone 释放后通知外层关闭浮层 */
  onDropped: () => void;
}>();

const libraryId = ref('');
/** null=探测中;false=未连接(树区域替换为空态 zone) */
const connected = ref<boolean | null>(null);
const rootHover = ref(false);
const customHover = ref(false);
const importHover = ref(false);
const copyHover = ref(false);
const emptyHover = ref(false);

onMounted(async () => {
  libraryId.value = (await props.getLibraryId().catch(() => null)) ?? '';
  // listFolders 返回 null = 未连接(listFolders 忽略 libId,走注入的 getFolders)
  try {
    const list = await props.services.listFolders(libraryId.value || ' ');
    connected.value = list !== null;
  } catch {
    connected.value = false;
  }
});

/** 根区 zone:本地文件优先(带 sourceUrl),否则上传拖拽源 url */
function onRootDrop(e: DragEvent) {
  rootHover.value = false;
  props.onDropped();
  const dtFile = e.dataTransfer?.files?.[0];
  if (dtFile) {
    props.onUploadPayload({ file: dtFile, sourceUrl: props.source.url, kind: props.source.kind });
    return;
  }
  props.onUploadPayload({ url: props.source.url, kind: props.source.kind });
}
</script>

<template>
  <div class="mira-overlay mira-dragdrop dark">
    <div class="mira-overlay-header flex items-center justify-between border-b border-border px-3.5 py-2.5">
      <span class="text-[13px] font-semibold">{{ connected === false ? '未连接素材库' : '拖到下方上传到 Mira' }}</span>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <!-- 顶部 zone:根区直接上传 / 自定义上传(对话框) -->
      <div class="flex gap-2">
        <div
          class="mira-dropzone mira-root w-auto flex-1"
          :class="rootHover && 'mira-hover'"
          @dragover.prevent="rootHover = true"
          @dragleave="rootHover = false"
          @drop.prevent="onRootDrop"
        >📂 不设文件夹</div>
        <div
          v-if="showCustomUpload"
          class="mira-dropzone mira-root mira-custom-upload w-auto flex-1"
          :class="customHover && 'mira-hover'"
          @dragover.prevent="customHover = true"
          @dragleave="customHover = false"
          @drop.prevent="() => { customHover = false; onDropped(); onCustomUpload(); }"
        >⚙ 自定义上传</div>
      </div>

      <!-- 批量动作区(拖拽源元素下含多图时) -->
      <div v-if="batchUrls && batchUrls.length >= 2" class="mira-batch-zones flex gap-2">
        <div
          v-if="onBatchImport"
          class="mira-dropzone w-auto flex-1"
          :class="importHover && 'mira-hover'"
          @dragover.prevent="importHover = true"
          @dragleave="importHover = false"
          @drop.prevent="() => { importHover = false; onDropped(); batchUrls && onBatchImport!(batchUrls); }"
        >🖼 批量导入({{ batchUrls.length }})</div>
        <div
          v-if="onCopyUrls"
          class="mira-dropzone w-auto flex-1"
          :class="copyHover && 'mira-hover'"
          @dragover.prevent="copyHover = true"
          @dragleave="copyHover = false"
          @drop.prevent="() => { copyHover = false; onDropped(); batchUrls && onCopyUrls!(batchUrls); }"
        >🔗 批量复制url</div>
      </div>

      <!-- 未连接:树区域替换为空态 zone,拖入释放打开自定义上传 -->
      <div
        v-if="connected === false"
        class="mira-empty-state-dropzone"
        :class="emptyHover && 'mira-hover'"
        @dragover.prevent="emptyHover = true"
        @dragleave="emptyHover = false"
        @drop.prevent="() => { emptyHover = false; onDropped(); onCustomUpload(); }"
      >未连接到素材库，将文件拖拽到此处打开侧边栏</div>

      <!-- 左右两栏树:文件夹树 | 标签树;拖到节点直接上传到目标,右键「上传到此处」走自定义上传对话框 -->
      <div v-else class="grid min-h-0 flex-1 grid-cols-2 gap-2">
        <div class="h-[44vh] min-h-0 overflow-hidden rounded-lg border border-border" @dragover.prevent @drop.prevent>
          <LibraryTreeView
            mode="folder"
            :library-id="libraryId"
            :services="services"
            :upload="upload"
            :use-default-drop-upload="true"
            :show-dropzone="false"
          />
        </div>
        <div class="h-[44vh] min-h-0 overflow-hidden rounded-lg border border-border" @dragover.prevent @drop.prevent>
          <LibraryTreeView
            mode="tag"
            :library-id="libraryId"
            :services="services"
            :upload="upload"
            :use-default-drop-upload="true"
            :show-dropzone="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
