<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Download, LibraryBig, Plus, SquarePen, Trash2 } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Input } from 'mira-plugin-ui/src/components/ui/input'
import { Label } from 'mira-plugin-ui/src/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from 'mira-plugin-ui/src/components/ui/select'
import type { CropRegion } from '@/types'
import { useCropperStore } from '@/stores/cropper'
import { canSaveToLibrary, saveCropToLibrary } from '@/lib/server'
import { logError } from '@/lib/host'
import CropThumb from '@/components/CropThumb.vue'

/**
 * 右侧面板：裁切结果列表（实时缩略图）+ 导出设置（格式/质量/前缀）
 * + 批量「下载到本地」/「保存到素材库」（走服务端插件 /image-cropper/save）。
 */
const store = useCropperStore()

const progress = reactive({ active: false, done: 0, total: 0, mode: '' as '' | 'download' | 'save' })
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

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取裁切结果失败'))
    reader.readAsDataURL(blob)
  })
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

async function runBatch(mode: 'download' | 'save') {
  if (!store.regions.length || progress.active) return
  if (mode === 'save' && !canSaveToLibrary()) {
    exportError.value = '缺少服务器连接信息，无法保存到素材库（请从 Mira 主窗口打开本插件）'
    return
  }
  progress.active = true
  progress.done = 0
  progress.total = store.regions.length
  progress.mode = mode
  exportError.value = ''
  const failures: string[] = []
  for (let i = 0; i < store.regions.length; i++) {
    const region = store.regions[i]
    const fileName = store.exportFileName(i)
    try {
      const blob = await renderRegion(region)
      if (mode === 'download') {
        downloadBlob(blob, fileName)
      } else {
        const dataUrl = await blobToDataUrl(blob)
        const result = await saveCropToLibrary(fileName, dataUrl)
        if (!result.success) failures.push(`${fileName}: ${result.error}`)
      }
    } catch (error) {
      failures.push(`${fileName}: ${error instanceof Error ? error.message : String(error)}`)
    }
    progress.done = i + 1
  }
  progress.active = false
  if (failures.length) {
    exportError.value = `${failures.length} 项失败：${failures[0]}`
    logError('[image-cropper] batch export failures:', failures)
  }
}

const progressText = computed(() =>
  progress.active ? `${progress.done}/${progress.total}` : '',
)
</script>

<template>
  <aside class="w-80 shrink-0 border-l bg-background flex flex-col min-h-0">
    <!-- 裁切列表 -->
    <div class="flex items-center gap-2 px-3 h-10 border-b shrink-0">
      <span class="text-sm font-medium flex-1">裁切列表（{{ store.regions.length }}）</span>
      <Button variant="ghost" size="icon-xs" title="添加选区" :disabled="!store.image" @click="store.addDefaultRegion()">
        <Plus />
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
        class="w-full flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
        @click="store.addDefaultRegion()"
      >
        <SquarePen class="size-3.5" />添加选区
      </button>
      <div v-else class="text-center text-xs text-muted-foreground py-6">上传图片后在此查看裁切结果</div>
    </div>

    <!-- 导出设置 -->
    <div class="border-t p-3 space-y-3 shrink-0">
      <div class="flex items-center gap-2">
        <Label class="text-xs shrink-0">格式</Label>
        <Select v-model="store.format">
          <SelectTrigger class="h-8 text-xs flex-1">
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
        <Button variant="outline" size="sm" class="flex-1" :disabled="!store.regions.length || progress.active" @click="runBatch('download')">
          <Download />下载
        </Button>
        <Button size="sm" class="flex-1" :disabled="!store.regions.length || progress.active" :title="canSaveToLibrary() ? '' : '需从 Mira 主窗口打开'" @click="runBatch('save')">
          <LibraryBig />存入库
        </Button>
      </div>
      <div v-if="progress.active" class="text-xs text-muted-foreground flex items-center gap-1">
        <span class="animate-pulse">{{ progress.mode === 'save' ? '保存到素材库' : '下载' }}中…</span>
        <span class="font-mono">{{ progressText }}</span>
      </div>
    </div>
  </aside>
</template>
