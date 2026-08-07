<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        class="contents"
        @contextmenu.capture="resolveAndOpen"
      >
        <slot />
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent class="w-52">
      <template v-for="(item, i) in contextMenuItems" :key="i">
        <ContextMenuSeparator v-if="item.separator" />
        <ContextMenuSub v-else-if="item.items?.length">
          <ContextMenuSubTrigger :disabled="item.disabled">
            <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent class="w-max min-w-44 max-w-[min(24rem,calc(100vw-1rem))]">
            <template v-for="(sub, j) in item.items" :key="j">
              <ContextMenuSub v-if="sub.items?.length">
                <ContextMenuSubTrigger :disabled="sub.disabled">
                  <span v-if="sub.icon" class="material-icons text-base mr-2">{{ sub.icon }}</span>
                  <span class="whitespace-normal break-words">{{ sub.label }}</span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent class="w-max min-w-44 max-w-[min(24rem,calc(100vw-1rem))]">
                  <ContextMenuItem
                    v-for="(leaf, k) in sub.items"
                    :key="k"
                    :disabled="leaf.disabled"
                    @select="executeMenuCommand(leaf)"
                  >
                    <span v-if="leaf.icon" class="material-icons text-base mr-2">{{ leaf.icon }}</span>
                    <span class="whitespace-normal break-words">{{ leaf.label }}</span>
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuItem
                v-else
                :disabled="sub.disabled"
                @select="executeMenuCommand(sub)"
              >
                <span v-if="sub.icon" class="material-icons text-base mr-2">{{ sub.icon }}</span>
                <span class="whitespace-normal break-words">{{ sub.label }}</span>
              </ContextMenuItem>
            </template>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem v-else :disabled="item.disabled" @select="executeMenuCommand(item)">
          <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.shortcut" class="ml-auto text-xs text-muted-foreground">{{ item.shortcut }}</span>
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>

  <!-- 文件夹选择 Popover -->
  <Popover v-model:open="folderPopoverOpen">
    <PopoverTrigger as-child>
      <div :style="{ position: 'fixed', left: popoverPosition.x + 'px', top: popoverPosition.y + 'px', width: '1px', height: '1px' }"></div>
    </PopoverTrigger>
    <PopoverContent class="w-80 p-2">
      <FolderTreeComponent
        item-type="folder"
        :folders="folderTreeNodes"
        :show-base-categories="false"
        :default-show-search="true"
        @select="handleFolderSelect"
      />
    </PopoverContent>
  </Popover>

  <!-- 标签选择 Popover -->
  <Popover v-model:open="tagPopoverOpen">
    <PopoverTrigger as-child>
      <div :style="{ position: 'fixed', left: popoverPosition.x + 'px', top: popoverPosition.y + 'px', width: '1px', height: '1px' }"></div>
    </PopoverTrigger>
    <PopoverContent class="w-80 p-2">
      <FolderTreeComponent
        item-type="tag"
        :tags="tagStore.tags"
        :default-show-search="true"
        @select="handleTagSelect"
      />
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import FolderTreeComponent from './FolderTreeComponent/FolderTreeComponent.vue'
import { useContextMenu } from './MediaGridComponent/composables/useContextMenu'
import type { FileInfo } from '../../../shared/types'
import type { MenuItem } from '@/renderer/types/menu'

interface Props {
  items: FileInfo[]
  selectedItems: string[]
  isTrash?: boolean
}

interface Emits {
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-delete', item: FileInfo): void
  (e: 'media-restore', item: FileInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  isTrash: false
})
const emit = defineEmits<Emits>()

const {
  contextMenuItems,
  handleContextMenu,
  folderPopoverOpen,
  tagPopoverOpen,
  popoverPosition,
  folderTreeNodes,
  handleFolderSelect,
  handleTagSelect,
  tagStore,
} = useContextMenu(props, emit)

// 右键命中解析：从事件目标向上找 data-selectable-id，再映射回 items 中的 FileInfo。
// 三种视图（grid/list/waterfall）的每个条目根节点都已打上 data-selectable-id，
// 所以这里无需父级做任何事件转发即可拿到命中的 item。
const resolveAndOpen = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  const el = target?.closest('[data-selectable-id]') as HTMLElement | null
  if (!el) return
  const id = el.getAttribute('data-selectable-id')
  if (!id) return
  const item = props.items.find(file => file.id === id)
  if (!item) return
  handleContextMenu(item, event)
}

const executeMenuCommand = async (item: MenuItem) => {
  if (item.disabled || !item.command) return

  try {
    await item.command()
  } catch (error) {
    console.error('Failed to execute media context menu command:', item.label, error)
  }
}
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}
</style>
