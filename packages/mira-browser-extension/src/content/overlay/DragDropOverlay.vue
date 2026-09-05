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
import type { Library } from 'mira-app-core/shared/sdk';
import { LibraryTreeView } from 'mira-plugin-ui/library';
import type { LibraryTreeServices, LibraryTreeSortMode, LibraryTreeUpload } from 'mira-plugin-ui/library';
import type { DragSource, DragDropPayload } from '../dragdrop';

const props = defineProps<{
  source: DragSource;
  /** 当前素材库 id(挂载后异步取,树据此加载) */
  getLibraryId: () => Promise<string | null>;
  /** 素材库列表(挂载后异步取,顶部横向展示;hover 切换 libraryId) */
  getLibraries?: () => Promise<Library[] | null>;
  services: LibraryTreeServices;
  /** 树上传服务:files/urls 直接上传,pick = 自定义上传对话框 */
  upload: LibraryTreeUpload;
  /** 树视图样式:tree 经典树 / tiles 叶子层平铺(设置「快捷导入样式」,由 dragdrop.ts 注入) */
  view?: 'tree' | 'tiles';
  /** 文件夹/标签树展示排序(设置「文件夹/标签排序」,由 dragdrop.ts 注入;缺省组件按 id) */
  sortFolder?: LibraryTreeSortMode;
  sortTag?: LibraryTreeSortMode;
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

const emit = defineEmits<{ (e: 'library-change', libraryId: string): void }>();

const libraryId = ref('');
const libraries = ref<Library[]>([]);
/** null=探测中;false=未连接(树区域替换为空态 zone) */
const connected = ref<boolean | null>(null);
const rootHover = ref(false);
const customHover = ref(false);
const importHover = ref(false);
const copyHover = ref(false);
const emptyHover = ref(false);
const debugHover = ref(false);
const debugDrop = ref('');
const showBatchZones = true;
const showDebugDropZone = false;

function onDebugDrop(e: DragEvent) {
  debugHover.value = false;
  e.preventDefault();
  e.stopPropagation();
  const dt = e.dataTransfer;
  if (!dt) {
    debugDrop.value = 'dataTransfer: null';
    console.info('[mira-drag-debug]', debugDrop.value);
    return;
  }
  const types = Array.from(dt.types);
  const data: Record<string, string> = {};
  for (const type of types) {
    if (type === 'Files') continue;
    try { data[type] = dt.getData(type); } catch (error) { data[type] = `[读取失败: ${String(error)}]`; }
  }
  debugDrop.value = JSON.stringify({
    types,
    files: Array.from(dt.files ?? []).map(file => ({ name: file.name, type: file.type, size: file.size })),
    data,
  }, null, 2);
  console.info('[mira-drag-debug]', JSON.parse(debugDrop.value));
}

onMounted(async () => {
  libraryId.value = (await props.getLibraryId().catch(() => null)) ?? '';
  if (props.getLibraries) {
    libraries.value = (await props.getLibraries().catch(() => null)) ?? [];
  }
  // listFolders 返回 null = 未连接(listFolders 忽略 libId,走注入的 getFolders)
  try {
    const list = await props.services.listFolders(libraryId.value || ' ');
    connected.value = list !== null;
  } catch {
    connected.value = false;
  }
});

/** 顶部素材库列表切换:树随 libraryId 自动重载,上传落点经事件同步外层。
 *  拖拽中 mouseenter 不触发,由 dragenter/dragover 驱动;幂等(同库直接返回)。 */
function switchLibrary(id: string) {
  if (!id || id === libraryId.value) return;
  libraryId.value = id;
  emit('library-change', id);
}

/** 根区 zone:本地文件优先(带 sourceUrl),否则上传拖拽源 url */
function onRootDrop(e: DragEvent) {
  rootHover.value = false;
  props.onDropped();
  const dtFile = e.dataTransfer?.files?.[0];
  const libId = libraryId.value || undefined;
  if (dtFile) {
    props.onUploadPayload({ file: dtFile, sourceUrl: props.source.url, kind: props.source.kind, libraryId: libId });
    return;
  }
  props.onUploadPayload({ url: props.source.url, kind: props.source.kind, libraryId: libId });
}
</script>

<template>
  <div class="mira-overlay mira-dragdrop dark">
    <div class="mira-overlay-header flex items-center justify-between border-b border-border px-3.5 py-2.5">
      <span class="text-[13px] font-semibold">{{ connected === false ? '未连接素材库' : '拖到下方上传到 Mira' }}</span>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <!-- 顶部横向素材库列表:拖拽/鼠标悬停切换下方两栏树为对应素材库 -->
      <div v-if="libraries.length" class="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="素材库">
        <button
          v-for="lib in libraries"
          :key="lib.id"
          type="button"
          class="flex-shrink-0 rounded-full border px-2.5 py-[3px] text-[11px] leading-[16px] whitespace-nowrap transition-colors"
          :class="lib.id === libraryId
            ? 'border-primary bg-primary/15 text-foreground'
            : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'"
          :title="lib.name"
          @dragenter.prevent="switchLibrary(lib.id)"
          @dragover.prevent="switchLibrary(lib.id)"
          @mouseenter="switchLibrary(lib.id)"
        >
          <!-- 服务端 icon 占位值为 'default'(非图标名),不渲染 -->
          <span v-if="lib.icon && lib.icon !== 'default'" class="mr-1">{{ lib.icon }}</span>{{ lib.name }}
        </button>
      </div>

      <div v-if="showDebugDropZone"
        class="mira-dropzone w-full text-left"
        :class="debugHover && 'mira-hover'"
        @dragover.prevent="debugHover = true"
        @dragleave="debugHover = false"
        @drop="onDebugDrop"
      >
        <div>接收所有拖拽（诊断）</div>
        <pre v-if="debugDrop" class="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[10px]">{{ debugDrop }}</pre>
      </div>
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
      <div v-if="showBatchZones && batchUrls && batchUrls.length >= 2" class="mira-batch-zones flex gap-2">
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
            :view="view"
            :sort="sortFolder"
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
            :view="view"
            :sort="sortTag"
          />
        </div>
      </div>
    </div>
  </div>
</template>
