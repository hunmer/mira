<template>
  <div class="mb-4">
    <ul class="space-y-0.5">
      <li v-for="folder in categories" :key="folder.id">
        <ContextMenu v-if="folder.id === 'trash'">
          <ContextMenuTrigger as-child>
            <a :data-folder-tree-node-id="folder.id" :class="[
              'flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors',
              selectedKey === folder.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground',
              locatingNodeId === folder.id ? 'sidebar-locate-active' : ''
            ]" @click.prevent="emit('select', folder)">
              <span class="flex items-center">
                <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
                  {{ folder.icon }}
                </span>
                {{ folder.label }}
              </span>
              <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
                {{ folder.count }}
              </span>
            </a>
          </ContextMenuTrigger>
          <ContextMenuContent class="w-48">
            <ContextMenuItem @click="emit('empty-trash')">
              <span>{{ t('business.folderTreeComponent.emptyTrash') }}</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <a v-else :data-folder-tree-node-id="folder.id" :class="[
          'flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors',
          selectedKey === folder.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground',
          locatingNodeId === folder.id ? 'sidebar-locate-active' : ''
        ]" @click.prevent="emit('select', folder)">
          <span class="flex items-center">
            <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
              {{ folder.icon }}
            </span>
            {{ folder.label }}
          </span>
          <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
            {{ folder.count }}
          </span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import type { BaseCategory } from '../types'
import '../styles/sidebar-locate.css'

defineProps<{
  categories: BaseCategory[]
  selectedKey?: string
  locatingNodeId?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', category: BaseCategory): void
  (e: 'empty-trash'): void
}>()

const { t } = useI18n()
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}
</style>
