<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { SaveLocationDialog, type SaveLocation } from 'mira-plugin-ui'

const params = new URLSearchParams(location.search)
const initialLibraryId = params.get('libraryId') || ''
const initialFileId = params.get('fileId') || ''
const fileUrl = params.get('fileUrl') || ''
const initialFileName = params.get('fileName') || 'document.tiptap'
const isNewDocument = ref(params.get('new') === '1' || !fileUrl)
const apiBaseUrl = params.get('apiBaseUrl') || location.origin
const token = params.get('token') || new URL(fileUrl || location.href).searchParams.get('token') || ''
const client = new MiraClient(apiBaseUrl).setToken(token)
const status = ref(isNewDocument.value ? '新建文档' : '正在加载...')
const showSaveDialog = ref(false)
const libraries = ref<any[]>([])
const folders = ref<any[]>([])
const currentLibraryId = ref(initialLibraryId)
const currentFileId = ref(initialFileId)
const currentFileName = ref(initialFileName)
let saveTimer: ReturnType<typeof setTimeout> | undefined

const editor = useEditor({
  extensions: [StarterKit, Placeholder.configure({ placeholder: '开始写作...' })],
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  onUpdate: () => {
    if (!currentFileId.value) return
    status.value = '有未保存修改'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void saveExisting(), 700)
  },
})

async function saveExisting () {
  if (!editor.value || !currentLibraryId.value || !currentFileId.value) return
  status.value = '保存中...'
  try {
    await client.files().writeFile(currentLibraryId.value, currentFileId.value, JSON.stringify(editor.value.getJSON(), null, 2), { name: currentFileName.value, contentType: 'application/vnd.mira.tiptap+json' })
    status.value = '已保存'
  } catch (error) { console.error('[mira-tiptap] save failed', error); status.value = '保存失败' }
}

async function openSaveDialog () {
  libraries.value = await client.libraries().getAll() as any[]
  currentLibraryId.value ||= String(libraries.value[0]?.id || '')
  folders.value = currentLibraryId.value ? await client.folders().getAll(currentLibraryId.value) as any[] : []
  showSaveDialog.value = true
}

async function saveToLocation (location: SaveLocation) {
  if (!editor.value) return
  status.value = '保存中...'
  try {
    const content = JSON.stringify(editor.value.getJSON(), null, 2)
    if (currentFileId.value && currentLibraryId.value === location.libraryId && !isNewDocument.value) {
      await client.files().writeFile(location.libraryId, currentFileId.value, content, { name: location.fileName, contentType: 'application/vnd.mira.tiptap+json' })
    } else {
      const response: any = await client.files().uploadFile(new File([content], location.fileName, { type: 'application/vnd.mira.tiptap+json' }), location.libraryId, { folderId: location.folderId })
      const created = response?.results?.[0]?.result || response?.data || response?.result
      currentFileId.value = created?.id ? String(created.id) : currentFileId.value
      currentLibraryId.value = location.libraryId
      currentFileName.value = location.fileName
      isNewDocument.value = false
    }
    status.value = '已保存'
  } catch (error) { console.error('[mira-tiptap] save failed', error); status.value = '保存失败' }
}

function handleKeydown (event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void openSaveDialog() }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  if (isNewDocument.value) return
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`加载失败 (${response.status})`)
    editor.value?.commands.setContent(await response.json())
    status.value = '已加载'
  } catch (error) { console.error('[mira-tiptap] load failed', error); status.value = '加载失败' }
})
onBeforeUnmount(() => { window.removeEventListener('keydown', handleKeydown); if (saveTimer) clearTimeout(saveTimer); editor.value?.destroy() })
</script>

<template>
  <main class="editor-shell">
    <header class="toolbar">
      <button title="粗体" :class="{ active: editor?.isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()"><strong>B</strong></button>
      <button title="斜体" :class="{ active: editor?.isActive('italic') }" @click="editor?.chain().focus().toggleItalic().run()"><em>I</em></button>
      <button title="标题" :class="{ active: editor?.isActive('heading', { level: 2 }) }" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button title="项目列表" :class="{ active: editor?.isActive('bulletList') }" @click="editor?.chain().focus().toggleBulletList().run()">• List</button>
      <button title="撤销" @click="editor?.chain().focus().undo().run()">↶</button><button title="重做" @click="editor?.chain().focus().redo().run()">↷</button>
      <button class="save-button" title="保存" @click="openSaveDialog">保存</button><span class="status">{{ status }}</span>
    </header>
    <EditorContent v-if="editor" :editor="editor" class="editor" />
    <SaveLocationDialog v-model:open="showSaveDialog" :libraries="libraries" :folders="folders" :initial-library-id="currentLibraryId" :initial-file-name="initialFileName" @save="saveToLocation" />
  </main>
</template>
