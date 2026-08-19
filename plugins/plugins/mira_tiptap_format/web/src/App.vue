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
import { Maximize2, Minimize2 } from 'lucide-vue-next'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { SaveLocationDialog, type SaveLocation } from 'mira-plugin-ui'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import LinkEditorMenu from '@/components/editor/LinkEditorMenu.vue'
import TextBubbleMenu from '@/components/editor/TextBubbleMenu.vue'
import DragHandle from '@/components/editor/DragHandle.vue'
import SlashCommandMenu from '@/components/editor/SlashCommandMenu.vue'
import DocumentIconPicker from '@/components/editor/DocumentIconPicker.vue'
import OutlinePanel from '@/components/editor/OutlinePanel.vue'
import CoverBanner from '@/components/editor/CoverBanner.vue'
import OpenFileDialog from '@/components/editor/OpenFileDialog.vue'
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
const showSaveDialog = ref(false)
const showOpenDialog = ref(false)
const openDocs = ref<any[]>([])
const openDocsLoading = ref(false)
const libraries = ref<any[]>([])
const folders = ref<any[]>([])
const currentLibraryId = ref(initialLibraryId)
const currentFileId = ref(initialFileId)
const currentFileName = ref(initialFileName)
const title = ref('')
const icon = ref('')
const cover = ref<{ type: 'gradient' | 'url'; value: string } | null>(null)
const wide = ref(localStorage.getItem('mira-tiptap-wide') === '1')
let saveTimer: ReturnType<typeof setTimeout> | undefined

function toggleWide () {
  wide.value = !wide.value
  localStorage.setItem('mira-tiptap-wide', wide.value ? '1' : '0')
}

// 大标题同步为默认文件名
watch(title, (value) => {
  const name = value.trim()
  if (name) currentFileName.value = `${name.replace(/\.tiptap$/i, '')}.tiptap`
  scheduleSave()
})

watch(icon, () => scheduleSave())
watch(cover, () => scheduleSave())

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
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveExisting(), 700)
}

/** 文档 JSON 附加大标题、图标与封面一起持久化 */
function docJson () {
  if (!editor.value) return { type: 'doc' }
  return { ...editor.value.getJSON(), title: title.value.trim(), icon: icon.value, cover: cover.value }
}

async function saveExisting () {
  if (!editor.value || !currentLibraryId.value || !currentFileId.value) return
  try {
    await client.files().writeFile(currentLibraryId.value, currentFileId.value, JSON.stringify(docJson(), null, 2), { name: currentFileName.value, contentType: 'application/vnd.mira.tiptap+json', silent: true })
  } catch (error) { console.error('[mira-tiptap] save failed', error) }
}

/** 保存请求：素材库已有文档直接覆盖保存，新文档才弹位置选择 */
function handleSaveRequest () {
  if (currentFileId.value && currentLibraryId.value && !isNewDocument.value) {
    if (saveTimer) clearTimeout(saveTimer)
    void saveExisting()
    return
  }
  void openSaveDialog()
}

async function openSaveDialog () {
  libraries.value = await client.libraries().getAll() as any[]
  currentLibraryId.value ||= String(libraries.value[0]?.id || '')
  folders.value = currentLibraryId.value ? await client.folders().getAll(currentLibraryId.value) as any[] : []
  showSaveDialog.value = true
}

async function saveToLocation (location: SaveLocation) {
  if (!editor.value) return
  try {
    const content = JSON.stringify(docJson(), null, 2)
    if (currentFileId.value && currentLibraryId.value === location.libraryId && !isNewDocument.value) {
      await client.files().writeFile(location.libraryId, currentFileId.value, content, { name: location.fileName, contentType: 'application/vnd.mira.tiptap+json', silent: true })
    } else {
      const response: any = await client.files().uploadFile(new File([content], location.fileName, { type: 'application/vnd.mira.tiptap+json' }), location.libraryId, { folderId: location.folderId, silent: true })
      const created = response?.results?.[0]?.result || response?.data || response?.result
      currentFileId.value = created?.id ? String(created.id) : currentFileId.value
      currentLibraryId.value = location.libraryId
      currentFileName.value = location.fileName
      isNewDocument.value = false
    }
  } catch (error) { console.error('[mira-tiptap] save failed', error) }
}

