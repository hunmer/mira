import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 「从 URL 导入」全局对话框状态。
 *
 * 各个入口（菜单、工具栏按钮、拖拽识别、插件）调用 open() 打开 UrlImportDialog；
 * Dialog 组件挂载在 App.vue 根节点，通过 visible 控制显隐。
 */
export const useUrlImportStore = defineStore('urlImport', () => {
  const visible = ref(false)
  /** 预填的 URL 列表（如拖拽带入） */
  const urls = ref<string[]>([])
  /** 预填的目标文件夹 id */
  const folderId = ref<number | null>(null)

  function open(payload?: { urls?: string[]; folderId?: number | null }) {
    urls.value = payload?.urls ? [...payload.urls] : []
    folderId.value = payload?.folderId ?? null
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  return { visible, urls, folderId, open, close }
})
