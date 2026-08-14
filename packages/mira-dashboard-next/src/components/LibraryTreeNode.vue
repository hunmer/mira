<script setup lang="ts">
import { computed } from 'vue'
import {
  RiArrowDownSLine,
  RiFolderLine,
  RiPriceTag3Line,
} from '@remixicon/vue'
import type { LibraryTreeNode } from './LibraryTreeSelect.vue'

const props = withDefaults(defineProps<{
  node: LibraryTreeNode
  entity: 'folder' | 'tag'
  multiple?: boolean
  selectedIds: number[]
  depth?: number
}>(), {
  multiple: false,
  depth: 0,
})

const emit = defineEmits<{
  select: [id: number]
}>()

const selected = computed(() => props.selectedIds.includes(props.node.id))

function toggleExpanded() {
  if (props.node.children.length) props.node.expanded = !props.node.expanded
}
</script>

<template>
  <div>
    <div
      class="group flex min-h-8 items-center gap-1 rounded-md text-sm hover:bg-accent"
      :class="{ 'bg-accent text-accent-foreground': selected }"
      :style="{ paddingLeft: `${depth * 18 + 6}px` }"
    >
      <button
        v-if="node.children.length"
        type="button"
        class="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        :title="node.expanded ? '收起' : '展开'"
        @click.stop="toggleExpanded"
      >
        <RiArrowDownSLine
          class="size-4 transition-transform"
          :class="{ '-rotate-90': !node.expanded }"
        />
      </button>
      <span v-else class="size-6 shrink-0" />

      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 py-1 pr-2 text-left"
        @click="emit('select', node.id)"
      >
        <input
          v-if="multiple"
          type="checkbox"
          class="size-4 shrink-0 accent-primary"
          :checked="selected"
          tabindex="-1"
          aria-hidden="true"
        >
        <RiFolderLine v-if="entity === 'folder'" class="size-4 shrink-0 text-amber-600" />
        <RiPriceTag3Line v-else class="size-4 shrink-0 text-sky-600" />
        <span class="min-w-0 flex-1 truncate">{{ node.title }}</span>
        <span v-if="node.fileCount != null" class="shrink-0 text-xs text-muted-foreground">
          {{ node.fileCount }}
        </span>
      </button>
    </div>

    <div v-if="node.expanded && node.children.length" class="relative">
      <div
        class="absolute bottom-1 top-1 w-px bg-border"
        :style="{ left: `${depth * 18 + 18}px` }"
        aria-hidden="true"
      />
      <LibraryTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :entity="entity"
        :multiple="multiple"
        :selected-ids="selectedIds"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
