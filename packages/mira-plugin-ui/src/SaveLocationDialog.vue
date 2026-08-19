<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const availableFolders = computed(() => props.folders.filter(folder => !libraryId.value || true))
function close () { emit('update:open', false) }
function confirm () {
  const normalized = fileName.value.trim().replace(/\.tiptap$/i, '') + '.tiptap'
  if (!libraryId.value || !normalized || normalized === '.tiptap') return
  emit('save', { libraryId: libraryId.value, folderId: folderId.value || undefined, fileName: normalized })
  close()
}
</script>

<template>
  <div v-if="open" class="save-dialog-backdrop" @click.self="close">
    <section class="save-dialog" role="dialog" aria-modal="true" aria-label="保存文档">
      <header><h2>保存文档</h2><button title="关闭" @click="close">×</button></header>
      <label>素材库<select v-model="libraryId"><option v-for="library in libraries" :key="library.id" :value="String(library.id)">{{ library.name || library.title || library.id }}</option></select></label>
      <label>文件夹<select v-model="folderId"><option value="">根目录</option><option v-for="folder in availableFolders" :key="folder.id" :value="String(folder.id)">{{ folder.title || folder.name || folder.id }}</option></select></label>
      <label>文件名<input v-model="fileName" autocomplete="off" @keyup.enter="confirm" /></label>
      <footer><button class="secondary" @click="close">取消</button><button class="primary" :disabled="!libraryId || !fileName.trim()" @click="confirm">保存</button></footer>
    </section>
  </div>
</template>

<style scoped>
.save-dialog-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; background: #0f172a66; }
.save-dialog { width: min(420px, calc(100vw - 28px)); padding: 18px; border: 1px solid #dbe1ea; border-radius: 8px; background: #fff; color: #172033; box-shadow: 0 18px 60px #10182833; }
header, footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; } h2 { margin: 0 0 14px; font-size: 17px; } header button { border: 0; background: none; font-size: 22px; cursor: pointer; }
label { display: grid; gap: 6px; margin: 12px 0; font-size: 13px; color: #475467; } input, select { width: 100%; height: 36px; padding: 0 9px; border: 1px solid #d0d5dd; border-radius: 6px; background: #fff; color: #172033; }
footer { justify-content: flex-end; margin-top: 18px; } footer button { height: 34px; padding: 0 14px; border-radius: 6px; cursor: pointer; } .secondary { border: 1px solid #d0d5dd; background: #fff; } .primary { border: 1px solid #3157c8; background: #3157c8; color: #fff; } .primary:disabled { opacity: .5; cursor: not-allowed; }
</style>
