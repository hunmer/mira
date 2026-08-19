<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { SaveLocationDialog, type SaveLocation } from 'mira-plugin-ui'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import LinkEditorMenu from '@/components/editor/LinkEditorMenu.vue'
import TextBubbleMenu from '@/components/editor/TextBubbleMenu.vue'
import { SlashCommand } from '@/components/editor/slash-command'

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
  extensions: [
    StarterKit,
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    SlashCommand,
    Placeholder.configure({
      placeholder: ({ node, editor: instance, pos }) => {
        if (node.type.name === 'heading') return `标题 ${node.attrs.level}`
        if (node.type.name === 'paragraph' && pos === 1 && instance.isEmpty) return "输入 '/' 打开命令菜单，或直接开始书写…"
        return ''
      },
    }),
  ],
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
  <main class="flex h-full flex-col">
    <template v-if="editor">
      <EditorToolbar :editor="editor" :status="status" @save="openSaveDialog" />
      <div class="scroll-thin flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-3xl px-6 py-10 md:py-14">
          <EditorContent :editor="editor" />
        </div>
      </div>
      <TextBubbleMenu :editor="editor" />
      <LinkEditorMenu :editor="editor" />
    </template>
    <SaveLocationDialog v-model:open="showSaveDialog" :libraries="libraries" :folders="folders" :initial-library-id="currentLibraryId" :initial-file-name="currentFileName" @save="saveToLocation" />
  </main>
</template>
