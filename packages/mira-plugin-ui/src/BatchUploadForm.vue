<script setup lang="ts">
/**
 * 批量上传表单(自 mira-client FileUploadDialog 简化移植,可脱离对话框独立使用)。
 *
 * 布局:
 * - 左侧(dropzone):待上传文件区——点击/拖拽添加,多选;Attachment 卡片列表带进度/状态,
 *   点击卡片选中(单选);格式/文件名过滤仅影响查看,上传始终提交全部待上传文件
 * - 右侧上方:文件信息表单(FileInfoForm)——绑定当前选中文件,编辑文件名/URL/注释写回该文件
 * - 右侧下方:Tabs 切换 LibraryTreeView(文件夹树单选/标签树多选,树内搜索与「新增」
 *   对话框均由 LibraryTreeView 自带),应用到本批全部文件
 * - 底部:素材库 Select 与「上传」按钮同一行(取消/关闭由宿主窗口自行处理)
 *
 * 上传执行两种模式:
 * - 传入 uploadFile 服务:组件内按 concurrency 并发上传,逐文件进度/成功/失败展示,
 *   队列结束 emit('uploaded', { total, failed });失败项再次点上传即重试
 * - 未传服务:点击上传 emit('upload', payload) 交宿主执行(组件不展示进度)
 *
 * 状态内部自持,initialXxx 仅作挂载初值——宿主(如对话框)在每次打开时
 * 重新挂载本组件即可完成重置。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { File as FileIcon, FileImage, FileText, Film, Music, Upload, X } from '@lucide/vue'
import { SelectionBox } from '@hunmer/vue-selection-box'
import type { AcceptableValue } from 'reka-ui'
// 注意:本组件可经 'mira-plugin-ui/src/...' 源码供宿主直接消费,必须用相对路径(宿主的 @ 别名指向其自身 src)
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Progress } from './components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import {
  Attachment,
  AttachmentAction,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from './components/ui/attachment'
import { LibraryTreeView } from './library'
import type { LibraryFlatItem, LibraryTreeNode, LibraryTreeServices } from './library'
import FileInfoForm from './FileInfoForm.vue'
import type { BatchUploadFileService, BatchUploadPayload } from './types'

interface Library { id: string | number; name?: string; title?: string }
/** 文件夹/标签扁平项(id/title/parent_id 与后端一致,color 用于图标着色) */
interface TreeItem { id: string | number; title?: string; name?: string; parent_id?: string | number | null; color?: number }

/** 待上传条目:status 流转 pending → uploading → done/error(error 可回 uploading 重试);
 *  fileName/url/note 为文件信息表单编辑的元数据,folderId/tags 为单独设置的目标位置 */
interface UploadItem {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  fileName?: string
  url?: string
  note?: string
  folderId?: string
  /** 标签 id 集合(上传时经 tagTitlesOfIds 转标题名) */
  tags?: string[]
}

type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'other'

const props = withDefaults(defineProps<{
  libraries: Library[]
  folders: TreeItem[]
  /** 标签扁平列表:传入后出现「标签」页签(多选) */
  tags?: TreeItem[]
  initialLibraryId?: string
  initialFolderId?: string
  /** 初始预选标签(按标题匹配,与 LibraryTreeUploadTarget.tags 同语义);缺省不预选 */
  initialTagTitles?: string[]
  /** 上传服务:传入则组件内并发执行并展示进度;未传则 emit('upload') 交宿主 */
  uploadFile?: BatchUploadFileService
  /** 组件内上传并发数(仅 uploadFile 模式生效) */
  concurrency?: number
  /** 单批文件数上限,超出部分忽略 */
  maxFiles?: number
  /** 初始预填文件(如宿主自己的文件选择器选好后传入);打开时进入队列,同名同大小去重 */
  initialFiles?: File[]
  /** 文件选择 input 的 accept 属性 */
  accept?: string
  submitText?: string
  cancelText?: string
  /** 新建节点服务:传入时「新增」对话框确认后由组件内 await 调用,返回新节点 id 用于自动选中(失败抛错展示在对话框内);未传退回 create-node 事件 */
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
  submitText: '开始上传',
  cancelText: '取消',
})

