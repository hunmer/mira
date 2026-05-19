<template>
  <!-- 网页端模式：使用shadcn Dialog -->
  <Dialog
    v-if="!isDesktop"
    :open="globalSearchState.isVisible"
    @update:open="handleOpenChange"
  >
    <DialogContent class="global-search-dialog sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>全局搜索</DialogTitle>
      </DialogHeader>
      <GlobalSearchContent />
    </DialogContent>
  </Dialog>

  <!-- 桌面端模式：直接显示内容，将在独立窗口中加载 -->
  <GlobalSearchContent v-else />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import GlobalSearchContent from '../search/GlobalSearchContent.vue'
import { useGlobalSearch } from '../../composables/useGlobalSearch'

// 使用全局搜索状态
const { 
  state: globalSearchState,
  isDesktop,
  handleKeyboardNavigation,
  hideSearchDialog
} = useGlobalSearch()

/**
 * 处理对话框隐藏事件
 */
const handleDialogHide = (): void => {
  hideSearchDialog()
}

/**
 * 处理 Dialog open 状态变化
 */
const handleOpenChange = (open: boolean): void => {
  if (!open) {
    hideSearchDialog()
  }
}

/**
 * 处理全局键盘事件
 */
const handleGlobalKeyDown = (event: KeyboardEvent): void => {
  // 只在搜索对话框可见时处理键盘事件
  if (!globalSearchState.value.isVisible) return
  
  handleKeyboardNavigation({
    key: event.key,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation()
  })
}

// 生命周期
onMounted(() => {
  // 添加全局键盘事件监听
  document.addEventListener('keydown', handleGlobalKeyDown)
})

onUnmounted(() => {
  // 移除全局键盘事件监听
  document.removeEventListener('keydown', handleGlobalKeyDown)
})
</script>

<style scoped>
/* 全局搜索对话框样式 */
.global-search-dialog {
  --dialog-width: 600px;
  --dialog-max-width: 90vw;
  --dialog-height: auto;
  --dialog-max-height: 80vh;
}

/* 桌面端模式全屏样式 */
.global-search-dialog:global(.desktop-mode) {
  --dialog-width: 100vw;
  --dialog-height: 100vh;
  --dialog-max-width: 100vw;
  --dialog-max-height: 100vh;
}

/* 确保对话框在移动设备上的良好显示 */
@media (max-width: 640px) {
  .global-search-dialog {
    --dialog-width: 95vw;
    --dialog-max-width: 95vw;
    --dialog-max-height: 90vh;
  }
}
</style>
