<script setup lang="ts">
/**
 * 批量上传对话框:Dialog 壳 + BatchUploadForm 表单。
 * 表单逻辑(文件队列/树选择/上传执行)全部在 BatchUploadForm 中,
 * 这里只做 props/emits 透传;reka-ui 关闭时卸载内容,表单每次打开自动重置。
 */
// 注意:本组件可经 'mira-plugin-ui/src/...' 源码供宿主直接消费,必须用相对路径(宿主的 @ 别名指向其自身 src)
import { nextTick, onBeforeUnmount, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog'
import BatchUploadForm from './BatchUploadForm.vue'
import type { BatchUploadFileService, BatchUploadPayload } from './types'

interface Library { id: string | number; name?: string; title?: string }
/** 文件夹/标签扁平项(id/title/parent_id 与后端一致,color 用于图标着色) */
interface TreeItem { id: string | number; title?: string; name?: string; parent_id?: string | number | null; color?: number }

const props = withDefaults(defineProps<{
  open: boolean
  libraries: Library[]
  folders: TreeItem[]
  tags?: TreeItem[]
  initialLibraryId?: string
  initialFolderId?: string
  /** 初始预选标签(按标题匹配);透传给表单 */
  initialTagTitles?: string[]
  /** 上传服务:透传给表单,传入则组件内并发执行并展示进度 */
  uploadFile?: BatchUploadFileService
  concurrency?: number
  maxFiles?: number
  /** 初始预填文件(宿主文件选择器选好后传入);透传给表单 */
  initialFiles?: File[]
  accept?: string
  title?: string
  description?: string
  submitText?: string
  cancelText?: string
  /** 新建节点服务:透传给表单,创建成功返回新节点 id 供自动选中 */
  createNode?: (payload: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number; icon?: string }) => Promise<number | undefined>
}>(), {
  tags: () => [],
  initialLibraryId: '',
  initialFolderId: '',
  initialTagTitles: () => [],
  concurrency: 3,
  maxFiles: 200,
  initialFiles: () => [],
  accept: '*',
  title: '批量上传文件',
  description: '选择素材库与文件夹，将多个文件上传到指定位置。',
  submitText: '开始上传',
  cancelText: '取消',
})

console.log('[mira-batch-upload] setup', {
  cep: Boolean((window as typeof window & { cep?: unknown }).cep),
  csInterface: Boolean((window as typeof window & { CSInterface?: unknown }).CSInterface),
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'upload', value: BatchUploadPayload): void
  /** 队列全部结束;附带本批导入位置(首个文件目标,可作「直接导入」记忆) */
  (event: 'uploaded', value: { total: number; failed: number; libraryId?: string; folderId?: string; tags?: string[] }): void
  (event: 'library-change', libraryId: string): void
  (event: 'create-node', value: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number; icon?: string }): void
}>()

let cepCenterTimer: ReturnType<typeof setInterval> | undefined
let cepCenterTick = 0

function centerCepDialog() {
  const cepWindow = window as typeof window & { cep?: unknown; CSInterface?: unknown }
  if (!cepWindow.cep && !cepWindow.CSInterface) return
  void nextTick(() => {
    cepCenterTick += 1
    const el = document.querySelector('.cep-batch-upload-dialog') as HTMLElement | null
    if (!el) {
      if (cepCenterTick <= 3) console.log('[mira-cep-dialog] node-missing', { tick: cepCenterTick })
      return
    }
    const before = el.getBoundingClientRect()
    if (cepCenterTick <= 3 || cepCenterTick % 10 === 0) {
      console.log('[mira-cep-dialog] before', {
        tick: cepCenterTick,
        viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
        rect: { left: before.left, top: before.top, width: before.width, height: before.height },
        className: el.className,
        computed: {
          position: getComputedStyle(el).position,
          left: getComputedStyle(el).left,
          right: getComputedStyle(el).right,
          top: getComputedStyle(el).top,
          transform: getComputedStyle(el).transform,
          margin: getComputedStyle(el).margin,
        },
      })
    }
    const styles: Record<string, string> = {
      top: '0', right: '0', bottom: '0', left: '0',
      width: 'calc(100% - 2rem)', maxWidth: '896px', height: '85vh',
      margin: 'auto', transform: 'none',
    }
    Object.keys(styles).forEach(key => el.style.setProperty(key, styles[key], 'important'))
    const after = el.getBoundingClientRect()
    if (cepCenterTick <= 3 || cepCenterTick % 10 === 0) {
      console.log('[mira-cep-dialog] after', {
        tick: cepCenterTick,
        rect: { left: after.left, top: after.top, width: after.width, height: after.height },
        inline: el.getAttribute('style'),
      })
    }
  })
}

watch(() => props.open, open => {
  if (cepCenterTimer) clearInterval(cepCenterTimer)
  cepCenterTimer = undefined
  if (open) {
    cepCenterTick = 0
    console.log('[mira-cep-dialog] open', {
      hasCep: Boolean((window as typeof window & { cep?: unknown }).cep),
      hasCSInterface: Boolean((window as typeof window & { CSInterface?: unknown }).CSInterface),
    })
    centerCepDialog()
    // Reka Dialog 使用 Portal,CEP 中节点可能在后续 tick 才出现,持续校正直到关闭。
    cepCenterTimer = setInterval(centerCepDialog, 100)
  }
})
onBeforeUnmount(() => {
  if (cepCenterTimer) clearInterval(cepCenterTimer)
})

function close () { emit('update:open', false) }
</script>

<template>
  <Dialog :open="open" @update:open="value => value || close()">
    <DialogContent
      class="cep-batch-upload-dialog flex h-[85vh] max-h-[85vh] flex-col overflow-hidden sm:max-w-4xl"
    >
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <BatchUploadForm
        class="min-h-0 flex-1"
        :libraries="libraries"
        :folders="folders"
        :tags="tags"
        :initial-library-id="initialLibraryId"
        :initial-folder-id="initialFolderId"
        :initial-tag-titles="initialTagTitles"
        :upload-file="uploadFile"
        :concurrency="concurrency"
        :max-files="maxFiles"
        :initial-files="initialFiles"
        :accept="accept"
        :submit-text="submitText"
        :cancel-text="cancelText"
        :create-node="createNode"
        @upload="emit('upload', $event)"
        @uploaded="emit('uploaded', $event)"
        @library-change="emit('library-change', $event)"
        @create-node="emit('create-node', $event)"
        @cancel="close"
      />
    </DialogContent>
  </Dialog>
</template>
