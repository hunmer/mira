<template>
  <div class="w-full h-full flex items-center justify-center p-4 box-border">
    <GlobalSearchContent />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GlobalSearchContent from '../search/GlobalSearchContent.vue'
import { useGlobalSearch } from '../../composables/useGlobalSearch'

// 使用全局搜索状态
const { 
  hideSearchDialog
} = useGlobalSearch()

/**
 * 处理全局键盘事件
 */
const handleGlobalKeyDown = (event: KeyboardEvent): void => {
  // ESC键关闭窗口
  if (event.key === 'Escape') {
    event.preventDefault()
    hideSearchWindow()
    return
  }
  
  // Ctrl/Cmd + W 关闭窗口
  if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
    event.preventDefault()
    hideSearchWindow()
    return
  }
}

/**
 * 关闭搜索窗口
 */
const hideSearchWindow = (): void => {
  if (window.electronAPI?.searchWindow) {
    window.electronAPI.searchWindow.hide()
  } else {
    hideSearchDialog()
  }
}

// 生命周期处理
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeyDown)
  
  // 自动聚焦搜索框
  setTimeout(() => {
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown)
})
</script>

