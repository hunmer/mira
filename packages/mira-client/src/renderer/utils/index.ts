// 工具函数统一导出
// 集中管理所有工具模块

import ConfigStorage from './ConfigStorage'

// 现有工具
export * from './errorHandler'
export * from './fileUtils'
export * from './helpers'
export { default as ConfigStorage } from './ConfigStorage'
export * from './theme-style'

// 常用工具函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 类型安全的 localStorage 封装
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set<T>(key: string, value: T): void {
    try {
      ConfigStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  },

  remove(key: string): void {
    ConfigStorage.removeItem(key)
  },

  clear(): void {
    ConfigStorage.clear()
  }
}

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined
const isDevelopment = isElectron && window.electronAPI.isDevelopment
// 环境检测
export const environment = {
  isDevelopment,
  isProduction: !isDevelopment,
  isElectron,
  isMac: typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0,
  isWindows: typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('WIN') >= 0,
  isLinux: typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('LINUX') >= 0
}
