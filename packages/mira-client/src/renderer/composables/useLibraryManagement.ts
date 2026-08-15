import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalInitializationState } from './useInitializationState'
import type { ServerConfig } from '@renderer/stores/serverList'

/**
 * 素材库管理功能 Composable
 */
export function useLibraryManagement(libraryStore: any) {
  const router = useRouter()
  const initState = useGlobalInitializationState()
  
  // ============================================
  // 状态
  // ============================================
  const currentLibrary = ref<ServerConfig | null>(null)
  const showNoLibraryDialog = ref(false)

  // ============================================
  // 素材库操作方法
  // ============================================
  
  /**
   * 选择素材库
   */
  const selectLibrary = async (library: ServerConfig) => {
    currentLibrary.value = library
    // 更新活跃素材库
    await libraryStore.setActiveLibrary(library.id)
  }

  /**
   * 添加新素材库
   */
  const addNewLibrary = () => {
  }

  /**
   * 检查素材库可用性
   */
  const checkLibraryAvailability = () => {
    // 检查初始化状态中是否有 NO_LIBRARY_AVAILABLE 错误
    if (initState.state.error === 'NO_LIBRARY_AVAILABLE') {
      showNoLibraryDialog.value = true
    }
  }

  /**
   * 处理创建素材库
   */
  const handleCreateLibrary = () => {
    showNoLibraryDialog.value = false
    // 跳转到设置页面的素材库管理部分
    router.push({ name: 'Settings', query: { tab: 'libraries' } })
  }

  // ============================================
  // 初始化和监听
  // ============================================
  
  // 初始化默认素材库
  const initializeDefaultLibrary = async () => {
    // 初始化 libraryStore
    await libraryStore.initializeServerList()
    if (libraryStore.libraries && libraryStore.libraries.length > 0) {
      // 如果有活跃的素材库，使用它；否则使用第一个
      const activeLibrary = libraryStore.activeLibrary || libraryStore.libraries[0]
      currentLibrary.value = activeLibrary
    } else {
      currentLibrary.value = null
    }
  }

  // 监听初始化状态变化
  watch(() => initState.state.error, (newError) => {
    if (newError === 'NO_LIBRARY_AVAILABLE') {
      showNoLibraryDialog.value = true
    }
  }, { immediate: true })

  // 组件挂载时检查
  onMounted(() => {
    checkLibraryAvailability()
  })

  // ============================================
  // 返回接口
  // ============================================
  return {
    // 状态
    currentLibrary,
    showNoLibraryDialog,
    
    // 方法
    selectLibrary,
    addNewLibrary,
    checkLibraryAvailability,
    handleCreateLibrary,
    initializeDefaultLibrary
  }
}
