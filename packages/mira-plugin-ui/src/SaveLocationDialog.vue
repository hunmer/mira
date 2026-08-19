<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SaveLocation } from './types'

interface Library { id: string | number; name?: string; title?: string }
interface Folder { id: string | number; title?: string; name?: string; parent_id?: string | number | null }

const props = withDefaults(defineProps<{
  open: boolean
  libraries: Library[]
  folders: Folder[]
  initialLibraryId?: string
  initialFolderId?: string
  initialFileName?: string
}>(), { initialLibraryId: '', initialFolderId: '', initialFileName: 'document.tiptap' })

const emit = defineEmits<{ (event: 'update:open', value: boolean): void; (event: 'save', value: SaveLocation): void }>()

// reka-ui SelectItem 不接受空字符串 value，根目录用哨兵值映射
const ROOT = '__root__'
const libraryId = ref('')
const folderId = ref('')
const fileName = ref('')

watch(() => props.open, (open) => {
  if (open) {
    libraryId.value = props.initialLibraryId || String(props.libraries[0]?.id || '')
    folderId.value = props.initialFolderId || ''
    fileName.value = props.initialFileName || 'document.tiptap'
  }
}, { immediate: true })

const folderValue = computed({
  get: () => folderId.value || ROOT,
  set: (value) => { folderId.value = value === ROOT ? '' : String(value) },
})
const availableFolders = computed(() => props.folders.filter(folder => !libraryId.value || true))
const canSave = computed(() => Boolean(libraryId.value && fileName.value.trim()))

function close () { emit('update:open', false) }
function confirm () {
  const normalized = fileName.value.trim().replace(/\.tiptap$/i, '') + '.tiptap'
  if (!libraryId.value || normalized === '.tiptap') return
  emit('save', { libraryId: libraryId.value, folderId: folderId.value || undefined, fileName: normalized })
  close()
}
</script>

<template>
  <Dialog :open="open" @update:open="value => value || close()">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>保存文档</DialogTitle>
        <DialogDescription>选择素材库与文件夹，将文档保存到指定位置。</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4">
        <div class="grid gap-2">
          <Label for="save-library">素材库</Label>
          <Select v-model="libraryId">
            <SelectTrigger id="save-library">
              <SelectValue placeholder="选择素材库" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="library in libraries" :key="library.id" :value="String(library.id)">
                {{ library.name || library.title || library.id }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-2">
          <Label for="save-folder">文件夹</Label>
          <Select v-model="folderValue">
            <SelectTrigger id="save-folder">
              <SelectValue placeholder="选择文件夹" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="ROOT">根目录</SelectItem>
              <SelectItem v-for="folder in availableFolders" :key="folder.id" :value="String(folder.id)">
                {{ folder.title || folder.name || folder.id }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-2">
          <Label for="save-file-name">文件名</Label>
          <Input id="save-file-name" v-model="fileName" autocomplete="off" @keyup.enter="confirm" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="close">取消</Button>
        <Button :disabled="!canSave" @click="confirm">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
