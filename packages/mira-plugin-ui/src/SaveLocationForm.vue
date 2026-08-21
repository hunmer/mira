<script setup lang="ts">
/**
 * 保存位置表单(自 SaveLocationDialog 抽离,可脱离对话框独立使用)。
 *
 * 布局:
 * - 顶部:传入文件以 Attachment 卡片展示(可移除,emit('remove-file'))
 * - 其下:素材库 Select(占满宽度,切库清空已选位置并 emit('library-change'))
 * - 中部:左侧 Tabs 切换 LibraryTreeView(文件夹树单选/标签树多选,树内搜索与「新增」
 *   对话框均由 LibraryTreeView 自带,树区随可用高度拉伸);右侧 文件名/URL/注释 输入
 * - 底部:右下角 取消/提交
 *
 * 状态内部自持,initialXxx 仅作挂载初值——宿主(如对话框)在每次打开时
 * 重新挂载本组件即可完成重置。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronDown, FileImage, FileText, Film, Music, X } from '@lucide/vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  useFilter,
} from 'reka-ui'
import { Button } from './components/ui/button'
import { Label } from './components/ui/label'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from './components/ui/tags-input'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from './components/ui/attachment'
import { LibraryTreeView } from './library'
import type { LibraryFlatItem, LibraryTreeNode, LibraryTreeServices } from './library'
import FileInfoForm from './FileInfoForm.vue'
import type { SaveLocation } from './types'

interface Library { id: string | number; name?: string; title?: string }
/** 文件夹/标签扁平项(id/title/parent_id 与后端一致,color 用于图标着色) */
interface TreeItem { id: string | number; title?: string; name?: string; parent_id?: string | number | null; color?: number }

const props = withDefaults(defineProps<{
  libraries: Library[]
  folders: TreeItem[]
  /** 标签扁平列表:传入后出现「标签」页签(多选) */
  tags?: TreeItem[]
  /** 待保存文件:顶部 Attachment 卡片展示,移除经 emit('remove-file') 交宿主处理 */
  files?: File[]
  initialLibraryId?: string
  initialFolderId?: string
  initialFileName?: string
  /** 源链接(存入文件元数据 website) */
  initialUrl?: string
  /** 注释(存入文件元数据 notes) */
  initialNote?: string
  submitText?: string
  cancelText?: string
  /** 新建节点服务:传入时「新增」对话框确认后由组件内 await 调用,返回新节点 id 用于自动选中(失败抛错展示在对话框内);未传退回 create-node 事件 */
  createNode?: (payload: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number; icon?: string }) => Promise<number | undefined>
}>(), {
  tags: () => [],
  files: () => [],
  initialLibraryId: '',
  initialFolderId: '',
  initialFileName: 'document.tiptap',
  initialUrl: '',
  initialNote: '',
  submitText: '保存',
  cancelText: '取消',
})

const emit = defineEmits<{
  (event: 'save', value: SaveLocation): void
  /** 切换素材库:宿主据此重新拉取 folders/tags */
  (event: 'library-change', libraryId: string): void
  (event: 'remove-file', file: File): void
  /** 树视图「新增」:未传 createNode prop 时的兜底事件(无法回传新节点 id,不自动选中) */
  (event: 'create-node', value: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number; icon?: string }): void
  (event: 'cancel'): void
}>()

const libraryId = ref(props.initialLibraryId || String(props.libraries[0]?.id || ''))
const folderId = ref(props.initialFolderId || '')
const fileName = ref(props.initialFileName || 'document.tiptap')
const url = ref(props.initialUrl || '')
const note = ref(props.initialNote || '')
const selectedTagIds = ref(new Set<number>())
const tab = ref<'folder' | 'tag'>('folder')

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

// ---- 左侧树视图的内存 services:list 直接回宿主数据,create 走注入服务/兜底事件 ----
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

