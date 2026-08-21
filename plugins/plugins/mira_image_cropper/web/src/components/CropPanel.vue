<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { zipSync } from 'fflate'
import { Download, Plus, SquarePen, Trash2 } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Input } from 'mira-plugin-ui/src/components/ui/input'
import { Label } from 'mira-plugin-ui/src/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from 'mira-plugin-ui/src/components/ui/select'
import BatchUploadDialog from 'mira-plugin-ui/src/BatchUploadDialog.vue'
import type { CropRegion } from '@/types'
import { useCropperStore } from '@/stores/cropper'
import {
  createFolder, fetchFolders, fetchLibraries, getServerConfig, uploadFile,
  type FolderItem, type LibraryItem,
} from '@/lib/server'
import { logError } from '@/lib/host'
import CropThumb from '@/components/CropThumb.vue'

/**
 * 右侧面板（数据均属于当前实例）：
 *   - 裁切结果列表（实时缩略图，逐个下载/删除）
 *   - 导出设置（格式/质量/前缀，每实例独立）
 *   - 批量下载（多个选区自动 zip 打包）+ 「导出到」（BatchUploadDialog 批量入库）
 */
const store = useCropperStore()

const progress = reactive({ active: false, done: 0, total: 0, mode: '' as '' | 'download' })
const exportError = ref('')

/** 按原图分辨率渲染选区 → Blob（越界区域：PNG 透明 / JPG 白底） */
function renderRegion(region: CropRegion): Promise<Blob> {
  const img = store.imageEl
  if (!img) return Promise.reject(new Error('图片未加载'))
  const w = Math.max(1, Math.round(region.w))
  const h = Math.max(1, Math.round(region.h))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  if (store.format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(img, region.x, region.y, region.w, region.h, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob 失败'))),
      `image/${store.format}`,
      store.quality,
    )
  })
}

