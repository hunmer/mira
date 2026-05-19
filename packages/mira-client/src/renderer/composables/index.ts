import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/renderer/composables/useToast'
import ConfigStorage from '@renderer/utils/ConfigStorage'

// 导出tabs相关功能
export { useTabs, type TabItem } from './useTabs'

// 导出媒体操作功能
export { useMediaOperations } from './useMediaOperations'

// 导出筛选器功能
export { useFilters } from './useFilters'

// 导出窗口控制和导航功能
export { useWindowAndNavigation } from './useWindowAndNavigation'

// 导出素材库管理功能
export { useLibraryManagement } from './useLibraryManagement'

// 导出视图模式配置功能
export { useViewModeConfig } from './useViewModeConfig'

/**
 * 通知消息 Composable
 */
export function useNotification() {
  const toast = useToast()

  const showSuccess = (message: string, summary?: string) => {
    toast.add({
      severity: 'success',
      summary: summary || '成功',
      detail: message,
      life: 3000
    })
  }

  const showError = (message: string, summary?: string) => {
    toast.add({
      severity: 'error',
      summary: summary || '错误',
      detail: message,
      life: 5000
    })
  }

  const showWarning = (message: string, summary?: string) => {
    toast.add({
      severity: 'warn',
      summary: summary || '警告',
      detail: message,
      life: 4000
    })
  }

  const showInfo = (message: string, summary?: string) => {
    toast.add({
      severity: 'info',
      summary: summary || '信息',
      detail: message,
      life: 3000
    })
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}

/**
 * 加载状态 Composable
 */
export function useLoading(initialState: boolean = false) {
  const isLoading = ref(initialState)
  const loadingMessage = ref('')

  const startLoading = (message?: string) => {
    isLoading.value = true
    loadingMessage.value = message || '加载中...'
  }

  const stopLoading = () => {
    isLoading.value = false
    loadingMessage.value = ''
  }

  const withLoading = async <T>(
    promise: Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(message)
    try {
      return await promise
    } finally {
      stopLoading()
    }
  }

  return {
    isLoading,
    loadingMessage,
    startLoading,
    stopLoading,
    withLoading
  }
}

/**
 * 窗口尺寸 Composable
 */
export function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)

  const isMobile = computed(() => width.value < 768)
  const isTablet = computed(() => width.value >= 768 && width.value < 1024)
  const isDesktop = computed(() => width.value >= 1024)

  const updateSize = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    window.addEventListener('resize', updateSize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateSize)
  })

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop
  }
}

/**
 * 本地存储 Composable
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
) {
  const storedValue = ref<T>(defaultValue)

  // 读取存储值
  const loadValue = () => {
    try {
      const item = ConfigStorage.getItem(key)
      if (item) {
        storedValue.value = JSON.parse(item)
      }
    } catch (error) {
      console.warn(`Failed to load localStorage key "${key}":`, error)
      storedValue.value = defaultValue
    }
  }

  // 保存值
  const saveValue = (value: T) => {
    try {
      storedValue.value = value
      ConfigStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Failed to save localStorage key "${key}":`, error)
    }
  }

  // 删除值
  const removeValue = () => {
    try {
      ConfigStorage.removeItem(key)
      storedValue.value = defaultValue
    } catch (error) {
      console.warn(`Failed to remove localStorage key "${key}":`, error)
    }
  }

  // 初始化时加载值
  loadValue()

  return {
    value: storedValue,
    save: saveValue,
    remove: removeValue,
    reload: loadValue
  }
}

/**
 * 键盘快捷键 Composable
 */
export function useKeyboard() {
  const keyHandlers = new Map<string, (event: KeyboardEvent) => void>()

  const addKeyHandler = (
    key: string,
    handler: (event: KeyboardEvent) => void,
    options: {
      ctrl?: boolean
      shift?: boolean
      alt?: boolean
      meta?: boolean
    } = {}
  ) => {
    const keyCombo = [
      options.ctrl && 'ctrl',
      options.shift && 'shift',
      options.alt && 'alt',
      options.meta && 'meta',
      key.toLowerCase()
    ].filter(Boolean).join('+')

    keyHandlers.set(keyCombo, handler)
  }

  const removeKeyHandler = (key: string, options: any = {}) => {
    const keyCombo = [
      options.ctrl && 'ctrl',
      options.shift && 'shift',
      options.alt && 'alt',
      options.meta && 'meta',
      key.toLowerCase()
    ].filter(Boolean).join('+')

    keyHandlers.delete(keyCombo)
  }

  const handleKeydown = (event: KeyboardEvent) => {
    const keyCombo = [
      event.ctrlKey && 'ctrl',
      event.shiftKey && 'shift',
      event.altKey && 'alt',
      event.metaKey && 'meta',
      event.key.toLowerCase()
    ].filter(Boolean).join('+')

    const handler = keyHandlers.get(keyCombo)
    if (handler) {
      event.preventDefault()
      handler(event)
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    keyHandlers.clear()
  })

  return {
    addKeyHandler,
    removeKeyHandler
  }
}