const emit = defineEmits<{
  (event: 'upload', value: BatchUploadPayload): void
  /** 组件内队列全部结束(仅 uploadFile 模式) */
  (event: 'uploaded', value: { total: number; failed: number }): void
  /** 切换素材库:宿主据此重新拉取 folders/tags */
  (event: 'library-change', libraryId: string): void
  /** 树视图「新增」:未传 createNode prop 时的兜底事件(无法回传新节点 id,不自动选中) */
  (event: 'create-node', value: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number; icon?: string }): void
  (event: 'cancel'): void
}>()

const libraryId = ref(props.initialLibraryId || String(props.libraries[0]?.id || ''))
const folderId = ref(props.initialFolderId || '')
// 预选标签:按标题在 props.tags 里找 id(selectedTagIds 存 id,上传时经 tagTitlesOfIds 还原标题)
const selectedTagIds = ref(new Set<number>(
  (props.initialTagTitles ?? [])
    .map(title => props.tags.find(t => (t.title ?? t.name) === title))
    .filter((t): t is TreeItem => t != null)
    .map(t => Number(t.id)),
))
const tab = ref<'info' | 'folder' | 'tag'>('info')

// ---- 文件队列 ----
const items = ref<UploadItem[]>([])
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement>()
/** SelectionBox 选中集(点击/Ctrl/Shift/框选):文件信息 tabs 绑定首个选中项,
 *  文件夹/标签树的选择应用到选中集(未选中=应用到全部) */
const selectedIds = ref<string[]>([])
const selectionBoxRef = ref<InstanceType<typeof SelectionBox>>()
const selectedItem = computed(() => items.value.find(item => item.id === selectedIds.value[0]))

const isUploading = computed(() => items.value.some(item => item.status === 'uploading'))
const stats = computed(() => {
  const result = { total: items.value.length, pending: 0, uploading: 0, done: 0, failed: 0 }
  for (const item of items.value) {
    // UploadItem 的失败态是 error,统计口径计入 failed
    if (item.status === 'error') result.failed++
    else result[item.status]++
  }
  return result
})
/** 本批将上传的数量:待上传 + 失败重试 */
const toUploadCount = computed(() => stats.value.pending + stats.value.failed)
const canUpload = computed(() => Boolean(libraryId.value && toUploadCount.value > 0 && !isUploading.value))

/** 文件去重键:同名同大小同修改时间视为同一文件 */
function keyOf (file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function addFiles (files: File[]) {
  const existing = new Set(items.value.map(item => keyOf(item.file)))
  for (const file of files) {
    if (items.value.length >= props.maxFiles) break
    const key = keyOf(file)
    if (existing.has(key)) continue
    existing.add(key)
    const tagIds = [...selectedTagIds.value].map(String)
    items.value.push({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      progress: 0,
      status: 'pending',
      // 继承面板当前文件夹/标签(含 initialFolderId/initialTagTitles 初值),
      // 与「先在树上选好目标再加文件」行为一致;后续树上选择仍可覆盖
      folderId: folderId.value || undefined,
      tags: tagIds.length ? tagIds : undefined,
    })
  }
}

// 宿主预填文件(对话框每次打开重新挂载,此处执行一次即可)
addFiles(props.initialFiles)

function handleFileSelect (event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) addFiles(Array.from(target.files))
  // 清空输入框以允许重复选择同一文件
  target.value = ''
}

function handleDrop (event: DragEvent) {
  isDragOver.value = false
  if (event.dataTransfer?.files) addFiles(Array.from(event.dataTransfer.files))
}

/** 点击卡片:经 SelectionBox 处理(Ctrl 加选/Shift 连选/单选) */
function handleItemClick (item: UploadItem, event: MouseEvent) {
  selectionBoxRef.value?.handleItemClick(item.id, event)
}

/** Delete 快捷键:批量移除选中(上传中项跳过) */
function handleDeleteSelection (ids: string[]) {
  ids.forEach(id => removeItem(id))
}

function removeItem (id: string) {
  const item = items.value.find(it => it.id === id)
  if (!item || item.status === 'uploading') return
  items.value = items.value.filter(it => it.id !== id)
  selectedIds.value = selectedIds.value.filter(x => x !== id)
  const objectUrl = previews.get(item.file)
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    previews.delete(item.file)
  }
}

function clearAll () {
  if (isUploading.value) return
  for (const objectUrl of previews.values()) URL.revokeObjectURL(objectUrl)
  previews.clear()
  items.value = []
  selectedIds.value = []
}

