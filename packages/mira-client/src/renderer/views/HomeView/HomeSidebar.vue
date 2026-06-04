<script setup lang="ts">
import { ref, onActivated, onDeactivated, nextTick } from 'vue'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'

defineOptions({ name: 'HomeSidebar' })

defineProps<{
  homeController: {
    folderTree: { value: any[] }
    selectedFolder: { value: any }
    handleFolderExpand: (...args: any[]) => void
    toggleSearch: () => void
  }
  tags: any[]
}>()

const emit = defineEmits<{
  folderSelect: [folder: any]
  tagSelect: [tag: any]
  refreshFolders: []
  refreshTags: []
  emptyTrash: []
}>()

// keep-alive 滚动位置保持
const sidebarScrollRef = ref<HTMLElement>()
const savedScrollTop = ref(0)

onDeactivated(() => {
  if (sidebarScrollRef.value) {
    savedScrollTop.value = sidebarScrollRef.value.scrollTop
  }
})

onActivated(() => {
  nextTick(() => {
    if (sidebarScrollRef.value) {
      sidebarScrollRef.value.scrollTop = savedScrollTop.value
    }
  })
})
</script>

<template>
  <!-- 文件夹树形导航 -->
  <div ref="sidebarScrollRef" class="flex-grow p-2 overflow-y-auto min-w-0 space-y-4">
    <FolderTreeComponent
      item-type="folder"
      :draggable="true"
      :folders="homeController.folderTree.value"
      :selected-key="homeController.selectedFolder.value"
      :show-base-categories="true"
      @select="emit('folderSelect', $event)"
      @expand="homeController.handleFolderExpand"
      @refresh="emit('refreshFolders')"
      @empty-trash="emit('emptyTrash')"
    />
    <FolderTreeComponent
      item-type="tag"
      :tags="tags"
      @select="emit('tagSelect', $event)"
      @refresh="emit('refreshTags')"
    />
  </div>
  <!-- 底部搜索胶囊 -->
  <div class="shrink-0 px-2 pb-2 pt-1">
    <button
      class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-400 text-xs"
      @click="homeController.toggleSearch"
    >
      <span class="material-icons text-sm">search</span>
      <span>搜索</span>
    </button>
  </div>
</template>
