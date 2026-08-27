<script setup lang="ts">
/**
 * 保存位置对话框:Dialog 壳 + SaveLocationForm 表单。
 * 表单逻辑(树选择/文件展示/输入项)全部在 SaveLocationForm 中,
 * 这里只做 props/emits 透传;reka-ui 关闭时卸载内容,表单每次打开自动重置。
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog'
import SaveLocationForm from './SaveLocationForm.vue'
import type { SaveLocation } from './types'

interface Library { id: string | number; name?: string; title?: string }
/** 文件夹/标签扁平项(id/title/parent_id 与后端一致,color 用于图标着色) */
interface TreeItem { id: string | number; title?: string; name?: string; parent_id?: string | number | null; color?: number }

withDefaults(defineProps<{
  open: boolean
  libraries: Library[]
  folders: TreeItem[]
  tags?: TreeItem[]
  files?: File[]
  initialLibraryId?: string
  initialFolderId?: string
  initialFileName?: string
  initialUrl?: string
  initialNote?: string
  title?: string
  description?: string
  submitText?: string
  cancelText?: string
  /** 新建节点服务:透传给表单,创建成功返回新节点 id 供自动选中 */
  createNode?: (payload: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number; icon?: string }) => Promise<number | undefined>
}>(), {
  tags: () => [],
  files: () => [],
  initialLibraryId: '',
  initialFolderId: '',
  initialFileName: 'document.tiptap',
  initialUrl: '',
  initialNote: '',
  title: '保存文档',
  description: '选择素材库与文件夹，将文档保存到指定位置。',
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'save', value: SaveLocation): void
  (event: 'library-change', libraryId: string): void
  (event: 'remove-file', file: File): void
  (event: 'create-node', value: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number }): void
}>()

function close () { emit('update:open', false) }
</script>

<template>
  <Dialog :open="open" @update:open="value => value || close()">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <SaveLocationForm
        :libraries="libraries"
        :folders="folders"
        :tags="tags"
        :files="files"
        :initial-library-id="initialLibraryId"
        :initial-folder-id="initialFolderId"
        :initial-file-name="initialFileName"
        :initial-url="initialUrl"
        :initial-note="initialNote"
        :submit-text="submitText"
        :cancel-text="cancelText"
        :create-node="createNode"
        @save="emit('save', $event)"
        @library-change="emit('library-change', $event)"
        @remove-file="emit('remove-file', $event)"
        @create-node="emit('create-node', $event)"
        @cancel="close"
      />
    </DialogContent>
  </Dialog>
</template>
