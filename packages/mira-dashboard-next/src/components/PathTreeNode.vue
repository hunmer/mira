<script setup lang="ts">
import { RiArrowDownSLine, RiFolderLine, RiAddLine } from '@remixicon/vue'
import type { TreeNode } from './PathTreeSelect.vue'

const props = defineProps<{
  node: TreeNode
  selected: string
  depth?: number
  fetchDirs: (path?: string) => Promise<TreeNode[]>
}>()

const emit = defineEmits<{
  select: [value: string]
  mkdir: [node: TreeNode]
}>()

const depth = props.depth ?? 0

async function toggle() {
  if (props.node.isLeaf) return
  if (!props.node.children && !props.node.loading) {
    props.node.loading = true
    try {
      const children = await props.fetchDirs(props.node.value)
      if (children.length) {
        props.node.children = children
      } else {
        props.node.isLeaf = true
      }
    } catch {
      props.node.isLeaf = true
    } finally {
      props.node.loading = false
    }
  }
  props.node.expanded = !props.node.expanded
}

// 点击文件夹名：选中并默认展开（已展开的不折叠，折叠仍由箭头控制）
async function selectNode() {
  emit('select', props.node.value)
  if (!props.node.isLeaf && !props.node.expanded) {
    await toggle()
  }
}
</script>

<template>
  <div>
    <div
      class="flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-sm hover:bg-accent"
      :class="{ 'bg-accent': selected === node.value }"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
    >
      <RiArrowDownSLine
        v-if="!node.isLeaf"
        class="size-4 shrink-0 text-muted-foreground transition-transform"
        :class="{ '-rotate-90': !node.expanded }"
        @click.stop="toggle"
      />
      <span v-else class="w-4 shrink-0" />
      <RiFolderLine class="size-4 shrink-0 text-muted-foreground" />
      <span class="min-w-0 flex-1 truncate" @click="selectNode">{{ node.label }}</span>
      <RiAddLine
        class="size-3.5 shrink-0 cursor-pointer opacity-30 hover:opacity-100"
        @click.stop="$emit('mkdir', node)"
      />
    </div>
    <template v-if="node.expanded && node.children">
      <PathTreeNode
        v-for="child in node.children"
        :key="child.value"
        :node="child"
        :selected="selected"
        :depth="depth + 1"
        :fetch-dirs="fetchDirs"
        @select="$emit('select', $event)"
        @mkdir="$emit('mkdir', $event)"
      />
    </template>
  </div>
</template>
