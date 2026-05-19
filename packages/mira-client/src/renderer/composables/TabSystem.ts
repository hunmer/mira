/**
 * Tab注册系统统一导出文件
 *
 * 提供完整的Tab注册系统API，包括：
 * - 核心类型定义
 * - 注册系统API
 * - 内置Tab类型
 * - 系统初始化
 * - 演示和测试工具
 */

// 核心类型和接口
export type {
  TabItem
} from './useTabs'

export type {
  TabTypeDefinition,
  TabContext,
  TabResult
} from './TabRegistry'

// 核心组件和基类
export {
  tabRegistry
} from './TabRegistry'

export {
  BaseTabType,
  MediaTabType
} from './TabTypes'

// 内置Tab类型
export {
  homeTabType,
  allTabType,
  folderTabType,
  tagTabType,
  initializeBuiltInTabTypes,
  isTabTypesInitialized,
  resetTabTypesInitialization
} from './tabs'

// 公共API
export {
  tabRegistryAPI,
  registerTabType,
  getTabType,
  getAllTabTypes,
  isTabTypeRegistered,
  createTabType
} from '../api/TabRegistryAPI'

// 系统初始化
export {
  useTabSystemInit
} from './useTabSystemInit'

export type {
  TabSystemInitOptions
} from './useTabSystemInit'

// Tab管理Composable
export {
  useTabs
} from './useTabs'

// 演示和测试工具
export {
  useTabSystemDemo
} from './TabSystemDemo'

export {
  useTabSystemFixesDemo
} from './TabSystemFixes'

// 持久化工具
export {
  tabPersistence
} from './TabPersistence'

export type {
  TabState,
  TabsStateSnapshot
} from './TabPersistence'

/**
 * 快速开始指南
 *
 * 1. 初始化系统：
 * ```ts
 * import { useTabSystemInit } from '@renderer/composables/TabSystem'
 *
 * const { isInitialized, initializeTabSystem } = useTabSystemInit({
 *   defaultTabType: 'home',
 *   autoCreateDefaultTab: true
 * })
 * ```
 *
 * 2. 注册自定义Tab类型：
 * ```ts
 * import { registerTabType, createTabType } from '@renderer/composables/TabSystem'
 *
 * const customType = createTabType({
 *   name: 'my-custom-tab',
 *   displayName: '我的自定义Tab',
 *   icon: 'star',
 *   async onDataLoad(context) {
 *     // 实现数据加载逻辑
 *     return { success: true, data: { files: [], total: 0 } }
 *   }
 * })
 *
 * registerTabType(customType)
 * ```
 *
 * 3. 使用Tab管理：
 * ```ts
 * import { useTabs } from '@renderer/composables/TabSystem'
 *
 * const {
 *   tabs,
 *   createTabFromRegisteredType,
 *   switchToTab,
 *   closeTab
 * } = useTabs()
 *
 * // 创建Tab实例
 * await createTabFromRegisteredType('my-custom-tab', {
 *   label: '我的Tab',
 *   data: { customData: 'value' }
 * })
 * ```
 *
 * 4. 继承内置基类：
 * ```ts
 * import { MediaTabType } from '@renderer/composables/TabSystem'
 *
 * class MyMediaTab extends MediaTabType {
 *   name = 'my-media-tab'
 *   displayName = '我的媒体Tab'
 *   icon = 'photo'
 *
 *   protected generateTabId(context) {
 *     return `my-media-${context.id || Date.now()}`
 *   }
 * }
 * ```
 */