/**
 * UI状态管理 - 管理对话框显示状态
 */
import { ref } from 'vue'
import type { ServerConfig } from '@renderer/stores/serverList'

export function useHomeUIState() {
  // 对话框状态
  const showServerManagementDialog = ref(false)
  const showServerEditDialog = ref(false)
  const showShortcutDialog = ref(false)
  const editingServer = ref<ServerConfig | null>(null)

  // 显示素材库管理
  const showLibraryManagement = () => {
    showServerManagementDialog.value = true
  }

  return {
    // 对话框状态
    showServerManagementDialog,
    showServerEditDialog,
    showShortcutDialog,
    editingServer,

    // 方法
    showLibraryManagement
  }
}
