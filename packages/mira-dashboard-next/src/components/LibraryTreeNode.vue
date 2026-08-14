<script setup lang="ts">
import { computed } from 'vue'
import {
  RiArrowDownSLine,
  RiCheckboxBlankLine,
  RiCheckboxCircleLine,
  RiFolderLine,
  RiPriceTag3Line,
} from '@remixicon/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
      class="group flex min-h-7 items-center gap-0.5"
      :style="{ paddingLeft: `${depth * 16}px` }"
    >
      <Button
        v-if="node.children.length"
        type="button"
        variant="ghost"
        size="icon-sm"
        class="text-muted-foreground"
        :title="node.expanded ? '收起' : '展开'"
        @click.stop="toggleExpanded"
      >
        <RiArrowDownSLine
          class="size-4 transition-transform"
          :class="{ '-rotate-90': !node.expanded }"
        />
      </Button>
      <span v-else class="size-6 shrink-0" aria-hidden="true" />

      <Button
        type="button"
        :variant="selected ? 'secondary' : 'ghost'"
        size="lg"
        class="min-w-0 flex-1 justify-start px-2 font-normal"
        @click="emit('select', node.id)"
      >
        <RiCheckboxCircleLine v-if="multiple && selected" class="size-4 text-primary" />
        <RiCheckboxBlankLine v-else-if="multiple" class="size-4 text-muted-foreground" />
        <RiFolderLine v-if="entity === 'folder'" class="size-4 shrink-0 text-amber-600" />
        <RiPriceTag3Line v-else class="size-4 shrink-0 text-sky-600" />
        <span class="min-w-0 flex-1 truncate">{{ node.title }}</span>
        <Badge v-if="node.fileCount != null" variant="secondary" class="h-4 px-1.5 font-normal">
          {{ node.fileCount }}
        </Badge>
      </Button>
    </div>

    <div v-if="node.expanded && node.children.length" class="relative">
      <div
        class="absolute bottom-1 top-1 w-px bg-border"
        :style="{ left: `${depth * 16 + 12}px` }"
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