async function renderAll(): Promise<{ name: string; blob: Blob }[]> {
  const items: { name: string; blob: Blob }[] = []
  for (let i = 0; i < store.regions.length; i++) {
    items.push({ name: store.exportFileName(i), blob: await renderRegion(store.regions[i]) })
  }
  return items
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** 单个选区导出（列表行内下载按钮） */
async function exportOne(index: number, region: CropRegion) {
  try {
    const blob = await renderRegion(region)
    downloadBlob(blob, store.exportFileName(index))
  } catch (error) {
    logError('[image-cropper] exportOne failed:', error)
    exportError.value = error instanceof Error ? error.message : String(error)
  }
}

/** 批量下载：单个选区直接下载，多个选区 zip 打包 */
async function runBatchDownload() {
  if (!store.regions.length || progress.active) return
  progress.active = true
  progress.done = 0
  progress.total = store.regions.length
  progress.mode = 'download'
  exportError.value = ''
  try {
    const items = await renderAll()
    if (items.length === 1) {
      downloadBlob(items[0].blob, items[0].name)
    } else {
      const entries: Record<string, Uint8Array> = {}
      const used = new Set<string>()
      for (const item of items) {
        // zip 内同名防覆盖
        let name = item.name
        let n = 2
        while (used.has(name)) {
          name = item.name.replace(/(\.[^.]+)$/, `_${n++}$1`)
        }
        used.add(name)
        entries[name] = new Uint8Array(await item.blob.arrayBuffer())
      }
      const zipName = `${store.fileNamePrefix}_crops.zip`
      downloadBlob(new Blob([zipSync(entries)]), zipName)
    }
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : String(error)
    logError('[image-cropper] batch download failed:', error)
  } finally {
    progress.active = false
  }
}

// ── 导出到（BatchUploadDialog 批量入库） ────────────
const exportDialogOpen = ref(false)
const exportFiles = ref<File[]>([])
const libraries = ref<LibraryItem[]>([])
const folders = ref<FolderItem[]>([])
const preparing = ref(false)

const canExportTo = computed(() => Boolean(getServerConfig().token))

async function openExportDialog() {
  if (preparing.value) return
  if (!store.regions.length) {
    exportError.value = '请先在图片上绘制选区'
    return
  }
  if (!canExportTo.value) {
    exportError.value = '缺少服务器连接信息（请从 Mira 主窗口打开本插件）'
    return
  }
  preparing.value = true
  exportError.value = ''
  try {
    console.log('[image-cropper] export-to: begin', { regions: store.regions.length })
    const items = await renderAll()
    console.log('[image-cropper] export-to: rendered', items.length)
    exportFiles.value = items.map(({ name, blob }) =>
      new File([blob], name, { type: blob.type || 'image/png' }),
    )
    // 库列表 + 当前库文件夹树（切换库时表单触发 library-change 再拉取）
    const [libs, currentFolders] = await Promise.all([
      fetchLibraries(),
      fetchFolders(getServerConfig().libraryId),
    ])
    console.log('[image-cropper] export-to: libraries/folders', { libs: libs.length, folders: currentFolders.length })
    libraries.value = libs
    folders.value = currentFolders
    exportDialogOpen.value = true
    console.log('[image-cropper] export-to: dialog open =', exportDialogOpen.value)
  } catch (error) {
    console.error('[image-cropper] export-to failed:', error)
    exportError.value = error instanceof Error ? error.message : String(error)
    logError('[image-cropper] prepare export failed:', error)
  } finally {
    preparing.value = false
  }
}

function onExportLibraryChange(libraryId: string) {
  void fetchFolders(libraryId).then((data) => { folders.value = data })
}

function onExportUploaded(payload: { total: number; failed: number }) {
  if (payload.failed > 0) {
    exportError.value = `${payload.failed}/${payload.total} 个文件导入失败`
  }
}

const progressText = computed(() => (progress.active ? `${progress.done}/${progress.total}` : ''))
</script>

<template>
  <aside class="w-80 shrink-0 border-l bg-background flex flex-col min-h-0">
    <!-- 裁切列表 -->
    <div class="flex items-center gap-1 px-3 h-10 border-b shrink-0">
      <span class="text-sm font-medium flex-1">裁切列表（{{ store.regions.length }}）</span>
      <Button variant="ghost" size="icon-xs" title="添加选区" :disabled="!store.image" @click="store.addDefaultRegion()">
        <Plus />
      </Button>
      <Button variant="ghost" size="icon-xs" title="清空所有选区" :disabled="!store.regions.length" @click="store.clearRegions()">
        <Trash2 />
      </Button>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
      <div
        v-for="(region, index) in store.regions"
        :key="region.id"
        class="group flex gap-2 p-2 rounded-lg border cursor-pointer transition-colors"
        :class="region.id === store.selectedId ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'"
        @click="store.select(region.id)"
      >
        <CropThumb :region="region" class="shrink-0" />
        <div class="flex-1 min-w-0 flex flex-col">
          <span class="text-xs font-mono text-muted-foreground truncate">
            {{ store.exportFileName(index) }}
          </span>
          <span class="text-xs font-mono text-muted-foreground mt-0.5">
            {{ Math.round(region.w) }} × {{ Math.round(region.h) }}
          </span>
          <span class="text-[11px] font-mono text-muted-foreground/70 mt-0.5 truncate">
            x:{{ Math.round(region.x) }} y:{{ Math.round(region.y) }}
          </span>
        </div>
        <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-xs" title="下载此选区" @click.stop="exportOne(index, region)">
            <Download />
          </Button>
          <Button variant="ghost" size="icon-xs" title="删除此选区" @click.stop="store.removeRegion(region.id)">
            <Trash2 />
          </Button>
        </div>
      </div>

      <button
        v-if="store.image"
        class="w-full flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed text-muted-foreground hover:bg-accent/50 transition-colors"
        title="添加选区"
        @click="store.addDefaultRegion()"
      >
        <SquarePen class="size-3.5" />
      </button>
      <div v-else class="text-center text-xs text-muted-foreground py-6">选择左侧图片后在此查看裁切结果</div>
    </div>

    <!-- 导出设置 -->
    <div class="border-t p-3 space-y-3 shrink-0">
      <div class="flex items-center gap-2">
        <Label class="text-xs shrink-0">格式</Label>
        <Select v-model="store.format">
          <SelectTrigger class="h-8 text-xs flex-1 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG（无损/透明）</SelectItem>
            <SelectItem value="jpeg">JPG（体积小）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-if="store.format === 'jpeg'" class="flex items-center gap-2">
        <Label class="text-xs shrink-0">质量</Label>
        <input
          v-model.number="store.quality"
          type="range" min="0.3" max="1" step="0.02"
          class="flex-1 accent-[var(--primary)]"
        />
        <span class="text-xs font-mono text-muted-foreground w-9 text-right">{{ Math.round(store.quality * 100) }}%</span>
      </div>

      <div class="flex items-center gap-2">
        <Label class="text-xs shrink-0">前缀</Label>
        <Input v-model="store.prefix" class="h-8 text-xs flex-1" placeholder="导出文件名前缀" />
      </div>

      <div v-if="exportError" class="text-xs text-destructive break-all">{{ exportError }}</div>

      <div class="flex gap-2">
        <Button
          variant="outline" size="sm" class="flex-1"
          title="批量下载（多个选区自动 zip 打包）"
          :disabled="!store.regions.length || progress.active"
          @click="runBatchDownload"
        >
          下载
        </Button>
        <Button
          size="sm" class="flex-1"
          title="导出到素材库 / 文件夹"
          :disabled="preparing"
          @click="openExportDialog"
        >
          导出到
        </Button>
      </div>
      <div v-if="progress.active || preparing" class="text-xs text-muted-foreground flex items-center gap-1">
        <span class="animate-pulse">{{ preparing ? '生成裁切结果' : '下载' }}中…</span>
        <span v-if="progressText" class="font-mono">{{ progressText }}</span>
      </div>
    </div>

    <!-- 导出到素材库（批量上传对话框） -->
    <BatchUploadDialog
      v-model:open="exportDialogOpen"
      :libraries="libraries"
      :folders="folders"
      :initial-library-id="getServerConfig().libraryId"
      :upload-file="uploadFile"
      :create-node="(payload: any) => (payload.kind === 'folder' ? createFolder(payload) : Promise.resolve(undefined))"
      :initial-files="exportFiles"
      title="导出裁切结果"
      description="选择素材库与文件夹，将全部裁切结果导入指定位置。"
      submit-text="开始导入"
      @library-change="onExportLibraryChange"
      @uploaded="onExportUploaded"
    />
  </aside>
</template>