/** 受控选择适配:文件夹单选(空选=根目录) ↔ folderId;标签多选勾选 ↔ selectedTagIds */
function toNode (item: LibraryFlatItem): LibraryTreeNode {
  return { id: item.id, title: item.title, color: item.color, parentId: item.parent_id ?? 0, level: 0, children: [] }
}

const selectedFolderNodes = computed({
  get: () => folderItems.value.filter(item => String(item.id) === folderId.value).map(toNode),
  set (nodes: LibraryTreeNode[]) {
    folderId.value = nodes[0] ? String(nodes[0].id) : ''
  },
})

const selectedTagNodes = computed({
  get: () => tagItems.value.filter(item => selectedTagIds.value.has(item.id)).map(toNode),
  set (nodes: LibraryTreeNode[]) {
    selectedTagIds.value = new Set(nodes.map(n => n.id))
  },
})

const selectedTagTitles = computed(() => tagItems.value.filter(item => selectedTagIds.value.has(item.id)).map(item => item.title))

// ---- 右侧「标签」选择:Tags with Listbox(候选=全部标签,多选/可删) ----
const tagSearchTerm = ref('')
const tagSelectOpen = ref(false)
const { contains } = useFilter({ sensitivity: 'base' })

/** 标签候选:全部标签标题去重排序 */
const tagOptions = computed(() => {
  const titles = new Set(tagItems.value.map(item => item.title))
  return [...titles].sort((a, b) => a.localeCompare(b, 'zh'))
})
const filteredTagOptions = computed(() =>
  tagSearchTerm.value
    ? tagOptions.value.filter(option => contains(option, tagSearchTerm.value))
    : tagOptions.value,
)
watch(tagSearchTerm, (v) => {
  if (v) tagSelectOpen.value = true
})
watch(selectedTagTitles, () => {
  tagSearchTerm.value = ''
})

/** Tags with Listbox 的 v-model:title 数组 ↔ selectedTagIds(同名标签全部映射)。
 *  selectedTagIds 是唯一选中源:树勾选与下拉增删都经此 computed 读写同一份数据 */
const selectedTagTitlesModel = computed({
  get: () => selectedTagTitles.value,
  set (titles: string[]) {
    const keep = new Set(titles)
    selectedTagIds.value = new Set(tagItems.value.filter(item => keep.has(item.title)).map(item => item.id))
  },
})

const canSave = computed(() => Boolean(libraryId.value && fileName.value.trim()))

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
  if (file.type.startsWith('image/')) return FileImage
  if (file.type.startsWith('video/')) return Film
  if (file.type.startsWith('audio/')) return Music
  return FileText
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

// 切库:清掉已选位置并通知宿主刷新树数据
function onLibraryChange (value: string) {
  libraryId.value = value
  folderId.value = ''
  selectedTagIds.value = new Set()
  emit('library-change', value)
}