// ---- 文件信息表单绑定:读写当前选中条目的元数据(未选中时禁用) ----
const selectedFileName = computed({
  get: () => selectedItem.value?.fileName ?? selectedItem.value?.file.name ?? '',
  set (value: string) {
    if (selectedItem.value) selectedItem.value.fileName = value.trim() ? value : undefined
  },
})
const selectedUrl = computed({
  get: () => selectedItem.value?.url ?? '',
  set (value: string) {
    if (selectedItem.value) selectedItem.value.url = value.trim() ? value : undefined
  },
})
const selectedNote = computed({
  get: () => selectedItem.value?.note ?? '',
  set (value: string) {
    if (selectedItem.value) selectedItem.value.note = value.trim() ? value : undefined
  },
})

// ---- 过滤:格式 + 文件名,仅影响列表查看,上传始终提交全部 ----
const formatFilter = ref<FileCategory | 'all'>('all')
const nameFilter = ref('')
const hasFilter = computed(() => formatFilter.value !== 'all' || nameFilter.value.trim() !== '')
const filteredItems = computed(() => {
  const keyword = nameFilter.value.trim().toLowerCase()
  return items.value.filter(item => {
    if (formatFilter.value !== 'all' && categoryOf(item.file) !== formatFilter.value) return false
    if (keyword && !item.file.name.toLowerCase().includes(keyword)) return false
    return true
  })
})

function categoryOf (file: File): FileCategory {
  const type = file.type
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type.startsWith('text/') || type === 'application/pdf' || /word|excel|powerpoint|officedocument|presentation|sheet/.test(type)) return 'document'
  return 'other'
}

const categoryOptions: { value: FileCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部格式' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
  { value: 'document', label: '文档' },
  { value: 'other', label: '其他' },
]

// ---- 树数据:扁平项归一化成 LibraryFlatItem(组装/搜索/展开由 LibraryTreeView 自理) ----
function normalize (items: TreeItem[]): LibraryFlatItem[] {
  return items.map(item => ({
    id: Number(item.id),
    title: item.title ?? item.name ?? String(item.id),
    parent_id: item.parent_id == null || item.parent_id === '' ? undefined : Number(item.parent_id),
    color: item.color,
  }))
}

const folderItems = computed(() => normalize(props.folders))
const tagItems = computed(() => normalize(props.tags))

// ---- 右下树视图的内存 services:list 直接回宿主数据,create 走注入服务/兜底事件 ----
const treeServices: LibraryTreeServices = {
  listFolders: async () => folderItems.value,
  listTags: async () => tagItems.value,
  createNode: async (kind, _libraryId, title, parentId, extra) => {
    const payload = { kind, parentId: parentId ?? 0, title, ...extra }
    if (props.createNode) return props.createNode(payload)
    emit('create-node', payload)
    return undefined
  },
  deleteNode: async () => {},
}

/** 受控选择适配:文件夹单选(空选=根目录) ↔ folderId;标签多选勾选 ↔ selectedTagIds。
 *  树上选择即应用到目标文件集(选中集;未选中=全部)——这是"单独设置文件夹/标签"的入口 */
function toNode (item: LibraryFlatItem): LibraryTreeNode {
  return { id: item.id, title: item.title, color: item.color, parentId: item.parent_id ?? 0, level: 0, children: [] }
}

/** 文件夹/标签的应用目标:有选中集=选中项,否则全部待上传文件 */
function targetItems (): UploadItem[] {
  return selectedIds.value.length
    ? items.value.filter(item => selectedIds.value.includes(item.id))
    : [...items.value]
}

const selectedFolderNodes = computed({
  get: () => folderItems.value.filter(item => String(item.id) === folderId.value).map(toNode),
  set (nodes: LibraryTreeNode[]) {
    folderId.value = nodes[0] ? String(nodes[0].id) : ''
    for (const item of targetItems()) item.folderId = folderId.value || undefined
  },
})

const selectedTagNodes = computed({
  get: () => tagItems.value.filter(item => selectedTagIds.value.has(item.id)).map(toNode),
  set (nodes: LibraryTreeNode[]) {
    selectedTagIds.value = new Set(nodes.map(n => n.id))
    const ids = [...selectedTagIds.value].map(String)
    for (const item of targetItems()) item.tags = ids.length ? ids : undefined
  },
})

