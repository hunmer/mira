/**
 * Tab系统快速初始化脚本
 *
 * 在应用启动时调用，确保Tab注册系统正确初始化
 */

import { initializeBuiltInTabTypes } from './tabs'

let isInitialized = false

/**
 * 快速初始化Tab系统
 * 在应用启动时调用，确保内置类型已注册
 */
export function quickInitTabSystem(): boolean {
  if (isInitialized) {
    return true
  }

  try {
    const success = initializeBuiltInTabTypes()

    if (success) {
      isInitialized = true
    }

    return success
  } catch (error) {
    console.error('❌ Tab系统初始化异常:', error)
    return false
  }
}

/**
 * 检查Tab系统是否已初始化
 */
export function isTabSystemInitialized(): boolean {
  return isInitialized
}

// 自动初始化（当模块被导入时）
quickInitTabSystem()