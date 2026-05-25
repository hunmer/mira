<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { RiArrowDownSLine, RiFolderLine, RiAddLine } from '@remixicon/vue'
import client from '@/api/client'

interface TreeNode {
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
const open = ref(false)
const treeData = ref<TreeNode[]>([])
const selected = ref(props.modelValue)
const mkdirVisible = ref(false)
const mkdirParent = ref('')
const mkdirParentLabel = ref('')
const newFolderName = ref('')

watch(() => props.modelValue, (val) => { selected.value = val })

async function fetchDirs(dirPath?: string): Promise<TreeNode[]> {
  const res = await client.get('/fs/dirs', { params: { path: dirPath || '' } })
  return (res.data || []) as TreeNode[]
}

async function toggleNode(node: TreeNode) {
  if (node.isLeaf) return
  if (!node.children && !node.loading) {
    node.loading = true
    try {
      const children = await fetchDirs(node.value)
      if (children.length) {
        node.children = children
      } else {
        node.isLeaf = true
      }
    } catch {
      node.isLeaf = true
    } finally {
      node.loading = false
    }
  }
  node.expanded = !node.expanded
}

function selectNode(node: TreeNode) {
  selected.value = node.value
  emit('update:modelValue', node.value)
  open.value = false
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
    open.value = false
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
  try {
    treeData.value = await fetchDirs()
  } catch { /* ignore */ }
})
</script>

<template>
  <div class="relative">
    <div
      class="border-input bg-background flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm"
      @click="open = !open"
    >
      <span v-if="selected" class="flex-1 truncate">{{ selected }}</span>
      <span v-else class="flex-1 text-muted-foreground">{{ placeholder || t('library.pathPlaceholder') }}</span>
      <RiArrowDownSLine class="ml-2 size-4 shrink-0 text-muted-foreground transition-transform" :class="{ 'rotate-180': open }" />
    </div>
    <div v-if="open" class="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-background shadow-lg">
      <template v-for="node in treeData" :key="node.value">
        <div
          class="flex cursor-pointer items-center gap-1 px-3 py-1.5 text-sm hover:bg-accent"
          :class="{ 'bg-accent': selected === node.value }"
          :style="{ paddingLeft: `${12}px` }"
        >
          <RiArrowDownSLine
            v-if="!node.isLeaf"
            class="size-4 shrink-0 text-muted-foreground transition-transform"
            :class="{ '-rotate-90': !node.expanded }"
            @click.stop="toggleNode(node)"
          />
          <span v-else class="w-4 shrink-0" />
          <RiFolderLine class="size-4 shrink-0 text-muted-foreground" />
          <span class="flex-1 truncate" @click="selectNode(node)">{{ node.label }}</span>
          <RiAddLine
            class="size-3.5 shrink-0 cursor-pointer opacity-30 hover:opacity-100"
            @click.stop="openMkdir(node)"
          />
        </div>
        <template v-if="node.expanded && node.children">
          <div
            v-for="child in node.children"
            :key="child.value"
            class="flex cursor-pointer items-center gap-1 px-3 py-1.5 text-sm hover:bg-accent"
            :class="{ 'bg-accent': selected === child.value }"
            :style="{ paddingLeft: `${28}px` }"
          >
            <RiArrowDownSLine
              v-if="!child.isLeaf"
              class="size-4 shrink-0 text-muted-foreground transition-transform"
              :class="{ '-rotate-90': !child.expanded }"
              @click.stop="toggleNode(child)"
            />
            <span v-else class="w-4 shrink-0" />
            <RiFolderLine class="size-4 shrink-0 text-muted-foreground" />
            <span class="flex-1 truncate" @click="selectNode(child)">{{ child.label }}</span>
            <RiAddLine
              class="size-3.5 shrink-0 cursor-pointer opacity-30 hover:opacity-100"
              @click.stop="openMkdir(child)"
            />
          </div>
        </template>
      </template>
    </div>
  </div>

  <!-- mkdir dialog -->
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
