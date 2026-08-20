<script setup lang="ts">
/**
 * 素材库三栏视图:左(文件夹树 + 标签树)/ 中(MediaBrowser)/ 右(MediaDetail)。
 *
 * - 左侧两个 LibraryTreeView:文件夹单选、标签多选(各自受控选择)
 * - 树选中 → MediaBrowser 的 extraFilters(选中文件夹/标签自动过滤中间列表)
 * - 中间 MediaBrowser 的 selected → 右侧 MediaDetail(单选编辑 / 多选批量)
 * - 详情保存成功(updated)→ 自动刷新中间列表与两侧树数据
 * - 宽屏:三栏 ResizablePanelGroup 可拖拽调宽,中间列左右两侧折叠图标切换侧栏
 * - 小窗(窄屏):左右栏隐藏改 Sheet 抽屉展示,折叠图标变为打开抽屉入口
 *
 * 数据服务经 services 聚合注入;detail 未提供 listFolders/listTags 时回退 tree 服务。
 * 样式为 tailwind/shadcn 原子类。
 */
import { computed, ref, watch } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from '@lucide/vue';
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet';
import LibraryTreeView from './LibraryTreeView.vue';
import MediaBrowser from './MediaBrowser.vue';
import MediaDetail from './MediaDetail.vue';
import { createLibraryTreeT } from './i18n';
import type {
  LibrarySelectServer,
  LibraryTreeT,
  LibraryTreeNode,
  MediaBrowserFilters,
  MediaBrowserItem,
  MediaBrowserMenu,
  MediaBrowserServerManager,
  MediaDetailServices,
  MediaLibraryServices,
} from './types';

const props = defineProps<{
  /** 聚合数据服务:tree(左)/ media(中)/ detail(右) + dialog/upload */
  services: MediaLibraryServices;
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT;
  /** 素材库选择器数据(透传给 MediaBrowser 菜单栏);传入后菜单栏右侧显示选择器 */
  libraryServers?: LibrarySelectServer[];
  /** 服务器管理数据(透传给 MediaBrowser 菜单栏);传入后显示服务器图标 */
  serverManager?: MediaBrowserServerManager;
  /** 中间列表自定义菜单(透传给 MediaBrowser) */
  menus?: MediaBrowserMenu[];
}>();

/** 当前素材库 id;变化时三栏自动重载(传 v-model:library-id 后可经选择器切换) */
const libraryId = defineModel<string>('libraryId', { required: true });

const fallbackT = createLibraryTreeT();
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params);
  const r = props.t(key, params);
  return r === key ? fallbackT(key, params) : r;
};

