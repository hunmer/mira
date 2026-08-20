<script setup lang="ts">
/**
 * Mira 素材库 CEP 面板:登录 Mira Server 后以 MediaLibraryView 三栏视图
 * (左 文件夹/标签树 · 中 MediaBrowser · 右 MediaDetail)浏览/管理素材,
 * 对应 mira-plugin-ui demo App.vue 的三栏视图演示接线。
 */
import { computed, onMounted, ref } from 'vue'
import { MediaLibraryView } from 'mira-plugin-ui/library'
import type { LibraryTreeUpload, MediaLibraryServices } from 'mira-plugin-ui/library'
// 不经库根入口(其会再引入一份 tailwind.css),直接引源码路径
import BatchUploadDialog from 'mira-plugin-ui/src/BatchUploadDialog.vue'
import { useMira } from './services'

const mira = useMira()
onMounted(() => mira.restore())

/* ---------- 批量上传(树右键「上传到此处」/ 列表「导入文件」共用) ---------- */
const showBatchUpload = ref(false)
const batchUploadFolderId = ref('')
const batchUploadTagTitles = ref<string[]>([])
const batchUploadFiles = ref<File[]>([])

function openBatchUpload(folderId = '', tagTitles: string[] = [], files: File[] = []) {
  batchUploadFolderId.value = folderId
  batchUploadTagTitles.value = tagTitles
  batchUploadFiles.value = files
  showBatchUpload.value = true
}

const upload: LibraryTreeUpload = {
  files() {},
  urls() {},
  pick(target) { openBatchUpload(target?.folderId ? String(target.folderId) : '', target?.tags ?? []) },
}

const libraryViewServices = computed<MediaLibraryServices>(() => ({
  tree: mira.treeServices,
  media: mira.mediaServices,
  detail: mira.detailServices,
  dialog: mira.dialog,
  upload,
}))

async function handleBatchUploaded() {
  // 上传完成后重拉文件夹/标签数据;文件列表在筛选/翻页时自然刷新
  await mira.loadLibraryData()
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- 未连接:登录卡片 -->
    <div v-if="!mira.connected.value" class="bg-background flex flex-1 items-center justify-center p-6">
      <form
        class="bg-card text-card-foreground flex w-80 flex-col gap-3 rounded-xl border p-5 shadow-sm"
        @submit.prevent="mira.connect()"
      >
        <h1 class="text-base font-semibold">Mira 素材库</h1>
        <p class="text-muted-foreground text-xs">连接 Mira Server 后浏览素材库</p>
        <label class="flex flex-col gap-1 text-xs">
          <span class="text-muted-foreground">服务器地址</span>
          <input
            v-model="mira.serverURL.value"
            type="text"
            spellcheck="false"
            class="border-input bg-background placeholder:text-muted-foreground h-8 rounded-md border px-2 text-xs outline-none focus:border-primary"
            placeholder="http://127.0.0.1:8081"
          >
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span class="text-muted-foreground">用户名</span>
          <input
            v-model="mira.username.value"
            type="text"
            class="border-input bg-background h-8 rounded-md border px-2 text-xs outline-none focus:border-primary"
          >
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span class="text-muted-foreground">密码</span>
          <input
            v-model="mira.password.value"
            type="password"
            class="border-input bg-background h-8 rounded-md border px-2 text-xs outline-none focus:border-primary"
          >
        </label>
        <p v-if="mira.loadError.value" class="text-destructive break-all text-xs">{{ mira.loadError.value }}</p>
        <button
          type="submit"
          :disabled="mira.connecting.value"
          class="bg-primary text-primary-foreground mt-1 h-8 cursor-pointer rounded-md text-xs font-medium disabled:opacity-50"
        >{{ mira.connecting.value ? '连接中…' : '连接' }}</button>
      </form>
    </div>

    <!-- 已连接:标题栏 + 三栏视图 -->
    <template v-else>
      <header class="border-border bg-card flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span class="text-xs font-semibold">Mira 素材库</span>
        <span class="text-muted-foreground flex min-w-0 items-center gap-2 text-[11px]">
          <span class="truncate">{{ mira.serverURL.value }}</span>
          <button
            type="button"
            class="border-border hover:bg-accent cursor-pointer rounded border px-2 py-0.5"
            @click="mira.logout()"
          >断开</button>
        </span>
      </header>
      <main class="min-h-0 flex-1">
        <MediaLibraryView
          v-model:library-id="mira.currentLibraryId.value"
          :services="libraryViewServices"
          :library-servers="mira.libraryServers.value"
          @import-files="files => openBatchUpload('', [], files)"
        />
      </main>
    </template>

    <BatchUploadDialog
      v-model:open="showBatchUpload"
      :libraries="mira.libraries.value"
      :folders="mira.folders.value"
      :tags="mira.tags.value"
      :initial-library-id="mira.currentLibraryId.value"
      :initial-folder-id="batchUploadFolderId"
      :initial-tag-titles="batchUploadTagTitles"
      :initial-files="batchUploadFiles"
      :upload-file="mira.uploadFile"
      :create-node="mira.handleCreateNode"
      @uploaded="handleBatchUploaded"
      @library-change="mira.handleLibraryChange"
    />
  </div>
</template>
