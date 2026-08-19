<script setup lang="ts">
/**
 * 保存位置表单(自 SaveLocationDialog 抽离,可脱离对话框独立使用)。
 *
 * 布局:
 * - 顶部:传入文件以 Attachment 卡片展示(可移除,emit('remove-file'))
 * - 中部:左侧 Tabs 切换文件夹树(单选,含根目录)/标签树(多选);右侧 文件名/URL/注释 输入
 * - 底部:左下角素材库 Select,右下角 取消/提交
 *
 * 状态内部自持,initialXxx 仅作挂载初值——宿主(如对话框)在每次打开时
 * 重新挂载本组件即可完成重置。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Check, FileImage, FileText, Film, Music, Plus, Search, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { LibraryTree, buildTree, collectIds, filterTree, flattenTree } from '@/library'
import type { LibraryFlatItem, LibraryTreeNode } from '@/library'
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
  /** 工具栏「新增」:宿主负责弹名称输入并执行创建,完成后刷新树数据 */
  (event: 'create-node', value: { kind: 'folder' | 'tag'; parentId: number }): void
  (event: 'cancel'): void
}>()

const libraryId = ref(props.initialLibraryId || String(props.libraries[0]?.id || ''))
const folderId = ref(props.initialFolderId || '')
const fileName = ref(props.initialFileName || 'document.tiptap')
const url = ref(props.initialUrl || '')
const note = ref(props.initialNote || '')
const selectedTagIds = ref(new Set<number>())
const tab = ref<'folder' | 'tag'>('folder')

// ---- 树数据:扁平项归一化成 LibraryFlatItem 再组装 ----
function normalize (items: TreeItem[]): LibraryFlatItem[] {
  return items.map(item => ({
    id: Number(item.id),
    title: item.title ?? item.name ?? String(item.id),
    parent_id: item.parent_id == null || item.parent_id === '' ? undefined : Number(item.parent_id),
    color: item.color,
  }))
}

const folderTree = computed(() => buildTree(normalize(props.folders)))
const tagTree = computed(() => buildTree(normalize(props.tags)))
const tagItems = computed(() => normalize(props.tags))

// 默认展开全部(与 LibraryTreeView 行为一致);文件夹/标签共用一份展开状态
const expanded = ref(new Set<number>())
watch([folderTree, tagTree], ([folder, tag]) => {
  expanded.value = new Set(
    [...flattenTree(folder), ...flattenTree(tag)]
      .filter(node => node.children.length)
      .map(node => node.id),
  )
}, { immediate: true })

function toggle (id: number) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

// ---- 搜索(combobox):过滤树 + 下拉快速定位 ----
// 工具栏搜索按钮切换显隐(参考 FolderTreeComponent),收起时清空查询
const showSearch = ref(false)
const query = ref('')

function toggleSearch () {
  showSearch.value = !showSearch.value
  if (!showSearch.value) query.value = ''
}

/** 搜索态:命中分支连同祖先保留,整棵展开 */
const filteredFolder = computed(() => filterTree(folderTree.value, query.value))
const filteredTag = computed(() => filterTree(tagTree.value, query.value))

const effectiveExpanded = computed(() =>
  query.value.trim() ? collectIds(tab.value === 'folder' ? filteredFolder.value.tree : filteredTag.value.tree) : expanded.value,
)

/** 搜索下拉候选:当前 tab 的树打平后按标题匹配(带完整路径),上限 20 条 */
const searchMatches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const out: { node: LibraryTreeNode; path: string }[] = []
  const walk = (nodes: LibraryTreeNode[], trail: string[]) => {
    for (const node of nodes) {
      const path = [...trail, node.title].join(' / ')
      if (node.title.toLowerCase().includes(q)) out.push({ node, path })
      if (out.length < 20) walk(node.children, [...trail, node.title])
    }
  }
  walk(tab.value === 'folder' ? folderTree.value : tagTree.value, [])
  return out.slice(0, 20)
})

/** 下拉选中节点:文件夹直接定位,标签切换勾选;随后清空搜索恢复整棵树 */
function onPickSearch (value: unknown) {
  const node = value as LibraryTreeNode | null
  if (!node) return
  if (tab.value === 'folder') folderId.value = folderId.value === String(node.id) ? '' : String(node.id)
  else onSelectTag(node)
  query.value = ''
}

// ---- 文件夹单选(再点取消回根目录) / 标签多选 ----
const selectedFolderIds = computed(() => folderId.value ? new Set([Number(folderId.value)]) : undefined)
const checkedTagIds = computed(() => selectedTagIds.value)

function onSelectFolder (node: LibraryTreeNode) {
  folderId.value = folderId.value === String(node.id) ? '' : String(node.id)
}

function onSelectTag (node: LibraryTreeNode) {
  const next = new Set(selectedTagIds.value)
  next.has(node.id) ? next.delete(node.id) : next.add(node.id)
  selectedTagIds.value = next
}

const selectedTagTitles = computed(() => tagItems.value.filter(item => selectedTagIds.value.has(item.id)).map(item => item.title))

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