function confirm () {
  const normalized = fileName.value.trim().replace(/\.tiptap$/i, '') + '.tiptap'
  if (!libraryId.value || normalized === '.tiptap') return
  emit('save', {
    libraryId: libraryId.value,
    folderId: folderId.value || undefined,
    tags: selectedTagTitles.value.length ? selectedTagTitles.value : undefined,
    url: url.value.trim() || undefined,
    note: note.value.trim() || undefined,
    fileName: normalized,
  })
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4">
    <!-- 顶部:传入文件 Attachment 卡片(可移除) -->
    <AttachmentGroup v-if="files.length">
      <Attachment
        v-for="file in files"
        :key="file.name + file.size + file.lastModified"
        size="sm"
        state="idle"
      >
        <AttachmentMedia :variant="isImage(file) ? 'image' : 'icon'">
          <img v-if="isImage(file)" :src="previewUrl(file)" :alt="file.name" >
          <component :is="iconOf(file)" v-else />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{{ file.name }}</AttachmentTitle>
          <AttachmentDescription>{{ extOf(file) }} · {{ formatSize(file.size) }}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction :aria-label="`移除 ${file.name}`" @click="emit('remove-file', file)">
            <X />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </AttachmentGroup>

    <!-- 素材库:占满宽度,位于 tabs 上方 -->
    <div>
      <Label class="sr-only" for="save-library">素材库</Label>
      <!-- v-model 与显式 update 监听同用会覆盖绑定,改单向 + 手动赋值 -->
      <Select :model-value="libraryId" @update:model-value="onLibraryChange">
        <SelectTrigger id="save-library" class="w-full">
          <SelectValue placeholder="选择素材库" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="library in libraries" :key="library.id" :value="String(library.id)">
            {{ library.name || library.title || library.id }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 中部:左 tabs 树视图(搜索/新增/展开内聚在 LibraryTreeView) / 右输入区 -->
    <div class="grid min-h-0 flex-1 gap-4 sm:grid-cols-[minmax(200px,240px)_1fr]">
      <Tabs v-model="tab" class="flex h-full min-h-0 flex-col gap-2">
        <TabsList class="w-full">
          <TabsTrigger value="folder">文件夹</TabsTrigger>
          <TabsTrigger value="tag">标签</TabsTrigger>
        </TabsList>

        <TabsContent value="folder" class="flex min-h-0 flex-col">
          <div class="min-h-40 flex-1 overflow-hidden rounded-md border">
            <LibraryTreeView
              mode="folder"
              :library-id="libraryId"
              :services="treeServices"
              v-model:selected="selectedFolderNodes"
            />
          </div>
        </TabsContent>
        <TabsContent value="tag" class="flex min-h-0 flex-col">
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

      <div class="grid content-start gap-4">
        <!-- 文件信息:文件名/URL/注释(自 FileInfoForm 抽离,enter 触发确认) -->
        <FileInfoForm
          v-model:file-name="fileName"
          v-model:url="url"
          v-model:note="note"
          @submit="confirm"
        />
        <!-- 已选标签:Tags with Listbox(候选=全部标签,多选/× 删除),与树上勾选双向同步 -->
        <div v-if="tagItems.length" class="grid gap-2">
          <Label>标签</Label>
          <Popover v-model:open="tagSelectOpen">
            <ListboxRoot v-model="selectedTagTitlesModel" highlight-on-hover multiple>
              <PopoverAnchor class="inline-flex w-full">
                <TagsInput v-slot="{ modelValue: tags }" v-model="selectedTagTitlesModel" class="w-full">
                  <TagsInputItem v-for="item in tags" :key="item.toString()" :value="item.toString()">
                    <TagsInputItemText />
                    <TagsInputItemDelete />
                  </TagsInputItem>

                  <ListboxFilter v-model="tagSearchTerm" as-child>
                    <TagsInputInput placeholder="选择标签…" @keydown.enter.prevent @keydown.down="tagSelectOpen = true" />
                  </ListboxFilter>

                  <PopoverTrigger as-child>
                    <Button size="icon-sm" variant="ghost" class="order-last self-start ml-auto">
                      <ChevronDown class="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                </TagsInput>
              </PopoverAnchor>

              <PopoverContent class="p-1" @open-auto-focus.prevent>
                <ListboxContent class="max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto empty:after:content-['No_options'] empty:p-1 empty:after:block" tabindex="0">
                  <ListboxItem
                    v-for="item in filteredTagOptions" :key="item" class="data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4" :value="item" @select="() => {
                      tagSearchTerm = ''
                    }"
                  >
                    <span class="min-w-0 flex-1 truncate">{{ item }}</span>
                    <ListboxItemIndicator class="ml-auto inline-flex items-center justify-center">
                      <Check />
                    </ListboxItemIndicator>
                  </ListboxItem>
                </ListboxContent>
              </PopoverContent>
            </ListboxRoot>
          </Popover>
        </div>
      </div>
    </div>

    <!-- 底部:右下角操作 -->
    <div class="flex justify-end gap-2">
      <Button variant="outline" @click="emit('cancel')">{{ cancelText }}</Button>
      <Button :disabled="!canSave" @click="confirm">{{ submitText }}</Button>
    </div>
  </div>
</template>