function handleKeydown (event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey)) return
  const key = event.key.toLowerCase()
  if (key === 's') { event.preventDefault(); handleSaveRequest() }
  if (key === 'o') { event.preventDefault(); void openFileList() }
}

/** 列出当前素材库中的 .tiptap 文档 */
async function openFileList () {
  showOpenDialog.value = true
  openDocsLoading.value = true
  try {
    if (!libraries.value.length) {
      libraries.value = await client.libraries().getAll() as any[]
      currentLibraryId.value ||= String(libraries.value[0]?.id || '')
    }
    if (!currentLibraryId.value) { openDocs.value = []; return }
    const list = await client.files().getFilesByExtension(currentLibraryId.value, 'tiptap') as any[]
    openDocs.value = (list || [])
      .filter(file => String(file.extension || '').toLowerCase().replace(/^\./, '') === 'tiptap')
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
  } catch (error) {
    console.error('[mira-tiptap] list docs failed', error)
    openDocs.value = []
  } finally {
    openDocsLoading.value = false
  }
}

/** 从素材库加载文档到编辑器 */
async function loadDocument (file: any) {
  showOpenDialog.value = false
  if (!editor.value) return
  try {
    const blob = await client.files().download(currentLibraryId.value, String(file.id))
    const json = JSON.parse(await blob.text())
    title.value = typeof json?.title === 'string' ? json.title : ''
    icon.value = typeof json?.icon === 'string' ? json.icon : ''
    cover.value = json?.cover && typeof json.cover.value === 'string' ? json.cover : null
    editor.value.commands.setContent(json)
    currentFileId.value = String(file.id)
    currentFileName.value = String(file.title || file.name || 'document.tiptap')
    isNewDocument.value = false
  } catch (error) { console.error('[mira-tiptap] open failed', error) }
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
    cover.value = json?.cover && typeof json.cover.value === 'string' ? json.cover : null
    editor.value?.commands.setContent(json)
  } catch (error) { console.error('[mira-tiptap] load failed', error) }
})
onBeforeUnmount(() => { window.removeEventListener('keydown', handleKeydown); if (saveTimer) clearTimeout(saveTimer); editor.value?.destroy() })
</script>

<template>
  <main class="flex h-full flex-col">
    <template v-if="editor">
      <EditorToolbar :editor="editor" @save="handleSaveRequest" @open-file="openFileList" @save-as="openSaveDialog" />
      <div class="scroll-thin flex-1 overflow-y-auto bg-muted/40" @mousedown.self="focusEnd">
        <!-- 宽屏模式右缘不超过固定大纲（大纲 208px + 边距），居中模式保持窄栏 -->
        <div :class="wide ? 'my-6 ml-4 w-[calc(100%-16rem)]' : 'my-8 mx-auto w-[calc(100%-4rem)] max-w-3xl'">
          <div class="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm">
            <button
              type="button"
              :title="wide ? '切换为居中版式' : '切换为宽屏版式'"
              class="absolute right-3 top-3 z-20 flex size-7 cursor-pointer items-center justify-center rounded-lg bg-background/40 text-muted-foreground opacity-60 backdrop-blur transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
              @mousedown.prevent
              @click="toggleWide"
            >
              <Minimize2 v-if="wide" class="size-4" />
              <Maximize2 v-else class="size-4" />
            </button>
            <DragHandle :editor="editor" />
            <SlashCommandMenu :editor="editor" />
            <CoverBanner v-model="cover" />
            <div
              class="relative z-10 pb-8 pl-24 pr-10"
              :class="cover ? 'pt-44' : 'pt-8'"
              @mousedown.self="focusEnd"
            >
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
          </div>
        </div>
      </div>
      <TextBubbleMenu :editor="editor" />
      <LinkEditorMenu :editor="editor" />
      <OutlinePanel :editor="editor" />
    </template>
    <SaveLocationDialog v-model:open="showSaveDialog" :libraries="libraries" :folders="folders" :initial-library-id="currentLibraryId" :initial-file-name="currentFileName" @save="saveToLocation" />
    <OpenFileDialog v-model:open="showOpenDialog" :files="openDocs" :loading="openDocsLoading" @select="loadDocument" />
  </main>
</template>
