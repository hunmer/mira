<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        ref="triggerRef"
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

  <CoverCropDialog
    v-model:open="coverCropOpen"
    :item="currentContextItem"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
import CoverCropDialog from './CoverCropDialog.vue'
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
  currentContextItem,
  contextMenuItems,
  handleContextMenu,
  openFolderPopover,
  openTagPopover,
  folderPopoverOpen,
  tagPopoverOpen,
  coverCropOpen,
  popoverPosition,
  folderTreeNodes,
  handleFolderSelect,
  handleTagSelect,
  tagStore,
} = useContextMenu(props, emit)

const triggerRef = ref<HTMLElement | null>(null)
const pointerPosition = ref<{ x: number; y: number } | null>(null)

const trackPointerPosition = (event: PointerEvent) => {
  pointerPosition.value = { x: event.clientX, y: event.clientY }
}

const getShortcutTarget = () => {
  if (props.isTrash || props.selectedItems.length === 0) return null

  const item = props.items.find(file => props.selectedItems.includes(file.id))
  if (!item) return null

  const element = Array.from(triggerRef.value?.querySelectorAll<HTMLElement>('[data-selectable-id]') ?? [])
    .find(candidate => candidate.dataset.selectableId === item.id)
  if (!element || !element.checkVisibility()) return null

  const rect = element.getBoundingClientRect()
  return {
    item,
    position: pointerPosition.value ?? {
      x: rect.left + Math.min(rect.width / 2, 160),
      y: rect.top + Math.min(rect.height / 2, 120),
    },
  }
}

const handleSetFolderShortcut = () => {
  const target = getShortcutTarget()
  if (target) openFolderPopover(target.item, target.position)
}

const handleSetTagsShortcut = () => {
  const target = getShortcutTarget()
  if (target) openTagPopover(target.item, target.position)
}

onMounted(() => {
  window.addEventListener('pointermove', trackPointerPosition, { passive: true })
  document.addEventListener('shortcut:media-set-folder', handleSetFolderShortcut)
  document.addEventListener('shortcut:media-set-tags', handleSetTagsShortcut)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', trackPointerPosition)
  document.removeEventListener('shortcut:media-set-folder', handleSetFolderShortcut)
  document.removeEventListener('shortcut:media-set-tags', handleSetTagsShortcut)
})

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
