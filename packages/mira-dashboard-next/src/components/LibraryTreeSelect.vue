<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  RiArrowDownSLine,
  RiFolderLine,
  RiLoader4Line,
  RiPriceTag3Line,
} from '@remixicon/vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getMiraClient } from '@/lib/miraClient'
import LibraryTreeNode from './LibraryTreeNode.vue'

export interface LibraryTreeNode {
  id: number
  title: string
  parentId: number | null
  fileCount?: number
  expanded: boolean
  children: LibraryTreeNode[]
}

type ModelValue = number | number[] | null

const props = withDefaults(defineProps<{
  libraryId: string
  entity: 'folder' | 'tag'
  modelValue?: ModelValue
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: null,
  placeholder: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: ModelValue]
}>()

const loading = ref(false)
const error = ref('')
const nodes = ref<LibraryTreeNode[]>([])
const byId = ref(new Map<number, LibraryTreeNode>())
const multiple = computed(() => props.entity === 'tag')
const selectedIds = computed<number[]>(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  return typeof props.modelValue === 'number' ? [props.modelValue] : []
})
const selectionLabel = computed(() => {
  const labels = selectedIds.value.map(id => byId.value.get(id)?.title).filter(Boolean)
  if (!labels.length) return ''
  if (labels.length <= 2) return labels.join('、')
  return `${labels.slice(0, 2).join('、')} +${labels.length - 2}`
})

function buildTree(items: Array<Record<string, any>>): LibraryTreeNode[] {
  const map = new Map<number, LibraryTreeNode>()
  for (const item of items) {
    const id = Number(item.id)
    if (!Number.isFinite(id)) continue
    map.set(id, {
      id,
      title: String(item.title || item.name || id),
      parentId: item.parent_id == null ? null : Number(item.parent_id),
      fileCount: item.file_count == null ? undefined : Number(item.file_count),
      expanded: false,
      children: [],
    })
  }

  const roots: LibraryTreeNode[] = []
  for (const node of map.values()) {
    const parent = node.parentId && node.parentId !== node.id ? map.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortNodes = (itemsToSort: LibraryTreeNode[]) => {
    itemsToSort.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    itemsToSort.forEach(item => sortNodes(item.children))
  }
  sortNodes(roots)
  roots.forEach(node => { node.expanded = true })
  byId.value = map
  return roots
}

async function load() {
  if (!props.libraryId) {
    nodes.value = []
    byId.value = new Map()
    return
  }
  loading.value = true
  error.value = ''
  try {
    const sdk = getMiraClient()
    const items = props.entity === 'folder'
      ? await sdk.folders().getAll(props.libraryId)
      : await sdk.tags().getAll(props.libraryId)
    nodes.value = buildTree(items as Array<Record<string, any>>)
  } catch (cause: any) {
    nodes.value = []
    error.value = cause?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function select(id: number) {
  if (!multiple.value) {
    emit('update:modelValue', id)
    return
  }
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  emit('update:modelValue', Array.from(next))
}

watch(() => [props.libraryId, props.entity], load, { immediate: true })
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="border-input bg-background flex h-9 w-full items-center gap-2 rounded-md border px-3 text-left text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled"
      >
        <RiFolderLine v-if="entity === 'folder'" class="size-4 shrink-0 text-amber-600" />
        <RiPriceTag3Line v-else class="size-4 shrink-0 text-sky-600" />
        <span v-if="selectionLabel" class="min-w-0 flex-1 truncate">{{ selectionLabel }}</span>
        <span v-else class="min-w-0 flex-1 truncate text-muted-foreground">
          {{ placeholder || (entity === 'folder' ? '选择文件夹' : '选择标签') }}
        </span>
        <RiArrowDownSLine class="size-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      class="max-h-80 min-w-72 w-[--reka-popper-anchor-width] overflow-auto p-1"
    >
      <div v-if="loading" class="flex h-24 items-center justify-center text-muted-foreground">
        <RiLoader4Line class="size-5 animate-spin" />
      </div>
      <p v-else-if="error" class="p-3 text-sm text-destructive">{{ error }}</p>
      <p v-else-if="!nodes.length" class="p-3 text-sm text-muted-foreground">暂无数据</p>
      <template v-else>
        <button
          v-if="entity === 'folder'"
          type="button"
          class="flex min-h-8 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-accent"
          :class="{ 'bg-accent': modelValue == null }"
          @click="emit('update:modelValue', null)"
        >
          <RiFolderLine class="size-4 text-muted-foreground" />
          <span>根目录</span>
        </button>
        <LibraryTreeNode
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :entity="entity"
          :multiple="multiple"
          :selected-ids="selectedIds"
          @select="select"
        />
      </template>
    </PopoverContent>
  </Popover>
</template>
