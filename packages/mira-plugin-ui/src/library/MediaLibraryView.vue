<script setup lang="ts">
/**
 * 素材库三栏视图:左(文件夹树 + 标签树)/ 中(MediaBrowser)/ 右(MediaDetail)。
 *
 * - 左侧两个 LibraryTreeView:文件夹单选、标签多选(各自受控选择)
 * - 树选中 → MediaBrowser 的 extraFilters(选中文件夹/标签自动过滤中间列表)
 * - 中间 MediaBrowser 的 selected → 右侧 MediaDetail(单选编辑 / 多选批量)
 * - 详情保存成功(updated)→ 自动刷新中间列表与两侧树数据
 *
 * 数据服务经 services 聚合注入;detail 未提供 listFolders/listTags 时回退 tree 服务。
 * 样式为 tailwind/shadcn 原子类。
 */
import { computed, ref, watch } from 'vue';
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import LibraryTreeView from './LibraryTreeView.vue';
import MediaBrowser from './MediaBrowser.vue';
import MediaDetail from './MediaDetail.vue';
import { createLibraryTreeT } from './i18n';
import type {
  LibraryTreeT,
  LibraryTreeNode,
  MediaBrowserFilters,
  MediaBrowserItem,
  MediaDetailServices,
  MediaLibraryServices,
} from './types';

const props = defineProps<{
  /** 当前素材库 id;变化时三栏自动重载 */
  libraryId: string;
  /** 聚合数据服务:tree(左)/ media(中)/ detail(右) + dialog/upload */
  services: MediaLibraryServices;
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT;
}>();

const fallbackT = createLibraryTreeT();
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params);
  const r = props.t(key, params);
  return r === key ? fallbackT(key, params) : r;
};

const emit = defineEmits<{
  /** 中间列表菜单「导入文件」:文件多选选完后抛出(宿主打开上传表单,如 BatchUploadForm) */
  importFiles: [files: File[]];
}>();

// ---- 左侧树受控选择(文件夹单选 / 标签多选) ----
const selectedFolder = ref<LibraryTreeNode[]>([]);
const selectedTags = ref<LibraryTreeNode[]>([]);
// 切库时清空选择,避免旧库选中过滤新库列表
function resetSelection() {
  selectedFolder.value = [];
  selectedTags.value = [];
  selectedMedia.value = [];
}

/** 树选中 → 中间列表的外部筛选条件 */
const extraFilters = computed<Partial<MediaBrowserFilters>>(() => {
  const filters: Partial<MediaBrowserFilters> = {};
  if (selectedFolder.value.length) filters.folders = selectedFolder.value.map(n => n.id);
  if (selectedTags.value.length) filters.tags = selectedTags.value.map(n => n.id);
  return filters;
});

// ---- 中间列表受控选择 → 右侧详情 ----
const selectedMedia = ref<MediaBrowserItem[]>([]);
const mediaBrowserRef = ref<InstanceType<typeof MediaBrowser> | null>(null);

// 切库时清空三栏选择(树选中过滤新库列表会失真,列表选中项也可能不属于新库)
watch(() => props.libraryId, resetSelection);

// ---- 右侧详情服务:listFolders/listTags 缺省回退树视图服务 ----
const detailServices = computed<MediaDetailServices>(() => ({
  listFolders: () => props.services.tree.listFolders(props.libraryId),
  listTags: () => props.services.tree.listTags(props.libraryId),
  ...props.services.detail,
}));

/** 详情保存成功:刷新中间列表(标签/文件夹归属变化立即反映) */
function onDetailUpdated() {
  void mediaBrowserRef.value?.refresh();
}
</script>

<template>
  <div class="bg-background flex h-full min-h-0">
    <!-- 左:文件夹树(上) + 标签树(下) -->
    <aside class="flex w-60 shrink-0 flex-col border-e border-border">
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="text-muted-foreground border-b border-border px-3 py-1.5 text-xs font-medium">
          {{ tt('common.folder') }}
        </div>
        <div class="min-h-0 flex-1">
          <LibraryTreeView
            mode="folder"
            :library-id="libraryId"
            :services="services.tree"
            :dialog="services.dialog"
            :upload="services.upload"
            :show-dropzone="false"
            :t="t"
            :selected="selectedFolder"
            @update:selected="selectedFolder = $event"
          />
        </div>
      </div>
      <div class="flex min-h-0 flex-1 flex-col border-t border-border">
        <div class="text-muted-foreground border-b border-border px-3 py-1.5 text-xs font-medium">
          {{ tt('common.tag') }}
        </div>
        <div class="min-h-0 flex-1">
          <LibraryTreeView
            mode="tag"
            :library-id="libraryId"
            :services="services.tree"
            :dialog="services.dialog"
            :upload="services.upload"
            :show-dropzone="false"
            :t="t"
            :selected="selectedTags"
            @update:selected="selectedTags = $event"
          />
        </div>
      </div>
    </aside>

    <!-- 中:文件列表(左侧树选中自动作为附加筛选) -->
    <main class="min-w-0 flex-1">
      <MediaBrowser
        ref="mediaBrowserRef"
        v-model:selected="selectedMedia"
        :library-id="libraryId"
        :services="services.media"
        :extra-filters="extraFilters"
        :t="t"
        @import-files="files => emit('importFiles', files)"
      />
    </main>

    <!-- 右:选中文件详情(单选编辑 / 多选合并展示) -->
    <aside class="w-80 shrink-0 overflow-y-auto border-s border-border p-3">
      <MediaDetail
        :items="selectedMedia"
        :library-id="libraryId"
        :services="detailServices"
        :t="t"
        @updated="onDetailUpdated"
      />
    </aside>
  </div>
</template>
