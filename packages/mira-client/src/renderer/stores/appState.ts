import { ref } from 'vue'

/**
 * 全局应用状态管理
 * 用于避免重复初始化和管理应用就绪状态
 */
class AppStateManager {
  private static instance: AppStateManager
  
  // 应用初始化状态
  public readonly isAppReady = ref(false)
  public readonly isInitializing = ref(false)
  public readonly lastInitTime = ref<Date | null>(null)
  
  // 路由处理状态
  public readonly routeHandlersRegistered = ref(false)
  
  private constructor() {}
  
  public static getInstance(): AppStateManager {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager()
    }
    return AppStateManager.instance
  }
  
  /**
   * 标记应用为已就绪状态
   */
  public setAppReady(): void {
    this.isAppReady.value = true
    this.isInitializing.value = false
    this.lastInitTime.value = new Date()
  }
  
  /**
   * 标记应用正在初始化
   */
  public setAppInitializing(): void {
    this.isInitializing.value = true
  }
  
  /**
   * 重置应用状态
   */
  public resetAppState(): void {
    this.isAppReady.value = false
    this.isInitializing.value = false
    this.lastInitTime.value = null
    this.routeHandlersRegistered.value = false
  }
  
  /**
   * 标记路由处理器已注册
   */
  public setRouteHandlersRegistered(): void {
    this.routeHandlersRegistered.value = true
  }
  
  /**
   * 检查应用是否需要初始化
   */
  public needsInitialization(): boolean {
    return !this.isAppReady.value && !this.isInitializing.value
  }
  
  /**
   * 检查是否可以处理路由
   */
  public canProcessRoutes(): boolean {
    return this.isAppReady.value && this.routeHandlersRegistered.value
  }
}

// 导出单例实例
export const appStateManager = AppStateManager.getInstance()

// 便捷的 composable
export function useAppState() {
  return {
    isAppReady: appStateManager.isAppReady,
    isInitializing: appStateManager.isInitializing,
    routeHandlersRegistered: appStateManager.routeHandlersRegistered,
    lastInitTime: appStateManager.lastInitTime,
    
    setAppReady: () => appStateManager.setAppReady(),
    setAppInitializing: () => appStateManager.setAppInitializing(),
    resetAppState: () => appStateManager.resetAppState(),
    setRouteHandlersRegistered: () => appStateManager.setRouteHandlersRegistered(),
    needsInitialization: () => appStateManager.needsInitialization(),
    canProcessRoutes: () => appStateManager.canProcessRoutes()
  }
}
