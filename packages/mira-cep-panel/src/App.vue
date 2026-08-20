<script setup lang="ts">
/**
 * Mira 素材库 CEP 面板:登录 Mira Server 后以 MediaLibraryView 三栏视图
 * (左 文件夹/标签树 · 中 MediaBrowser · 右 MediaDetail)浏览/管理素材,
 * 对应 mira-plugin-ui demo App.vue 的三栏视图演示接线。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { MediaLibraryView } from 'mira-plugin-ui/library'
import type { LibraryTreeUpload, MediaBrowserMenu, MediaLibraryServices } from 'mira-plugin-ui/library'
// 不经库根入口(其会再引入一份 tailwind.css),直接引源码路径
import BatchUploadDialog from 'mira-plugin-ui/src/BatchUploadDialog.vue'
import { useMira } from './services'
import { exportActiveLayerFile, placeLocalFile, prefetchToTemp, tempPathFor } from './cep'

const mira = useMira()
onMounted(() => mira.restore())

/* ---------- 拖拽素材到 PS:dragstart 带原始 URL;拖出面板松手时兜底下载+置入 ---------- */
const dragStatus = ref('')
let statusTimer: ReturnType<typeof setTimeout> | undefined

function notify(msg: string) {
  dragStatus.value = msg
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => { dragStatus.value = '' }, 4000)
}

/** 从事件目标解析素材项:向上找到「恰好包含一个缩略图」的卡片,经缩略图 URL(/api/files/thumb/:lib/:id)反查文件 id */
function resolveItem(target: EventTarget | null): { el: Element; lib: string; id: string } | null {
  let el = target as Element | null
  if (!el || el.nodeType !== 1) return null
  const scope = el.tagName === 'IMG' ? el.parentElement : el
  let card: Element | null = null
  let thumbSrc = ''
  let sid = ''
  for (let p: Element | null = scope; p && p !== document.body; p = p.parentElement) {
    const imgs = p.querySelectorAll('img[src*="/api/files/thumb/"]')
    if (imgs.length > 1) return null // 已到列表容器层级(含多张缩略图),不是卡片
    if (imgs.length === 1) {
      card = p
      thumbSrc = imgs[0].getAttribute('src') || ''
      break
    }
    const s = p.getAttribute('data-selectable-id')
    if (s && p.classList?.contains('group')) {
      card = p
      sid = s
      break
    }
  }
  if (!card) return null
  if (thumbSrc) {
    const match = /\/api\/files\/thumb\/([^/?]+)\/([^/?]+)/.exec(thumbSrc)
    if (match) return { el: card, lib: match[1], id: match[2] }
  }
  return sid ? { el: card, lib: mira.currentLibraryId.value, id: sid } : null
}

interface DragItem { url: string; localPath: string; name: string }
let dragItem: DragItem | null = null

/** 解析素材项并提前预下载,保证拖到 PS 松手时本地文件已就绪(同目标下载自动去重) */
function beginDragItem(target: EventTarget | null): { item: DragItem; el: Element } | null {
  const hit = resolveItem(target)
  if (!hit) return null
  const url = `${mira.serverURL.value}/api/files/file/${hit.lib}/${hit.id}?token=${mira.token.value}`
  const name = hit.el.querySelector('.truncate')?.textContent?.trim() || `mira-${hit.id}`
  const temp = tempPathFor(hit.lib, String(hit.id), name)
  if (!temp) return null
  void prefetchToTemp(url, temp.path).catch(() => { /* 下载失败留给兜底路径报错 */ })
  return { item: { url, localPath: temp.path, name }, el: hit.el }
}

// 缩略图卡片默认不可拖,mousedown 时打上 draggable 让原生拖拽能启动
function onItemMouseDown(event: MouseEvent) {
  if (event.button !== 0) return
  beginDragItem(event.target)?.el.setAttribute('draggable', 'true')
}

function onItemDragStart(event: DragEvent) {
  const ctx = beginDragItem(event.target)
  if (!ctx || !event.dataTransfer) return
  dragItem = ctx.item
  try {
    // CEP 原生拖出:Adobe 专用类型 + 本地文件路径(Windows 用真实单反斜杠路径;PS 2020 若不支持
    // 该类型,drag-over 会显示禁止光标,松手后由 dragend 兜底置入)
    const path = ctx.item.localPath
    const dndPath = /win/i.test(String(navigator.platform || ''))
      ? path.replace(/\//g, '\\')
      : path
    event.dataTransfer.setData('com.adobe.cep.dnd.file.0', dndPath)
    event.dataTransfer.effectAllowed = 'copy'
  } catch {
    /* 拖拽元数据失败仍有 dragend 兜底 */
  }
}

function onItemDragEnd(event: DragEvent) {
  const item = dragItem
  dragItem = null
  if (!item) return
  // 已被宿主接收(dropEffect 非 none),或指针仍在面板内:不兜底
  const dropEffect = event.dataTransfer?.dropEffect
  if (dropEffect && dropEffect !== 'none') return
  const inside = event.clientX > 0 && event.clientY > 0 && event.clientX < window.innerWidth && event.clientY < window.innerHeight
  if (inside) return
  void placeLocalFile(item.url, item.localPath, item.name, notify)
}

onMounted(() => {
  document.addEventListener('mousedown', onItemMouseDown, true)
  document.addEventListener('dragstart', onItemDragStart, true)
  document.addEventListener('dragend', onItemDragEnd, true)
})

/* ---------- 批量上传(树右键「上传到此处」/ 列表「导入文件」共用) ---------- */
const showBatchUpload = ref(false)
const batchUploadFolderId = ref('')
const batchUploadTagTitles = ref<string[]>([])
const batchUploadFiles = ref<File[]>([])
const psMenu: MediaBrowserMenu[] = [{
  key: 'photoshop',
  label: 'Photoshop1',
  items: [{ key: 'import-active-layer', label: '导入当前图层' }],
}]

async function onLibraryMenuSelect(menuKey: string, itemKey: string) {
  if (menuKey !== 'photoshop' || itemKey !== 'import-active-layer') return
  try {
    notify('正在从 Photoshop 导出当前图层…')
    const file = await exportActiveLayerFile()
    openBatchUpload('', [], [file])
  } catch (error: any) {
    notify(`导入失败: ${error?.message || error}`)
  }
}

function openBatchUpload(folderId = '', tagTitles: string[] = [], files: File[] = []) {
  console.log('[mira-batch-upload] open-request', {
    folderId,
    tagCount: tagTitles.length,
    fileCount: files.length,
    cep: Boolean((window as typeof window & { cep?: unknown }).cep),
    csInterface: Boolean((window as typeof window & { CSInterface?: unknown }).CSInterface),
  })
  batchUploadFolderId.value = folderId
  batchUploadTagTitles.value = tagTitles
  batchUploadFiles.value = files
  showBatchUpload.value = true
}

watch(showBatchUpload, open => console.log('[mira-batch-upload] open-state', open))

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
      <header class="border-border bg-card flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3">
        <span class="text-xs font-semibold">Mira 素材库</span>
        <span class="text-muted-foreground flex min-w-0 items-center gap-2 text-[11px]">
          <span v-if="dragStatus" class="text-primary max-w-40 truncate" :title="dragStatus">{{ dragStatus }}</span>
          <span class="truncate" :title="mira.serverURL.value">{{ mira.serverURL.value }}</span>
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
          :menus="psMenu"
          @menu-select="onLibraryMenuSelect"
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
