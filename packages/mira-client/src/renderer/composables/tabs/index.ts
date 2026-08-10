import { tabRegistry } from '../TabRegistry'
import { allTabType } from './AllTabType'
import { folderTabType } from './FolderTabType'
import { tagTabType } from './TagTabType'
import { homeTabType } from './HomeTabType'
import { uncategorizedTabType } from './UncategorizedTabType'
import { untaggedTabType } from './UntaggedTabType'
import { trashTabType } from './TrashTabType'
import { webviewTabType } from './WebviewTabType'
import { customTabType } from './CustomTabType'

// 自动初始化标志
let isInitialized = false

/**
 * 初始化内置Tab类型
 */
export function initializeBuiltInTabTypes(): boolean {
  if (isInitialized) {
    return true
  }

  try {
    const registrations = [
      { type: homeTabType, name: 'Home' },
      { type: allTabType, name: 'All' },
      { type: folderTabType, name: 'Folder' },
      { type: tagTabType, name: 'Tag' },
      { type: uncategorizedTabType, name: 'Uncategorized' },
      { type: untaggedTabType, name: 'Untagged' },
      { type: trashTabType, name: 'Trash' },
      { type: webviewTabType, name: 'Webview' },
      { type: customTabType, name: 'Custom' }
    ]

    let successCount = 0
    for (const { type } of registrations) {
      const result = tabRegistry.register(type)
      if (result.success) {
        successCount++
      }
    }

    if (successCount === registrations.length) {
      isInitialized = true
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}

/**
 * 检查是否已经初始化
 */
export function isTabTypesInitialized(): boolean {
  return isInitialized
}

/**
 * 重置初始化状态（主要用于测试）
 */
export function resetTabTypesInitialization(): void {
  isInitialized = false
  tabRegistry.clear()
}

// 导出所有Tab类型实例
export {
  homeTabType,
  allTabType,
  folderTabType,
  tagTabType,
  uncategorizedTabType,
  untaggedTabType,
  trashTabType,
  webviewTabType,
  customTabType
}

// 导出注册系统
export { tabRegistry } from '../TabRegistry'
export type { TabTypeDefinition, TabContext, TabResult } from '../TabRegistry'
