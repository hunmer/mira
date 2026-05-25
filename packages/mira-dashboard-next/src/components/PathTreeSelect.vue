<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { RiArrowDownSLine, RiFolderLine, RiAddLine } from '@remixicon/vue'
import client from '@/api/client'
import PathTreeNode from './PathTreeNode.vue'

export interface TreeNode {
  label: string
  value: string
  isLeaf?: boolean
  children?: TreeNode[]
  loading?: boolean
  expanded?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
}>(), {
  modelValue: '',
  placeholder: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()
const treeData = ref<TreeNode[]>([])
const selected = ref(props.modelValue)

watch(() => props.modelValue, (val) => { selected.value = val })

async function fetchDirs(dirPath?: string): Promise<TreeNode[]> {
  const res = await client.get('/fs/dirs', { params: { path: dirPath || '' } })
  return (res.data || []) as TreeNode[]
}

const mkdirVisible = ref(false)
const mkdirParent = ref('')
const mkdirParentLabel = ref('')
const newFolderName = ref('')

function onSelect(value: string) {
  selected.value = value
  emit('update:modelValue', value)
}

function openMkdir(node: TreeNode) {
  mkdirParent.value = node.value
  mkdirParentLabel.value = node.label
  newFolderName.value = ''
  mkdirVisible.value = true
}

async function handleMkdir() {
  const name = newFolderName.value.trim()
  if (!name) return
  try {
    const res = await client.post('/fs/mkdir', { path: mkdirParent.value, name })
    const newNode = res.data as TreeNode
    const parent = findNode(treeData.value, mkdirParent.value)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(newNode)
      parent.children.sort((a, b) => a.label.localeCompare(b.label))
      parent.isLeaf = false
      parent.expanded = true
    }
    selected.value = newNode.value
    emit('update:modelValue', newNode.value)
    mkdirVisible.value = false
    toast.success(`"${name}" ${t('common.success')}`)
  } catch {
    toast.error(t('common.failed'))
  }
}

function findNode(nodes: TreeNode[], value: string): TreeNode | null {
  for (const node of nodes) {
    if (node.value === value) return node
    if (node.children) {
      const found = findNode(node.children, value)
      if (found) return found
    }
  }
  return null
}

onMounted(async () => {
  try { treeData.value = await fetchDirs() } catch { /* ignore */ }
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        class="border-input bg-background flex w-full cursor-pointer items-center rounded-md border px-3 py-2 text-left text-sm"
      >
        <span v-if="selected" class="flex-1 truncate">{{ selected }}</span>
        <span v-else class="flex-1 text-muted-foreground">{{ placeholder || t('library.pathPlaceholder') }}</span>
        <RiArrowDownSLine class="ml-2 size-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-[--reka-popper-anchor-width] max-h-72 overflow-auto p-1" align="start">
      <PathTreeNode
        v-for="node in treeData"
        :key="node.value"
        :node="node"
        :selected="selected"
        :fetch-dirs="fetchDirs"
        @select="onSelect"
        @mkdir="openMkdir"
      />
    </PopoverContent>
  </Popover>

  <Dialog :open="mkdirVisible" @update:open="mkdirVisible = $event">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ mkdirParentLabel }}</DialogTitle>
      </DialogHeader>
      <Input v-model="newFolderName" placeholder="folder name" @keydown.enter="handleMkdir" />
      <DialogFooter>
        <Button variant="outline" @click="mkdirVisible = false">{{ t('common.cancel') }}</Button>
        <Button @click="handleMkdir">{{ t('common.create') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
