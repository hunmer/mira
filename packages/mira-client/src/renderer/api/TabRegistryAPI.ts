/**
 * Tab注册系统公共API
 *
 * 该文件提供了完整的Tab注册系统公共接口，支持：
 * 1. 注册自定义Tab类型（包括视图组件配置）
 * 2. 创建和管理Tab实例
 * 3. 执行Tab生命周期
 * 4. 视图渲染系统集成
 * 5. 插件系统集成
 */

import { tabRegistry, type TabTypeDefinition, type TabContext, type TabResult, type TabViewConfig } from '../composables/TabRegistry'
import { BaseTabType, MediaViewTabType } from '../composables/TabTypes'
import { initializeBuiltInTabTypes, isTabTypesInitialized } from '../composables/tabs'

// 重新导出核心类型供外部使用
export type { TabTypeDefinition, TabContext, TabResult, TabViewConfig }
export { BaseTabType, MediaViewTabType }

/**
 * Tab注册系统主要API类
 */
export class TabRegistryAPI {
  private static instance: TabRegistryAPI

  private constructor() {
    // 确保内置类型已注册
    this.ensureInitialized()
  }

  static getInstance(): TabRegistryAPI {
    if (!TabRegistryAPI.instance) {
      TabRegistryAPI.instance = new TabRegistryAPI()
    }
    return TabRegistryAPI.instance
  }

  /**
   * 确保内置Tab类型已初始化
   */
  private ensureInitialized(): void {
    if (!isTabTypesInitialized()) {
      console.log('🔄 TabRegistryAPI: 初始化内置Tab类型')
      initializeBuiltInTabTypes()
    }
  }

  /**
   * 注册自定义Tab类型
   *
   * @param tabType Tab类型定义
   * @returns 注册结果
   */
  registerTabType(tabType: TabTypeDefinition): TabResult {
    this.ensureInitialized()

    // 验证类型定义
    const validation = tabRegistry.validateType(tabType)
    if (!validation.success) {
      return validation
    }

    return tabRegistry.register(tabType)
  }

  /**
   * 获取已注册的Tab类型
   *
   * @param typeName 类型名称
   * @returns Tab类型定义或null
   */
  getTabType(typeName: string): TabTypeDefinition | null {
    this.ensureInitialized()
    return tabRegistry.getType(typeName)
  }

  /**
   * 获取Tab的视图配置
   *
   * @param typeName Tab类型名称
   * @param context Tab上下文
   * @returns 视图配置或null
   */
  async getTabViewConfig(typeName: string, context: TabContext): Promise<TabViewConfig | null> {
    const tabType = this.getTabType(typeName)
    if (!tabType || !tabType.getViewConfig) {
      return null
    }
    const config = tabType.getViewConfig(context)
    return config instanceof Promise ? await config : config
  }

  /**
   * 获取所有已注册的Tab类型
   *
   * @returns 所有Tab类型定义的数组
   */
  getAllTabTypes(): TabTypeDefinition[] {
    this.ensureInitialized()
    return tabRegistry.getAllTypes()
  }

  /**
   * 检查Tab类型是否已注册
   *
   * @param typeName 类型名称
   * @returns 是否已注册
   */
  isTabTypeRegistered(typeName: string): boolean {
    this.ensureInitialized()
    return tabRegistry.isRegistered(typeName)
  }

  /**
   * 取消注册Tab类型
   *
   * @param typeName 类型名称
   * @returns 取消注册结果
   */
  unregisterTabType(typeName: string): TabResult {
    return tabRegistry.unregister(typeName)
  }

  /**
   * 创建Tab类型的简化工厂方法
   *
   * @param config 配置选项
   * @returns Tab类型定义
   */
  createTabType(config: {
    name: string
    displayName: string
    icon: string
    iconColor?: string
    allowMultipleInstances?: boolean
    allowClose?: boolean
    cacheable?: boolean
    onInit?: (context: TabContext) => Promise<TabResult>
    onActive?: (context: TabContext) => Promise<TabResult>
    onInactive?: (context: TabContext) => Promise<TabResult>
    onClose?: (context: TabContext) => Promise<TabResult>
    getViewConfig?: (context: TabContext) => TabViewConfig
    onDataLoad?: (context: TabContext, pagination?: { limit?: number; offset?: number }) => Promise<TabResult<{ files: any[], total?: number }>>
  }): TabTypeDefinition {
    return {
      name: config.name,
      displayName: config.displayName,
      icon: config.icon,
      iconColor: config.iconColor || '#6B7280',
      allowMultipleInstances: config.allowMultipleInstances ?? true,
      allowClose: config.allowClose ?? true,
      cacheable: config.cacheable ?? true,
      onInit: config.onInit,
      onActive: config.onActive,
      onInactive: config.onInactive,
      onClose: config.onClose,
      getViewConfig: config.getViewConfig,
      onDataLoad: config.onDataLoad
    }
  }

  /**
   * 获取Tab注册统计信息
   *
   * @returns 统计信息
   */
  getRegistrationStats() {
    this.ensureInitialized()

    const allTypes = this.getAllTabTypes()
    const builtInTypes = ['home', 'all', 'folder', 'tag']

    return {
      total: allTypes.length,
      builtIn: allTypes.filter(type => builtInTypes.includes(type.name)).length,
      custom: allTypes.filter(type => !builtInTypes.includes(type.name)).length,
      types: allTypes.map(type => ({
        name: type.name,
        displayName: type.displayName,
        icon: type.icon,
        isBuiltIn: builtInTypes.includes(type.name)
      }))
    }
  }
}

// 导出单例实例
export const tabRegistryAPI = TabRegistryAPI.getInstance()

// 为了方便使用，导出一些常用的简化方法
export function registerTabType(tabType: TabTypeDefinition): TabResult {
  return tabRegistryAPI.registerTabType(tabType)
}

export function getTabType(typeName: string): TabTypeDefinition | null {
  return tabRegistryAPI.getTabType(typeName)
}

export function getAllTabTypes(): TabTypeDefinition[] {
  return tabRegistryAPI.getAllTabTypes()
}

export function isTabTypeRegistered(typeName: string): boolean {
  return tabRegistryAPI.isTabTypeRegistered(typeName)
}

export function createTabType(config: {
  name: string
  displayName: string
  icon: string
  iconColor?: string
  allowMultipleInstances?: boolean
  allowClose?: boolean
  cacheable?: boolean
  onInit?: (context: TabContext) => Promise<TabResult>
  onActive?: (context: TabContext) => Promise<TabResult>
  onInactive?: (context: TabContext) => Promise<TabResult>
  onClose?: (context: TabContext) => Promise<TabResult>
  getViewConfig?: (context: TabContext) => TabViewConfig
  onDataLoad?: (context: TabContext, pagination?: { limit?: number; offset?: number }) => Promise<TabResult<{ files: any[], total?: number }>>
}): TabTypeDefinition {
  return tabRegistryAPI.createTabType(config)
}

export async function getTabViewConfig(typeName: string, context: TabContext): Promise<TabViewConfig | null> {
  return await tabRegistryAPI.getTabViewConfig(typeName, context)
}

// 默认导出API实例
export default tabRegistryAPI