// 选中集变化:面板回显首个选中文件的文件夹/标签(无选中=清空面板,仅回显不回写)
watch(selectedIds, (ids) => {
  const first = items.value.find(item => item.id === ids[0])
  folderId.value = first?.folderId || ''
  selectedTagIds.value = new Set((first?.tags || []).map(Number))
})

/** 卡片徽标:文件夹显示名 */
function folderNameOf (id: string) {
  return folderItems.value.find(item => String(item.id) === id)?.title
}

/** 卡片徽标:标签显示名 */
function tagNameOf (id: string) {
  return tagItems.value.find(item => String(item.id) === id)?.title
}

/** 标签 id 集合 → 标题名列表(上传 payload 的 tags 按名称关联) */
function tagTitlesOfIds (ids?: string[]): string[] | undefined {
  if (!ids?.length) return undefined
  return tagItems.value.filter(item => ids.includes(String(item.id))).map(item => item.title)
}

// ---- Attachment 文件展示 ----
// 图片缩略图走 objectURL,卸载时统一回收
const previews = new Map<File, string>()

function previewUrl (file: File): string {
  let objectUrl = previews.get(file)
  if (objectUrl == null) {
    objectUrl = URL.createObjectURL(file)
    previews.set(file, objectUrl)
  }
  return objectUrl
}

onBeforeUnmount(() => {
  for (const objectUrl of previews.values()) URL.revokeObjectURL(objectUrl)
  previews.clear()
})

function iconOf (file: File) {
  const category = categoryOf(file)
  if (category === 'image') return FileImage
  if (category === 'video') return Film
  if (category === 'audio') return Music
  if (category === 'document') return FileText
  return FileIcon
}

function isImage (file: File) {
  return file.type.startsWith('image/')
}

