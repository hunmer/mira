<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import Typography from '@tiptap/extension-typography'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { SaveLocationDialog, type SaveLocation } from 'mira-plugin-ui'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import LinkEditorMenu from '@/components/editor/LinkEditorMenu.vue'
import TextBubbleMenu from '@/components/editor/TextBubbleMenu.vue'
import DragHandle from '@/components/editor/DragHandle.vue'
import SlashCommandMenu from '@/components/editor/SlashCommandMenu.vue'
import DocumentIconPicker from '@/components/editor/DocumentIconPicker.vue'
import OutlinePanel from '@/components/editor/OutlinePanel.vue'
import { NotionKeyboard, TrailingNode } from '@/components/editor/extensions/notion-behaviors'

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
const title = ref('')
const icon = ref('')
let saveTimer: ReturnType<typeof setTimeout> | undefined

// 大标题同步为默认文件名
watch(title, (value) => {
  const name = value.trim()
  if (name) currentFileName.value = `${name.replace(/\.tiptap$/i, '')}.tiptap`
  scheduleSave()
})

watch(icon, () => scheduleSave())

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
    Typography,
    TrailingNode,
    NotionKeyboard,
    Placeholder.configure({
      placeholder: ({ node, editor: instance, pos }) => {
        if (node.type.name === 'heading') return `标题 ${node.attrs.level}`
        if (node.type.name === 'paragraph' && pos === 1 && instance.isEmpty) return "输入 '/' 打开命令菜单，或直接开始书写…"
        return ''
      },
    }),
  ],
  editorProps: {
    // Notion 行为：选中文字后粘贴纯 URL，直接把选区变成链接
    handlePaste: (view, event) => {
      const text = event.clipboardData?.getData('text/plain')?.trim() || ''
      const { from, to, empty } = view.state.selection
      if (empty || !/^https?:\/\/\S+$/i.test(text)) return false
      const mark = view.state.schema.marks.link.create({ href: text })
      view.dispatch(view.state.tr.addMark(from, to, mark))
      return true
    },
  },
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  onUpdate: () => scheduleSave(),
})

function scheduleSave () {
  if (!currentFileId.value) return
  status.value = '有未保存修改'
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveExisting(), 700)
}

/** 文档 JSON 附加大标题与图标一起持久化 */
function docJson () {
  if (!editor.value) return { type: 'doc' }
  return { ...editor.value.getJSON(), title: title.value.trim(), icon: icon.value }
}

async function saveExisting () {
  if (!editor.value || !currentLibraryId.value || !currentFileId.value) return
  status.value = '保存中...'
  try {
    await client.files().writeFile(currentLibraryId.value, currentFileId.value, JSON.stringify(docJson(), null, 2), { name: currentFileName.value, contentType: 'application/vnd.mira.tiptap+json' })
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
    const content = JSON.stringify(docJson(), null, 2)
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

// Notion 行为：点击内容列的空白区域时聚焦到文末
function focusEnd () {
  editor.value?.chain().focus('end').run()
}

// 大标题按 Enter / 下箭头进入正文编辑
function focusEditorStart () {
  editor.value?.chain().focus('start').run()
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  if (isNewDocument.value) return
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`加载失败 (${response.status})`)
    const json = await response.json()
    title.value = typeof json?.title === 'string' ? json.title : ''
    icon.value = typeof json?.icon === 'string' ? json.icon : ''
    editor.value?.commands.setContent(json)
    status.value = '已加载'
  } catch (error) { console.error('[mira-tiptap] load failed', error); status.value = '加载失败' }
})
onBeforeUnmount(() => { window.removeEventListener('keydown', handleKeydown); if (saveTimer) clearTimeout(saveTimer); editor.value?.destroy() })
</script>

<template>
  <main class="flex h-full flex-col">
    <template v-if="editor">
      <EditorToolbar :editor="editor" :status="status" @save="openSaveDialog" />
      <div class="scroll-thin flex-1 overflow-y-auto bg-muted/40" @mousedown.self="focusEnd">
        <div class="mx-auto my-8 flex w-[calc(100%-4rem)] max-w-[1080px] items-start justify-center gap-6">
          <div
            class="relative w-full max-w-3xl rounded-xl border bg-card px-10 py-9 shadow-sm"
            @mousedown.self="focusEnd"
          >
            <DragHandle :editor="editor" />
            <SlashCommandMenu :editor="editor" />
            <div class="mb-2 flex items-center gap-2">
              <DocumentIconPicker v-model="icon" />
              <input
                v-model="title"
                placeholder="无标题"
                class="min-w-0 flex-1 border-none bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
                @keydown.enter.prevent="focusEditorStart"
                @keydown.down.prevent="focusEditorStart"
              >
            </div>
            <EditorContent :editor="editor" />
          </div>
          <OutlinePanel :editor="editor" />
        </div>
      </div>
      <TextBubbleMenu :editor="editor" />
      <LinkEditorMenu :editor="editor" />
    </template>
    <SaveLocationDialog v-model:open="showSaveDialog" :libraries="libraries" :folders="folders" :initial-library-id="currentLibraryId" :initial-file-name="currentFileName" @save="saveToLocation" />
  </main>
</template>