// ---- 提交 ----
/** 工具栏「新增」:文件夹新建在当前选中文件夹下(未选为根),标签新建到根 */
function onCreateNode () {
  const parentId = tab.value === 'folder' && folderId.value ? Number(folderId.value) : 0
  emit('create-node', { kind: tab.value, parentId })
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
  <div class="flex flex-col gap-4">
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

    <!-- 中部:左 tabs 树(工具栏:搜索/新增) / 右输入区 -->
    <div class="grid items-start gap-4 sm:grid-cols-[minmax(200px,240px)_1fr]">
      <Tabs v-model="tab" class="flex max-h-80 flex-col gap-2">
        <!-- 工具栏:tabs + 搜索切换/新增(参考 FolderTreeComponent 的 Header) -->
        <div class="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="folder">文件夹</TabsTrigger>
            <TabsTrigger value="tag">标签</TabsTrigger>
          </TabsList>
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
              :class="showSearch && 'text-primary'"
              :title="`搜索${tab === 'folder' ? '文件夹' : '标签'}`"
              @click="toggleSearch"
            >
              <Search class="size-4" />
            </button>
            <button
              type="button"
              class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
              :title="`新建${tab === 'folder' ? '文件夹' : '标签'}`"
              @click="onCreateNode"
            >
              <Plus class="size-4" />
            </button>
          </div>
        </div>

        <!-- 搜索栏(展开/收起过渡):输入过滤树,下拉点选快速定位 -->
        <Transition name="search-slide">
          <div v-if="showSearch" class="search-shell">
            <div class="search-shell-inner">
              <Combobox
                :model-value="null"
                ignore-filter
                @update:model-value="onPickSearch"
              >
                <ComboboxAnchor class="w-full">
                  <ComboboxInput
                    v-model="query"
                    :placeholder="`搜索${tab === 'folder' ? '文件夹' : '标签'}…`"
                    :display-value="() => ''"
                  />
                </ComboboxAnchor>
                <ComboboxList class="w-[var(--reka-combobox-trigger-width)]">
                  <ComboboxEmpty>无匹配</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem v-for="{ node, path } in searchMatches" :key="node.id" :value="node">
                      <span class="min-w-0 flex-1 truncate">
                        {{ node.title }}
                        <span v-if="path !== node.title" class="text-muted-foreground text-xs">（{{ path }}）</span>
                      </span>
                      <ComboboxItemIndicator><Check class="size-4" /></ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </Combobox>
            </div>
          </div>
        </Transition>

        <TabsContent value="folder" class="max-h-56 overflow-y-auto">
          <button
            v-if="!query.trim()"
            type="button"
            class="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md py-0 pr-2 pl-[26px] text-inherit select-none"
            :class="folderId
              ? 'text-foreground hover:bg-accent'
              : 'bg-primary/12 text-primary shadow-[inset_0_0_0_1.5px_var(--primary)]'"
            @click="folderId = ''"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" class="shrink-0">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="currentColor" />
            </svg>
            <span class="min-w-0 flex-1 truncate">根目录</span>
          </button>
          <div v-if="filteredFolder.tree.length" class="text-sm">
            <LibraryTree
              :nodes="filteredFolder.tree"
              kind="folder"
              :expanded="effectiveExpanded"
              :matched="filteredFolder.matched"
              :selected-ids="selectedFolderIds"
              @toggle="toggle"
              @select="onSelectFolder"
            />
          </div>
          <div v-else class="py-6 text-center text-xs text-muted-foreground">{{ query.trim() ? '无匹配' : '暂无文件夹' }}</div>
        </TabsContent>
        <TabsContent value="tag" class="max-h-56 overflow-y-auto">
          <div v-if="filteredTag.tree.length" class="text-sm">
            <LibraryTree
              :nodes="filteredTag.tree"
              kind="tag"
              :expanded="effectiveExpanded"
              :matched="filteredTag.matched"
              checkable
              :checked="checkedTagIds"
              @toggle="toggle"
              @select="onSelectTag"
            />
          </div>
          <div v-else class="py-6 text-center text-xs text-muted-foreground">{{ query.trim() ? '无匹配' : '暂无标签' }}</div>
        </TabsContent>
      </Tabs>

      <div class="grid content-start gap-4">
        <div class="grid gap-2">
          <Label for="save-file-name">文件名</Label>
          <Input id="save-file-name" v-model="fileName" autocomplete="off" @keyup.enter="confirm" />
        </div>
        <div class="grid gap-2">
          <Label for="save-url">URL</Label>
          <Input id="save-url" v-model="url" type="url" inputmode="url" autocomplete="off" placeholder="https://" />
        </div>
        <div class="grid gap-2">
          <Label for="save-note">注释</Label>
          <textarea
            id="save-note"
            v-model="note"
            rows="3"
            class="bg-muted ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-16 w-full rounded-md px-3 py-2 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div v-if="selectedTagTitles.length" class="grid gap-2">
          <Label>标签</Label>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="name in selectedTagTitles" :key="name" class="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
              {{ name }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部:左下角素材库 / 右下角操作 -->
    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:w-56">
        <Label class="sr-only" for="save-library">素材库</Label>
        <!-- v-model 与显式 update 监听同用会覆盖绑定,改单向 + 手动赋值 -->
        <Select :model-value="libraryId" @update:model-value="onLibraryChange">
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
      <div class="flex gap-2 sm:justify-end">
        <Button variant="outline" @click="emit('cancel')">{{ cancelText }}</Button>
        <Button :disabled="!canSave" @click="confirm">{{ submitText }}</Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 搜索栏展开/收起:grid 0fr→1fr 高度过渡 + 位移/透明度(参考 FolderTreeHeader)。
   tailwind 无法表达的过渡,属 ui_rule.md 允许的例外;不含颜色 token。 */
.search-shell {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}
.search-slide-enter-active {
  transition: grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
.search-slide-leave-active {
  transition: grid-template-rows 150ms cubic-bezier(0.4, 0, 1, 1), opacity 150ms cubic-bezier(0.4, 0, 1, 1), transform 150ms cubic-bezier(0.4, 0, 1, 1);
}
.search-slide-enter-from,
.search-slide-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
}
.search-shell-inner { overflow: hidden; min-height: 0; }
@media (prefers-reduced-motion: reduce) {
  .search-slide-enter-active,
  .search-slide-leave-active { transition: opacity 150ms ease; }
  .search-slide-enter-from,
  .search-slide-leave-to { transform: none; }
}
</style>