const emit = defineEmits<{
  /** 中间列表菜单「导入文件」:文件多选选完后抛出(宿主打开上传表单,如 BatchUploadForm) */
  importFiles: [files: File[]];
  /** 自定义菜单项被点击 */
  menuSelect: [menuKey: string, itemKey: string];
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
watch(libraryId, resetSelection);

// ---- 右侧详情服务:listFolders/listTags 缺省回退树视图服务 ----
const detailServices = computed<MediaDetailServices>(() => ({
  listFolders: () => props.services.tree.listFolders(libraryId.value),
  listTags: () => props.services.tree.listTags(libraryId.value),
  ...props.services.detail,
}));

/** 详情保存成功:刷新中间列表(标签/文件夹归属变化立即反映) */
function onDetailUpdated() {
  void mediaBrowserRef.value?.refresh();
}

// ---- 响应式布局:小窗(窄屏)隐藏左右栏改抽屉,折叠图标开关侧栏 ----
const isCompact = useMediaQuery('(max-width: 767px)');
const leftOpen = ref(true);
const rightOpen = ref(true);
const LEFT_DEFAULT_SIZE = 20;
const RIGHT_DEFAULT_SIZE = 26;
const leftPanelRef = ref<InstanceType<typeof ResizablePanel>>();
const rightPanelRef = ref<InstanceType<typeof ResizablePanel>>();

// 折叠图标点击 → 驱动 inline 面板切到 默认宽度/0;小窗下同一状态驱动抽屉
watch(leftOpen, (open) => {
  (leftPanelRef.value as any)?.resize?.(open ? LEFT_DEFAULT_SIZE : 0);
}, { flush: 'post' });
watch(rightOpen, (open) => {
  (rightPanelRef.value as any)?.resize?.(open ? RIGHT_DEFAULT_SIZE : 0);
}, { flush: 'post' });

// 进入小窗时自动收起(inline 面板不渲染,抽屉默认关闭)
watch(isCompact, (compact) => {
  if (compact) {
    leftOpen.value = false;
    rightOpen.value = false;
  }
}, { immediate: true });
</script>

<template>
  <div class="bg-background flex h-full min-h-0">
    <!-- 宽屏:三栏可拖拽布局 -->
    <ResizablePanelGroup v-if="!isCompact" direction="horizontal" auto-save-id="media-library-layout" class="min-w-0 flex-1">
      <!-- 左:文件夹树(上) + 标签树(下);拖拽至最小宽度自动折叠 -->
      <ResizablePanel
        ref="leftPanelRef"
        :default-size="LEFT_DEFAULT_SIZE"
        :min-size="12"
        :max-size="32"
        :collapsed-size="0"
        collapsible
        class="min-w-0 overflow-hidden"
        @collapse="leftOpen = false"
        @expand="leftOpen = true"
      >
        <aside class="flex h-full min-h-0 flex-col">
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
      </ResizablePanel>

      <ResizableHandle />

      <!-- 中:文件列表(左侧树选中自动作为附加筛选);左右两侧折叠图标切换对应侧栏 -->
      <ResizablePanel :default-size="54" :min-size="30" class="relative flex min-w-0">
        <button
          type="button"
          class="bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 left-1 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border shadow-sm backdrop-blur transition-colors"
          :title="tt('library.toggleFolderTagPanel')"
          @click="leftOpen = !leftOpen"
        >
          <PanelLeftClose v-if="leftOpen" class="size-3.5" />
          <PanelLeftOpen v-else class="size-3.5" />
        </button>
        <main class="flex h-full w-full min-h-0 min-w-0 flex-1">
          <MediaBrowser
            ref="mediaBrowserRef"
            v-model:library-id="libraryId"
            v-model:selected="selectedMedia"
            :services="services.media"
            :extra-filters="extraFilters"
            :library-servers="libraryServers"
            :server-manager="serverManager"
            :menus="menus"
            :t="t"
            @import-files="files => emit('importFiles', files)"
            @menu-select="(menu, item) => emit('menuSelect', menu, item)"
          />
        </main>
        <button
          type="button"
          class="bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 right-1 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border shadow-sm backdrop-blur transition-colors"
          :title="tt('library.toggleDetailPanel')"
          @click="rightOpen = !rightOpen"
        >
          <PanelRightClose v-if="rightOpen" class="size-3.5" />
          <PanelRightOpen v-else class="size-3.5" />
        </button>
      </ResizablePanel>

      <ResizableHandle />

      <!-- 右:选中文件详情(单选编辑 / 多选合并展示);拖拽至最小宽度自动折叠 -->
      <ResizablePanel
        ref="rightPanelRef"
        :default-size="RIGHT_DEFAULT_SIZE"
        :min-size="16"
        :max-size="40"
        :collapsed-size="0"
        collapsible
        class="min-w-0 overflow-hidden"
        @collapse="rightOpen = false"
        @expand="rightOpen = true"
      >
        <aside class="h-full min-w-0 overflow-y-auto p-3">
          <MediaDetail
            :items="selectedMedia"
            :library-id="libraryId"
            :services="detailServices"
            :t="t"
            @updated="onDetailUpdated"
          />
        </aside>
      </ResizablePanel>
    </ResizablePanelGroup>

    <!-- 小窗:仅中间列,左右栏改抽屉,折叠图标变为抽屉入口 -->
    <main v-else class="relative flex min-w-0 flex-1">
      <button
        type="button"
        class="bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 left-1 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border shadow-sm backdrop-blur transition-colors"
        :title="tt('library.toggleFolderTagPanel')"
        @click="leftOpen = !leftOpen"
      >
        <PanelLeftClose v-if="leftOpen" class="size-3.5" />
        <PanelLeftOpen v-else class="size-3.5" />
      </button>
      <div class="flex h-full min-h-0 min-w-0 flex-1">
        <MediaBrowser
          ref="mediaBrowserRef"
          v-model:library-id="libraryId"
          v-model:selected="selectedMedia"
          :services="services.media"
          :extra-filters="extraFilters"
          :library-servers="libraryServers"
          :server-manager="serverManager"
          :menus="menus"
          :t="t"
          @import-files="files => emit('importFiles', files)"
          @menu-select="(menu, item) => emit('menuSelect', menu, item)"
        />
      </div>
      <button
        type="button"
        class="bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 right-1 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border shadow-sm backdrop-blur transition-colors"
        :title="tt('library.toggleDetailPanel')"
        @click="rightOpen = !rightOpen"
      >
        <PanelRightClose v-if="rightOpen" class="size-3.5" />
        <PanelRightOpen v-else class="size-3.5" />
      </button>
    </main>

    <!-- 小窗:左侧栏抽屉 -->
    <Sheet v-if="isCompact" v-model:open="leftOpen">
      <SheetContent side="left" class="w-[85%] max-w-[320px] gap-0 p-0">
        <SheetTitle class="sr-only">{{ tt('library.toggleFolderTagPanel') }}</SheetTitle>
        <aside class="flex h-full min-h-0 flex-col">
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
      </SheetContent>
    </Sheet>

    <!-- 小窗:右侧详情抽屉 -->
    <Sheet v-if="isCompact" v-model:open="rightOpen">
      <SheetContent side="right" class="w-[90%] max-w-[380px] gap-0 p-0">
        <SheetTitle class="sr-only">{{ tt('library.toggleDetailPanel') }}</SheetTitle>
        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <MediaDetail
            :items="selectedMedia"
            :library-id="libraryId"
            :services="detailServices"
            :t="t"
            @updated="onDetailUpdated"
          />
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
