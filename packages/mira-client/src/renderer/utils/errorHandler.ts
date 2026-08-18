/**
 * 全局错误处理工具
 */

// 错误类型定义
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: number
}

// 错误代码枚举
export enum ErrorCodes {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTH_FAILED = 'AUTH_FAILED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_DOWNLOAD_FAILED = 'FILE_DOWNLOAD_FAILED',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 错误消息映射
const errorMessages: Record<string, string> = {
  [ErrorCodes.NETWORK_ERROR]: '网络连接错误，请检查网络设置',
  [ErrorCodes.CONNECTION_FAILED]: '无法连接到服务器，请检查服务器设置',
  [ErrorCodes.AUTH_FAILED]: '认证失败，请检查用户名和密码',
  [ErrorCodes.FILE_UPLOAD_FAILED]: '文件上传失败，请重试',
  [ErrorCodes.FILE_DOWNLOAD_FAILED]: '文件下载失败，请重试',
  [ErrorCodes.PLUGIN_ERROR]: '插件执行错误',
  [ErrorCodes.VALIDATION_ERROR]: '输入验证失败',
  [ErrorCodes.UNKNOWN_ERROR]: '发生未知错误'
}

/**
 * 创建应用错误
 */
export function createAppError(
  code: ErrorCodes,
  message?: string,
  details?: any
): AppError {
  return {
    code,
    message: message || errorMessages[code] || errorMessages[ErrorCodes.UNKNOWN_ERROR],
    details,
    timestamp: Date.now()
  }
}

/**
 * 解析错误对象
 */
export function parseError(error: any): AppError {
  if (error && typeof error === 'object' && 'code' in error) {
    // 已经是 AppError 格式
    return error as AppError
  }

  if (error instanceof Error) {
    // 标准 Error 对象
    let code = ErrorCodes.UNKNOWN_ERROR
    
    // 根据错误消息推断错误类型
    const message = error.message.toLowerCase()
    if (message.includes('network') || message.includes('fetch')) {
      code = ErrorCodes.NETWORK_ERROR
    } else if (message.includes('connect')) {
      code = ErrorCodes.CONNECTION_FAILED
    } else if (message.includes('auth') || message.includes('login')) {
      code = ErrorCodes.AUTH_FAILED
    }
    
    return createAppError(code, error.message)
  }

  if (typeof error === 'string') {
    // 字符串错误消息
    return createAppError(ErrorCodes.UNKNOWN_ERROR, error)
  }

  // 其他类型的错误
  return createAppError(ErrorCodes.UNKNOWN_ERROR, String(error))
}

/**
 * 格式化错误消息用于显示
 */
export function formatErrorMessage(error: AppError | any): string {
  const appError = parseError(error)
  return appError.message
}

/**
 * 将渲染进程错误上报到主进程 logger。
 * logger 通过 preload 注入，在非 Electron 环境下不可用时静默跳过。
 */
function reportErrorToLogger(message: string, error: any): void {
  try {
    const appError = parseError(error)
    window.electronAPI?.logger?.error('ErrorHandler', message, {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      timestamp: appError.timestamp
    })
  } catch {
    // 日志上报失败不应影响全局错误处理流程。
  }
}

/**
 * 全局错误处理器
 */
export function setupGlobalErrorHandler() {
  // 处理未捕获的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    reportErrorToLogger('Unhandled promise rejection', event.reason)
  })

  // 处理全局 JavaScript 错误
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    reportErrorToLogger('Global error', event.error || event.message)
  })

  // Vue 错误处理在 main.ts 中设置
}

/**
 * 重试工具函数
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError
}

/**
 * 错误边界组件的错误信息
 */
export function getErrorBoundaryMessage(error: any): string {
  const appError = parseError(error)
  
  return `
    应用遇到了一个错误：
    
    错误代码：${appError.code}
    错误信息：${appError.message}
    时间：${new Date(appError.timestamp).toLocaleString()}
    
    请尝试刷新页面或联系技术支持。
  `
}
