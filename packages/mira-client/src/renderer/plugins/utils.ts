/**
 * 插件工具函数
 */

import type { OperationResult } from './types'

/**
 * 通用错误处理函数
 */
export const handleError = (err: unknown, defaultMessage: string): string => {
  const errorMessage = err instanceof Error ? err.message : defaultMessage
  console.error(defaultMessage, err)
  return errorMessage
}

/**
 * 将本地文件路径转换为可用的 script src URL
 */
export const convertToScriptUrl = (filePath: string): string => {
  // 网络路径直接返回
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  // 标准化路径分隔符
  let normalizedPath = filePath.replace(/\\/g, '/')

  // 处理不同操作系统的绝对路径格式
  if (normalizedPath.match(/^[a-zA-Z]:/)) {
    // Windows绝对路径：C:/path/to/file
    return `file:///${normalizedPath}`
  } else if (normalizedPath.startsWith('/')) {
    // Unix-like绝对路径：/path/to/file
    return `file://${normalizedPath}`
  } else {
    // 相对路径或其他格式，尝试作为相对于当前工作目录的路径
    console.warn(`⚠️ Non-absolute path detected, this might cause loading issues: ${normalizedPath}`)
    return `file:///${normalizedPath}`
  }
}

/**
 * Resolve a plugin entry file without placing the filename after the URL query.
 * Server plugin directories include an authentication token in the query string.
 */
export const resolvePluginFilePath = (directory: string, fileName: string): string => {
  if (directory.startsWith('http://') || directory.startsWith('https://')) {
    const base = new URL(directory)
    const search = base.search
    base.pathname = base.pathname.replace(/\/+$/, '') + '/'
    base.search = ''
    const resolved = new URL(fileName.replace(/^\/+/, ''), base)
    resolved.search = search
    return resolved.toString()
  }

  return `${directory.replace(/[\\/]$/, '')}/${fileName.replace(/^[/\\]+/, '')}`
}

/**
 * 验证插件文件是否存在（仅在开发模式下）
 */
export const validatePluginFile = async (filePath: string): Promise<boolean> => {
  try {
    // 在Electron环境中，我们可以尝试通过fetch来验证文件是否存在
    const response = await fetch(convertToScriptUrl(filePath))
    return response.ok
  } catch (err) {
    console.warn(`⚠️ Could not validate plugin file: ${filePath}`, err)
    return false // 验证失败不代表文件不存在，可能是权限问题
  }
}

/**
 * 通用操作包装器，提供统一的错误处理和状态管理
 */
export const withOperation = async <T>(
  operationId: string,
  operation: () => Promise<T>,
  errorMessage: string,
  pendingOperations: Set<string>,
  setError: (error: string | null) => void
): Promise<OperationResult & { data?: T }> => {
  pendingOperations.add(operationId)
  setError(null)

  try {
    const data = await operation()
    return { success: true, data }
  } catch (err) {
    const message = handleError(err, errorMessage)
    setError(message)
    return { success: false, message }
  } finally {
    pendingOperations.delete(operationId)
  }
}

/**
 * 清理插件脚本和全局注册
 */
export const cleanupPluginScript = (pluginId: string) => {
  try {
    // 移除插件脚本标签
    const scriptElement = document.querySelector(`script[data-plugin-id="${pluginId}"]`)
    if (scriptElement) {
      scriptElement.remove()
      console.log(`🧹 Removed script for plugin: ${pluginId}`)
    }

    // 从全局插件系统中注销
    if (typeof window !== 'undefined' && (window as any).pluginSystem) {
      (window as any).pluginSystem.plugins.delete(pluginId)
      console.log(`🗑️ Unregistered plugin: ${pluginId}`)
    }
  } catch (err) {
    console.warn(`⚠️ Failed to cleanup plugin script for ${pluginId}:`, err)
  }
}
