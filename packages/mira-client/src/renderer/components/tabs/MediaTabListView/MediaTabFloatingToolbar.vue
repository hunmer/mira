<script setup lang="ts">
import { computed, ref } from 'vue'
import { ImagesBadge } from '@/components/ui/images-badge'
import type { BadgeImage } from '@/components/ui/images-badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { useFloatingToolbar } from './useFloatingToolbar'

/**
 * 浮动操作栏：选中项批量操作（回收站恢复/彻底删除，普通视图复制/分享/删除）+ 分页控件
 * 选中指示由 images-badge（21st.dev 移植）呈现：缩略图堆叠、悬停扇形展开、右上角数字徽章；
 * 页码收进 dots combobox（‹ 当前页/总页 ⋯ ›，可搜索键入跳页），避免选中多图时工具栏过宽；
 * FLIP 宽度过渡（useFloatingToolbar）与进入/退出缩放动画保留。
 */
const props = defineProps<{
  selectedItems: string[]
  selectedImages: BadgeImage[]
  isTrash: boolean
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{
  invertSelection: []
  clearSelection: []
  toolbarAction: [action: string]
  previousPage: []
  nextPage: []
  pageChange: [page: number]
}>()

const selectedItems = computed(() => props.selectedItems)
const totalPages = computed(() => props.totalPages)
const { toolbarRef, showFloatingToolbar } = useFloatingToolbar({ selectedItems, totalPages })

const pageMenuOpen = ref(false)
const goToPage = (n: number) => {
  pageMenuOpen.value = false
  emit('pageChange', n)
}
</script>

<template>
  <!-- 浮动操作栏 -->
  <div class="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-30">
    <Transition name="toolbar-zoom" appear>
      <div v-if="showFloatingToolbar" ref="toolbarRef"
        class="pointer-events-auto flex items-center space-x-4 bg-white/60 dark:bg-muted/80 backdrop-blur-xl shadow-[0_12px_36px_rgba(99,102,241,0.15)] rounded-full p-1.5 border border-white/60 dark:border-border"
        style="transform-origin: center;">
        <!-- 选中指示：缩略图堆叠徽章（悬停扇形展开），右上角数字徽章为选中总数 -->
        <ImagesBadge v-if="selectedItems.length > 0" bare size="sm" :images="selectedImages"
          :label="String(selectedItems.length)"
          :title="$t('tabs.mediaTabListView.selectedCount', { count: selectedItems.length })" />

        <!-- 操作按钮 - 仅在选中文件时显示 -->
        <div v-if="selectedItems.length > 0" class="flex items-center space-x-2">
          <!-- 反选 -->
          <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            :title="$t('tabs.mediaTabListView.invertSelection')" @click="emit('invertSelection')">
            <span
              class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">swap_horiz</span>
          </button>
          <!-- 取消选择 -->
          <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            :title="$t('tabs.mediaTabListView.clearSelection')" @click="emit('clearSelection')">
            <span
              class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">deselect</span>
          </button>
          <div class="h-6 border-l border-border dark:border-border"></div>

          <!-- 回收站：恢复文件 / 彻底删除 -->
          <template v-if="isTrash">
            <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              :title="$t('tabs.mediaTabListView.restoreFiles', { count: selectedItems.length })"
              @click="emit('toolbarAction', 'restore')">
              <span
                class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">restore</span>
            </button>
            <button class="p-2 rounded-full hover:bg-primary/10 group transition-colors"
              :title="$t('tabs.mediaTabListView.purgeFiles', { count: selectedItems.length })"
              @click="emit('toolbarAction', 'purge')">
              <span
                class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground group-hover:text-destructive dark:group-hover:text-destructive">delete_forever</span>
            </button>
          </template>

          <!-- 普通视图：复制 / 打开 / 删除 -->
          <template v-else>
            <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              :title="$t('common.copy')" @click="emit('toolbarAction', 'copy')">
              <span class="material-icons text-muted-foreground dark:text-muted-foreground">content_copy</span>
            </button>
            <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              :title="$t('tabs.mediaTabListView.share')" @click="emit('toolbarAction', 'share')">
              <span class="material-icons text-muted-foreground dark:text-muted-foreground">ios_share</span>
            </button>
            <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              :title="$t('tabs.mediaTabListView.deleteFiles', { count: selectedItems.length })"
              @click="emit('toolbarAction', 'delete')">
              <span class="material-icons text-muted-foreground dark:text-muted-foreground">delete</span>
            </button>
          </template>
          <div class="h-6 border-l border-border dark:border-border"></div>
        </div>

        <!-- 分页控件 - 只有多页时显示：当前页文本 + dots combobox 搜索跳页 -->
        <div v-if="totalPages > 1"
          class="flex items-center space-x-1 text-muted-foreground dark:text-muted-foreground text-xs">
          <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            :disabled="currentPage === 1" @click="emit('previousPage')">
            <span class="material-symbols-outlined text-sm">chevron_left</span>
          </button>

          <span class="px-1 font-medium">{{ currentPage }}/{{ totalPages }}</span>

          <Popover v-model:open="pageMenuOpen">
            <PopoverTrigger as-child>
              <button
                class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-sm">more_horiz</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" class="w-44 p-0">
              <Command>
                <CommandInput :placeholder="$t('tabs.mediaTabListView.pageJumpPlaceholder')" />
                <CommandList class="max-h-64">
                  <CommandEmpty>{{ $t('tabs.mediaTabListView.pageJumpEmpty') }}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem v-for="n in totalPages" :key="n" :value="String(n)" class="justify-center"
                      :class="n === currentPage ? 'bg-primary font-semibold text-primary-foreground' : ''"
                      @select="goToPage(n)">
                      {{ n }}
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            :disabled="currentPage === totalPages" @click="emit('nextPage')">
            <span class="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 浮动操作栏：放大/缩小进入退出 */
.toolbar-zoom-enter-active {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease;
}

.toolbar-zoom-leave-active {
  transition: transform 150ms ease-in, opacity 150ms ease;
}

.toolbar-zoom-enter-from,
.toolbar-zoom-leave-to {
  transform: scale(0.6);
  opacity: 0;
}

/* 图标字体 span 是 inline-block，在非 flex 按钮里按基线对齐会把内容撑到 ~23.5px；
   按钮统一 flex 居中后内容高 = 图标行盒 18px，恢复 34x34 正方 */
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.material-icons,
.material-symbols-outlined {
  font-size: 18px;
  line-height: 1;
}

.material-symbols-outlined.text-sm {
  font-size: 16px;
}

.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
