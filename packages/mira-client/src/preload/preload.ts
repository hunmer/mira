import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const isDevelopment = process.env.NODE_ENV === 'development'

// 在渲染进程中暴露安全的 API
const electronAPI: ElectronAPI = {
  process,
  isDevelopment: isDevelopment,
  isProduction: !isDevelopment,
  // IPC 通信
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  
  // 监听主进程事件
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  
  // 移除事件监听
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  // 系统信息
  platform: process.platform,
  
  // 协议处理 API
  protocol: {
    registerHandler: (type: string, handler: string) => 
      ipcRenderer.invoke('protocol:register-handler', type, handler),
    unregisterHandler: (type: string) => 
      ipcRenderer.invoke('protocol:unregister-handler', type),
    getHandlers: () => 
      ipcRenderer.invoke('protocol:get-handlers'),
    createUrl: (type: string, data: any) => 
      ipcRenderer.invoke('protocol:create-url', type, data)
  },

  // 托盘管理 API
  tray: {
    updateSettings: (settings: { enabled?: boolean; clickAction?: 'toggle' | 'show' | 'minimize' }) =>
      ipcRenderer.invoke('tray:update-settings', settings),
    getSettings: () =>
      ipcRenderer.invoke('tray:get-settings'),
    isSupported: () =>
      ipcRenderer.invoke('tray:is-supported'),
    flash: (duration?: number) =>
      ipcRenderer.invoke('tray:flash', duration),
    setTooltip: (tooltip: string) =>
      ipcRenderer.invoke('tray:set-tooltip', tooltip)
  },

  // 搜索窗口管理 API
  searchWindow: {
    show: () =>
      ipcRenderer.invoke('search-window:show'),
    hide: () =>
      ipcRenderer.invoke('search-window:hide'),
    toggle: () =>
      ipcRenderer.invoke('search-window:toggle')
  },

  // 快捷键管理 API
  shortcut: {
    register: (shortcut: string, actionId: string) =>
      ipcRenderer.invoke('shortcut:register', shortcut, actionId),
    unregister: (shortcut: string) =>
      ipcRenderer.invoke('shortcut:unregister', shortcut),
    unregisterAll: () =>
      ipcRenderer.invoke('shortcut:unregister-all'),
    getRegistered: () =>
      ipcRenderer.invoke('shortcut:get-registered')
  },

  // 插件管理 API
  plugin: {
    discover: () =>
      ipcRenderer.invoke('plugin:discover'),
    initialize: (config) =>
      ipcRenderer.invoke('plugin:initialize', config),
    getAll: () =>
      ipcRenderer.invoke('plugin:getAll'),
    get: (pluginId: string) =>
      ipcRenderer.invoke('plugin:get', pluginId),
    enable: (pluginId: string) =>
      ipcRenderer.invoke('plugin:enable', pluginId),
    disable: (pluginId: string) =>
      ipcRenderer.invoke('plugin:disable', pluginId),
    reload: (pluginId: string) =>
      ipcRenderer.invoke('plugin:reload', pluginId),
    execute: (pluginId: string, method: string, ...args: any[]) =>
      ipcRenderer.invoke('plugin:execute', pluginId, method, ...args),
    importFromFile: (targetDirectory: string) =>
      ipcRenderer.invoke('plugin:import-from-file', targetDirectory),
    importFromUrl: (url: string, targetDirectory: string) =>
      ipcRenderer.invoke('plugin:import-from-url', url, targetDirectory),
    uninstall: (pluginId: string, pluginDirectory: string, pluginName: string) =>
      ipcRenderer.invoke('plugin:uninstall', pluginId, pluginDirectory, pluginName),
    selectDirectory: (title?: string) =>
      ipcRenderer.invoke('plugin:select-directory', title),
    selectZipFile: () =>
      ipcRenderer.invoke('plugin:select-zip-file'),
    updateConfig: (config: any) =>
      ipcRenderer.invoke('plugin:update-config', config),
    getConfig: () =>
      ipcRenderer.invoke('plugin:get-config'),
    clearCache: () =>
      ipcRenderer.invoke('plugin:clear-cache')
  },

  // 拖拽功能 API
  dragDrop: {
    startDrag: (filePath: string, iconInfo?: { iconPath?: string; iconType?: string }) =>
      ipcRenderer.invoke('drag-drop:start', filePath, iconInfo),
    startDragMultiple: (filePaths: string[], iconInfo?: { iconPath?: string; iconType?: string }) =>
      ipcRenderer.invoke('drag-drop:start-multiple', filePaths, iconInfo)
  },

  // 文件系统 API
  fs: {
    readFile: (filePath: string, encoding?: BufferEncoding) =>
      ipcRenderer.invoke('fs:readFile', filePath, encoding),
    writeFile: (filePath: string, data: string, encoding?: BufferEncoding) =>
      ipcRenderer.invoke('fs:writeFile', filePath, data, encoding),
    readDir: (dirPath: string) =>
      ipcRenderer.invoke('fs:readDir', dirPath),
    exists: (filePath: string) =>
      ipcRenderer.invoke('fs:exists', filePath),
    selectDirectory: (title?: string) =>
      ipcRenderer.invoke('fs:selectDirectory', title),
    selectFile: (title?: string, filters?: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('fs:selectFile', title, filters),
    mkdir: (dirPath: string, recursive?: boolean) =>
      ipcRenderer.invoke('fs:mkdir', dirPath, recursive),
    copyFile: (src: string, dest: string) =>
      ipcRenderer.invoke('fs:copyFile', src, dest)
  },

  // 自动更新 API
  updater: {
    check: () =>
      ipcRenderer.invoke('updater:check'),
    download: () =>
      ipcRenderer.invoke('updater:download'),
    install: (isSilent?: boolean) =>
      ipcRenderer.invoke('updater:install', isSilent),
    getVersion: () =>
      ipcRenderer.invoke('updater:get-version'),
    onUpdateChecking: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('update:checking', handler)
      return () => ipcRenderer.removeListener('update:checking', handler)
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      const handler = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update:available', handler)
      return () => ipcRenderer.removeListener('update:available', handler)
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      const handler = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update:not-available', handler)
      return () => ipcRenderer.removeListener('update:not-available', handler)
    },
    onUpdateDownloadProgress: (callback: (progress: any) => void) => {
      const handler = (_event: any, progress: any) => callback(progress)
      ipcRenderer.on('update:download-progress', handler)
      return () => ipcRenderer.removeListener('update:download-progress', handler)
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      const handler = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update:downloaded', handler)
      return () => ipcRenderer.removeListener('update:downloaded', handler)
    },
    onUpdateError: (callback: (error: any) => void) => {
      const handler = (_event: any, error: any) => callback(error)
      ipcRenderer.on('update:error', handler)
      return () => ipcRenderer.removeListener('update:error', handler)
    }
  },

  // 应用信息 API
  app: {
    getPath: (name: string) =>
      ipcRenderer.invoke('app:getPath', name),
    getVersion: () =>
      ipcRenderer.invoke('app:getVersion'),
    isPackaged: () =>
      ipcRenderer.invoke('app:isPackaged')
  },

  // 通知 API
  notification: {
    show: (options: { title: string; body?: string; silent?: boolean }) =>
      ipcRenderer.invoke('notification:show', options),
    isSupported: () =>
      ipcRenderer.invoke('notification:is-supported')
  },

  // 兼容性API（用于插件）
  startDrag: (filePath: string, iconInfo?: { iconPath?: string; iconType?: string }) =>
    ipcRenderer.invoke('drag-drop:start', filePath, iconInfo),

  // IPC Renderer 直接访问（用于搜索窗口的postMessage通信）
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    }
  },

  // 日志 API（通过 IPC 发送到主进程写文件）
  logger: {
    log: (...args: any[]) => ipcRenderer.send('renderer-log', 'log', ...args),
    info: (...args: any[]) => ipcRenderer.send('renderer-log', 'info', ...args),
    warn: (...args: any[]) => ipcRenderer.send('renderer-log', 'warn', ...args),
    error: (...args: any[]) => ipcRenderer.send('renderer-log', 'error', ...args),
    debug: (...args: any[]) => ipcRenderer.send('renderer-log', 'debug', ...args)
  },
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
