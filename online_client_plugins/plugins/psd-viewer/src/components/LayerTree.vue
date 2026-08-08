<script setup lang="ts">
import { ChevronDown, ChevronRight, Folder, Image as ImageIcon } from 'lucide-vue-next'
import { ref } from 'vue'
import type { LayerNode } from '@/types'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import { cn } from '@/lib/utils'

defineProps<{
  nodes: LayerNode[]
  depth?: number
}>()

const emit = defineEmits<{
  change: []
}>()

const expanded = ref<Record<string, boolean>>({})

function toggleExpand(id: string) {
  expanded.value[id] = !expanded.value[id]
}

function isExpanded(id: string) {
  return expanded.value[id] !== false // 默认展开
}

function onVisibleChange(node: LayerNode, value: boolean) {
  node.visible = value
  // 组：联动子节点
  if (node.isGroup && node.children) {
    const setVisible = (list: LayerNode[], v: boolean) => {
      for (const child of list) {
        child.visible = v
        if (child.children) setVisible(child.children, v)
      }
    }
    setVisible(node.children, value)
  }
  emit('change')
}
</script>

<template>
  <ul :class="cn('space-y-0.5', depth ? 'ml-3 border-l border-border pl-2' : '')">
    <li v-for="node in nodes" :key="node.id">
      <div class="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent/60 group">
        <!-- 展开箭头 -->
        <button
          v-if="node.isGroup"
          type="button"
          class="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
          @click="toggleExpand(node.id)"
        >
          <ChevronDown v-if="isExpanded(node.id)" class="h-3.5 w-3.5" />
          <ChevronRight v-else class="h-3.5 w-3.5" />
        </button>
        <span v-else class="w-5" />

        <Checkbox
          :model-value="node.visible"
          class="h-3.5 w-3.5"
          @update:model-value="(v: boolean) => onVisibleChange(node, v)"
        />

        <component
          :is="node.isGroup ? Folder : ImageIcon"
          class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        />

        <span
          class="truncate text-sm"
          :class="{ 'text-muted-foreground line-through': !node.visible }"
          :title="node.name"
        >
          {{ node.name || '(未命名)' }}
        </span>

        <span
          v-if="node.opacity < 1"
          class="ml-auto text-[10px] text-muted-foreground tabular-nums"
        >
          {{ Math.round(node.opacity * 100) }}%
        </span>
      </div>

      <LayerTree
        v-if="node.isGroup && node.children?.length && isExpanded(node.id)"
        :nodes="node.children"
        :depth="(depth ?? 0) + 1"
        @change="emit('change')"
      />
    </li>
  </ul>
</template>