function formatSize (bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 扩展名大写(无扩展名显示 FILE) */
function extOf (file: File): string {
  return (file.name.split('.').pop() || 'FILE').toUpperCase()
}

/** 展示名:编辑过文件名优先 */
function displayNameOf (item: UploadItem): string {
  return item.fileName?.trim() || item.file.name
}

/** UploadItem.status → Attachment state */
function attachmentStateOf (item: UploadItem): 'idle' | 'uploading' | 'done' | 'error' {
  return item.status === 'pending' ? 'idle' : item.status
}

// 切库:清掉已选位置并通知宿主刷新树数据
function onLibraryChange (value: AcceptableValue) {
  libraryId.value = String(value)
  folderId.value = ''
  selectedTagIds.value = new Set()
  emit('library-change', String(value))
}

// ---- 上传执行 ----
async function startUpload () {
  if (!canUpload.value) return
  /** 每文件完整提交内容:位置/元数据均为该文件单独设置值 */
  const payloadOf = (item: UploadItem) => ({
    file: item.file,
    libraryId: libraryId.value,
    folderId: item.folderId,
    tags: tagTitlesOfIds(item.tags),
    fileName: item.fileName,
    url: item.url,
    note: item.note,
  })

  // 未传上传服务:整批交宿主执行
  if (!props.uploadFile) {
    emit('upload', {
      libraryId: libraryId.value,
      files: items.value.map(item => item.file),
      metas: items.value.map(item => payloadOf(item)),
    })
    return
  }

  // 组件内并发执行:队列含待上传与失败项(失败自动重试)
  const queue = items.value.filter(item => item.status === 'pending' || item.status === 'error')
  let cursor = 0
  let failed = 0
  const worker = async () => {
    while (cursor < queue.length) {
      const item = queue[cursor++]
      item.status = 'uploading'
      item.progress = 0
      try {
        await props.uploadFile!(
          payloadOf(item),
          (percent) => {
            item.progress = Math.min(100, Math.max(0, Math.round(percent)))
          },
        )
        item.status = 'done'
        item.progress = 100
      } catch {
        item.status = 'error'
        failed++
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(props.concurrency, queue.length) }, worker))
  emit('uploaded', { total: queue.length, failed })
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4">
    <!-- 主体:左 dropzone 文件区(填满高度) / 右(文件信息/文件夹/标签 tabs);
         小屏单列时两行内容高度可能超出可用空间,允许纵向滚动避免溢出遮挡 footer -->
    <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
      <!-- 左:待上传文件区(dropzone) -->
      <div
        class="flex h-full min-h-[14rem] flex-col rounded-lg border-2 border-dashed transition-colors lg:min-h-[22rem]"
        :class="isDragOver ? 'border-primary bg-primary/10' : 'border-border'"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
      >
        <input
          ref="fileInputRef"
          type="file"
          multiple
          :accept="accept"
          class="hidden"
          @change="handleFileSelect"
        >

        <!-- 列表头部:标题/统计 + 视图切换 + 添加/清空 -->
        <div class="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-foreground">待上传文件</span>
            <span v-if="stats.total" class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{{ stats.total }}</span>
          </div>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="sm" @click="fileInputRef?.click()">
              <Upload class="size-4" />
              添加文件
            </Button>
            <Button v-if="stats.total" variant="ghost" size="sm" class="text-destructive hover:text-destructive" :disabled="isUploading" @click="clearAll">
              清空
            </Button>
          </div>
        </div>

        <!-- 队列统计 -->
        <div v-if="stats.total" class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-1.5 text-xs">
          <span class="text-muted-foreground">待上传 {{ stats.pending }}</span>
          <span class="text-orange-600 dark:text-orange-400">上传中 {{ stats.uploading }}</span>
          <span class="text-green-600 dark:text-green-400">已完成 {{ stats.done }}</span>
          <span v-if="stats.failed" class="text-destructive">失败 {{ stats.failed }}</span>
        </div>

        <!-- 过滤:格式 + 文件名(仅影响查看,上传始终提交全部) -->
        <div v-if="stats.total" class="flex items-center gap-2 border-b px-4 py-2">
          <Select v-model="formatFilter">
            <SelectTrigger class="h-8 w-28 text-xs">
              <SelectValue placeholder="格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="nameFilter" placeholder="搜索文件名…" class="h-8 flex-1 text-xs" />
          <span v-if="hasFilter" class="whitespace-nowrap text-xs text-muted-foreground">匹配 {{ filteredItems.length }} / {{ stats.total }}</span>
        </div>

        <!-- 文件列表 / 空状态:SelectionBox 多选(点击/Ctrl/Shift/框选),
             选中集经右侧「文件夹/标签」单独设置位置,首个选中项经「文件信息」编辑元数据 -->
        <div v-if="!stats.total" class="flex min-h-0 flex-1 flex-col">
          <div
            class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 py-6 text-muted-foreground"
            @click="fileInputRef?.click()"
          >
            <Upload class="size-8" />
            <p class="text-sm">点击或拖拽文件到此处添加</p>
            <p class="text-xs">最多 {{ maxFiles }} 个文件</p>
          </div>
        </div>
        <template v-else>
          <SelectionBox
            ref="selectionBoxRef"
            v-model="selectedIds"
            :multiple="true"
            :double-click-to-clear="true"
            :realtime-selection="true"
            :min-selection-size="8"
            :enable-select-all-shortcut="true"
            :enable-clear-selection-shortcut="true"
            :enable-delete-selection-shortcut="true"
            class="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]"
            tabindex="0"
            @clear-selection="selectedIds = []"
            @delete-selection="handleDeleteSelection"
          >
            <!-- 竖排卡片网格:媒体在上(方形,默认缩略图),信息在下 -->
            <AttachmentGroup
              class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] items-start gap-2"
            >
              <Attachment
                v-for="item in filteredItems"
                :key="item.id"
                size="sm"
                orientation="vertical"
                :state="attachmentStateOf(item)"
                :data-selectable-id="item.id"
                class="w-full cursor-pointer gap-0 overflow-hidden has-data-[slot=attachment-content]:p-0 has-data-[slot=attachment-media]:p-0"
                :class="selectedIds.includes(item.id) && 'ring-2 ring-primary'"
                @click="handleItemClick(item, $event)"
              >
                <AttachmentMedia :variant="isImage(item.file) ? 'image' : 'icon'" class="w-full! rounded-none">
                  <img v-if="isImage(item.file)" :src="previewUrl(item.file)" :alt="item.file.name" >
                  <component :is="iconOf(item.file)" v-else />
                  <!-- 上传中:媒体区遮罩显示百分比 -->
                  <div
                    v-if="item.status === 'uploading'"
                    class="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white"
                  >{{ item.progress }}%</div>
                </AttachmentMedia>
                <AttachmentContent class="w-full px-2 py-1.5">
                  <AttachmentTitle>{{ displayNameOf(item) }}</AttachmentTitle>
                  <AttachmentDescription>{{ extOf(item.file) }} · {{ formatSize(item.file.size) }}</AttachmentDescription>
                  <!-- 单独设置的文件夹/标签徽标:标签最多显示 2 个,超出计数 -->
                  <div v-if="item.folderId || item.tags?.length" class="mt-1 flex flex-wrap gap-1">
                    <span v-if="item.folderId" class="rounded bg-primary/15 px-1 py-0.5 text-[10px] text-primary">
                      {{ folderNameOf(item.folderId) || item.folderId }}
                    </span>
                    <span
                      v-for="tagId in (item.tags || []).slice(0, 2)"
                      :key="tagId"
                      class="rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >{{ tagNameOf(tagId) || tagId }}</span>
                    <span v-if="(item.tags?.length || 0) > 2" class="py-0.5 text-[10px] text-muted-foreground">
                      +{{ (item.tags?.length || 0) - 2 }}
                    </span>
                  </div>
                  <Progress v-if="item.status === 'uploading'" :model-value="item.progress" class="mt-1 h-1.5" />
                  <p v-else-if="item.status === 'error'" class="text-xs text-destructive">上传失败</p>
                  <p v-else-if="item.status === 'done'" class="text-xs text-green-600 dark:text-green-400">已上传</p>
                </AttachmentContent>
                <!-- 竖排:删除按钮悬浮在媒体右上角 -->
                <AttachmentAction
                  v-if="item.status !== 'uploading'"
                  class="absolute top-1 right-1 z-20 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                  :aria-label="`移除 ${item.file.name}`"
                  @click.stop="removeItem(item.id)"
                >
                  <X />
                </AttachmentAction>
              </Attachment>
            </AttachmentGroup>
          </SelectionBox>
          <p class="px-4 pb-2 text-[11px] text-muted-foreground">
            点击选择 · Ctrl 加选 · Shift 连选 · 空白拖拽框选 · Delete 删除选中；选中后在右侧「文件夹 / 标签」中设置，未选中时应用到全部
          </p>
        </template>
      </div>

      <!-- 右侧:文件信息(绑定选中文件) / 文件夹 / 标签 tabs -->
      <Tabs v-model="tab" class="flex h-full min-h-0 flex-col gap-2">
        <TabsList class="w-full">
          <TabsTrigger value="info">文件信息</TabsTrigger>
          <TabsTrigger value="folder">文件夹</TabsTrigger>
          <TabsTrigger value="tag">标签</TabsTrigger>
        </TabsList>

        <TabsContent value="info" class="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <div class="min-h-40 flex-1 overflow-y-auto rounded-lg border p-3">
            <FileInfoForm
              v-model:file-name="selectedFileName"
              v-model:url="selectedUrl"
              v-model:note="selectedNote"
              :disabled="!selectedItem"
              :placeholder="selectedItem ? undefined : '点击左侧文件后可编辑其信息'"
            />
          </div>
        </TabsContent>
        <TabsContent value="folder" class="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <div class="min-h-40 flex-1 overflow-hidden rounded-md border">
            <LibraryTreeView
              mode="folder"
              :library-id="libraryId"
              :services="treeServices"
              v-model:selected="selectedFolderNodes"
            />
          </div>
        </TabsContent>
        <TabsContent value="tag" class="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <div class="min-h-40 flex-1 overflow-hidden rounded-md border">
            <LibraryTreeView
              mode="tag"
              :library-id="libraryId"
              :services="treeServices"
              v-model:selected="selectedTagNodes"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>

    <!-- 底部:素材库选择 + 开始上传同一行 -->
    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1 sm:max-w-56">
        <Label class="sr-only" for="batch-upload-library">素材库</Label>
        <!-- v-model 与显式 update 监听同用会覆盖绑定,改单向 + 手动赋值 -->
        <Select :model-value="libraryId" :disabled="isUploading" @update:model-value="onLibraryChange">
          <SelectTrigger id="batch-upload-library">
            <SelectValue placeholder="选择素材库" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="library in libraries" :key="library.id" :value="String(library.id)">
              {{ library.name || library.title || library.id }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button class="ml-auto shrink-0" :disabled="!canUpload" @click="startUpload">
        <Upload class="size-4" />
        {{ submitText }}{{ toUploadCount > 0 ? ` (${toUploadCount})` : '' }}
      </Button>
    </div>
  </div>
</template>
