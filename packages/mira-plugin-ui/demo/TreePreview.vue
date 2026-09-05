<script setup lang="ts">
import { ref } from 'vue'
import '@/assets/tailwind.css'
import LibraryTree from '@/library/LibraryTree.vue'
import type { LibraryTreeNode } from '@/library/types'

// mock 三层树(id/parentId/level 对齐后端扁平结构组装后的形态)
const n = (id: number, title: string, parentId: number, level: number, children: LibraryTreeNode[] = [], color?: number): LibraryTreeNode =>
  ({ id, title, parentId, level, children, color })

const nodes: LibraryTreeNode[] = [
  n(1, '项目资料', 0, 0, [
    n(2, '设计稿', 1, 1, [
      n(6, '首页', 2, 2),
      n(7, '详情页', 2, 2),
    ]),
    n(3, '文档', 1, 1),
  ]),
  n(4, '个人收藏', 0, 0, [
    n(5, '灵感', 4, 1),
  ], 0x3b82f6),
  n(8, '归档', 0, 0),
]

const expanded = ref(new Set([1, 2, 4]))
const selectedIds = ref<Set<number>>(new Set([6]))

function onToggle(id: number) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}
function onSelect(node: LibraryTreeNode) {
  selectedIds.value = selectedIds.value.has(node.id) ? new Set() : new Set([node.id])
}
</script>

<template>
  <div class="min-h-screen bg-white p-6">
    <div class="w-80 rounded-lg border border-border p-2">
      <LibraryTree
        :nodes="nodes"
        kind="folder"
        :indent="20"
        :expanded="expanded"
        :selected-ids="selectedIds"
        :root="true"
        @toggle="onToggle"
        @select="onSelect"
      />
    </div>
  </div>
</template>
