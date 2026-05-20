<template>
  <div>
    <div class="flex items-center justify-between px-2 mb-2">
      <h2 class="text-xs font-semibold text-gray-500">{{ title }}</h2>
      <div class="flex items-center space-x-1">
        <button
          @click="$emit('toggle-search')"
          class="p-1 text-gray-400 hover:text-gray-600 rounded"
          :class="{ 'text-blue-600': showSearch }"
          :title="searchPlaceholder"
        >
          <span class="material-icons text-sm">search</span>
        </button>
        <button
          @click="$emit('add')"
          class="p-1 text-gray-400 hover:text-gray-600 rounded"
          :title="`添加${title}`"
        >
          <span class="material-icons text-sm">add</span>
        </button>
      </div>
    </div>

    <div v-if="showSearch" class="px-2 mb-2">
      <input
        ref="searchInput"
        :value="searchQuery"
        @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="searchPlaceholder"
        class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
      />
    </div>

    <div v-if="treeData.length > 0" :class="[scrollClass, 'max-h-64 overflow-y-auto']">
      <ContextMenu>
        <ContextMenuTrigger as-child>
          <Tree v-bind="$attrs" :value="treeData">
            <template #default="slotProps">
              <slot name="node" v-bind="slotProps" />
            </template>
          </Tree>
        </ContextMenuTrigger>
        <ContextMenuContent class="w-52">
          <template v-for="(item, i) in contextMenuItems" :key="i">
            <ContextMenuSeparator v-if="item.separator" />
            <ContextMenuItem v-else :disabled="item.disabled" @click="item.command?.()">
              <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
              <span class="flex-1">{{ item.label }}</span>
            </ContextMenuItem>
          </template>
        </ContextMenuContent>
      </ContextMenu>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-8 text-gray-500">
      <span class="material-icons text-4xl mb-2 text-gray-400">{{ emptyIcon }}</span>
      <p class="text-sm text-center">{{ emptyText }}</p>
      <p class="text-xs text-gray-400 mt-1">{{ emptyHint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Tree from '@/components/ui/volt/Tree.vue'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  title: string
  showSearch: boolean
  searchQuery: string
  searchPlaceholder: string
  treeData: any[]
  contextMenuItems: any[]
  emptyIcon: string
  emptyText: string
  emptyHint: string
  scrollClass?: string
}>()

defineEmits<{
  'toggle-search': []
  'add': []
  'update:searchQuery': [value: string]
}>()

const searchInput = ref<HTMLInputElement | null>(null)

watch(() => props.showSearch, (val) => {
  if (val) nextTick(() => searchInput.value?.focus())
})
</script>
