/**
 * Tab系统初始化Hook
 *
 * 确保在应用启动时正确初始化Tab注册系统，设置默认Tab，
 * 并提供系统状态的响应式接口
 */

import { ref, onMounted, computed } from 'vue'
import { useTabs } from './useTabs'
import { initializeBuiltInTabTypes, isTabTypesInitialized } from './tabs'
import { tabRegistryAPI } from '../api/TabRegistryAPI'

export interface TabSystemInitOptions {
  defaultTabType?: string
  autoCreateDefaultTab?: boolean
  enableLogging?: boolean
}

/**
 * Tab系统初始化Composable
 */
export function useTabSystemInit(options: TabSystemInitOptions = {}) {
  const {
    defaultTabType = 'home',
    autoCreateDefaultTab = true,
    enableLogging = true
  } = options

  // 响应式状态
  const isInitialized = ref(false)
  const initializationError = ref<string | null>(null)
  const isLoading = ref(false)

  const { tabs, setDefaultTab } = useTabs()

  // 计算属性
  const hasDefaultTab = computed(() => tabs.value.length > 0)
  const registrationStats = computed(() => tabRegistryAPI.getRegistrationStats())

  const log = (message: string) => {
    if (enableLogging) {
      console.log(`[TabSystemInit] ${message}`)
    }
  }

  /**
   * 初始化Tab系统
   */
  const initializeTabSystem = async (): Promise<boolean> => {
    if (isInitialized.value) {
      log('Tab系统已经初始化，跳过重复初始化')
      return true
    }

    isLoading.value = true
    initializationError.value = null

    try {
      log('开始初始化Tab系统')

      // 1. 初始化内置Tab类型
      const typesInitialized = initializeBuiltInTabTypes()
      if (!typesInitialized) {
        throw new Error('内置Tab类型初始化失败')
      }

      log(`内置Tab类型初始化成功，共注册 ${registrationStats.value.builtIn} 个类型`)

      // 2. 创建默认Tab（如果启用且当前没有Tab）
      if (autoCreateDefaultTab && tabs.value.length === 0) {
        log(`创建默认Tab: ${defaultTabType}`)

        const defaultTab = await setDefaultTab(defaultTabType, {
          libraryId: undefined // 在实际使用时会从libraryStore获取
        })

        if (defaultTab) {
          log(`默认Tab创建成功: ${defaultTab.label}`)
        } else {
          log(`默认Tab创建失败: ${defaultTabType}`)
        }
      }

      // 3. 验证系统状态
      const allTypesRegistered = ['home', 'all', 'folder', 'tag'].every(type =>
        tabRegistryAPI.isTabTypeRegistered(type)
      )

      if (!allTypesRegistered) {
        throw new Error('部分内置Tab类型未正确注册')
      }

      isInitialized.value = true
      log('Tab系统初始化完成')
      log(`系统状态: ${registrationStats.value.total} 个注册类型, ${tabs.value.length} 个Tab实例`)

      return true
    } catch (error) {
      const errorMessage = String(error)
      initializationError.value = errorMessage
      log(`Tab系统初始化失败: ${errorMessage}`)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 重置Tab系统（主要用于测试和开发）
   */
  const resetTabSystem = async (): Promise<void> => {
    log('重置Tab系统')

    // 清空所有Tab
    tabs.value.length = 0

    // 重置初始化状态
    isInitialized.value = false
    initializationError.value = null

    // 重新初始化
    await initializeTabSystem()
  }

  /**
   * 获取系统健康状态
   */
  const getSystemHealth = () => {
    const stats = registrationStats.value
    const health = {
      isHealthy: isInitialized.value && !initializationError.value,
      hasBuiltInTypes: stats.builtIn >= 4, // 至少应该有4个内置类型
      hasDefaultTab: hasDefaultTab.value,
      totalTypes: stats.total,
      totalTabs: tabs.value.length,
      error: initializationError.value
    }

    return health
  }

  /**
   * 手动触发默认Tab创建
   */
  const ensureDefaultTab = async (typeName?: string) => {
    const targetType = typeName || defaultTabType

    if (tabs.value.length === 0) {
      log(`确保默认Tab存在: ${targetType}`)
      const defaultTab = await setDefaultTab(targetType)
      return defaultTab !== null
    }

    return true
  }

  // 在组件挂载时自动初始化
  onMounted(() => {
    if (!isTabTypesInitialized()) {
      initializeTabSystem()
    } else {
      isInitialized.value = true
      log('Tab类型已初始化，跳过初始化过程')
    }
  })

  return {
    // 状态
    isInitialized: computed(() => isInitialized.value),
    isLoading: computed(() => isLoading.value),
    initializationError: computed(() => initializationError.value),
    hasDefaultTab,
    registrationStats,

    // 方法
    initializeTabSystem,
    resetTabSystem,
    getSystemHealth,
    ensureDefaultTab,

    // 直接暴露tabs状态供外部使用
    tabs: computed(() => tabs.value)
  }
}