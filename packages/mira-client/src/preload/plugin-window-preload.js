/**
 * 插件窗口专用 preload 脚本
 *
 * 加载在 PluginWindowHandlers 创建的独立 BrowserWindow 中（即插件 dist SPA）。
 * 作用：暴露一个最小白名单的 electronAPI，让插件主界面能够
 *   - 再次打开插件窗口（例如自由画板的管理界面里点击工程 → 弹出画布窗口）
 *   - 设置本窗口的专属菜单栏（win.setMenu，Windows/Linux 生效），
 *     并接收菜单点击事件（plugin-window:menu-action）。
 *
 * 与主 preload 的区别：这里只暴露 pluginWindow 的窗口通信与图片传输能力，
 * 不暴露文件系统 / 拖拽 / 插件管理等其它能力，遵循最小权限原则。
 */
const { ipcRenderer, contextBridge } = require('electron')

console.log('🪟 [plugin-window-preload] 已加载')

contextBridge.exposeInMainWorld('electronAPI', {
  pluginWindow: {
    open: (opts) => ipcRenderer.invoke('plugin-window:open', opts),
    close: (windowId) => ipcRenderer.invoke('plugin-window:close', windowId),
    send: (pluginId, entry, channel, data) => ipcRenderer.invoke('plugin-window:send', pluginId, entry, channel, data),
    copyImage: (payload) => ipcRenderer.invoke('plugin-window:copy-image', payload),
    startImageDrag: (payload) => ipcRenderer.send('plugin-window:start-image-drag', payload),
    onMessage: (callback) => {
      const listener = (_event, channel, data) => callback(channel, data)
      ipcRenderer.on('plugin-window:message', listener)
      return () => ipcRenderer.removeListener('plugin-window:message', listener)
    },
    // 设置本窗口菜单栏：传入 Electron 菜单模板（支持 {action, role, type:'separator'...}）。
    setMenu: (template) => ipcRenderer.invoke('plugin-window:set-menu', template),
    // 监听本窗口菜单的点击回调（payload 为模板里带 action 的项，含 action 与任意附加字段）。
    onMenuAction: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('plugin-window:menu-action', listener)
      return () => ipcRenderer.removeListener('plugin-window:menu-action', listener)
    },
  },
})

const appInfo = ipcRenderer.sendSync('plugin-window:mira-app-info') || {}
const callbacks = {
  create: [],
  run: [],
  beforeExit: [],
  show: [],
  hide: [],
  theme: [],
}

function parseSelectedItems() {
  const raw = new URLSearchParams(location.search).get('media') || '[]'
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    try { return JSON.parse(raw) } catch { return [] }
  }
}

function parseArgument(name, fallback = '') {
  const prefix = `--${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  try { return value == null ? fallback : decodeURIComponent(value) } catch { return value || fallback }
}

function on(name, callback) {
  if (typeof callback === 'function') callbacks[name].push(callback)
}

function emit(name, value) {
  return Promise.allSettled(callbacks[name].map((callback) => Promise.resolve().then(() => callback(value))))
}

function invokeWindow(action, ...args) {
  return ipcRenderer.invoke('plugin-window:mira-window', action, ...args)
}

function createClipboardImage(data) {
  const image = data || { size: { width: 0, height: 0 }, png: new Uint8Array(), jpeg: new Uint8Array() }
  return {
    isEmpty: () => !image.png?.length,
    getSize: () => image.size,
    toPNG: () => image.png,
    toJPEG: () => image.jpeg,
    toDataURL: () => `data:image/png;base64,${Buffer.from(image.png || []).toString('base64')}`,
  }
}

const plugin = {
  manifest: {
    id: parseArgument('mira-plugin-id'),
    name: parseArgument('mira-plugin-name', 'Mira Plugin'),
  },
  path: parseArgument('mira-plugin-path'),
}

const mira = {
  app: {
    version: appInfo.version || '',
    build: 0,
    locale: appInfo.locale || 'en',
    arch: appInfo.arch || process.arch,
    platform: appInfo.platform || process.platform,
    isWindows: (appInfo.platform || process.platform) === 'win32',
    isMac: (appInfo.platform || process.platform) === 'darwin',
    runningUnderARM64Translation: false,
    theme: appInfo.theme || 'LIGHT',
    isDarkColors: () => Boolean(appInfo.isDark),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  },
  plugin,
  log: Object.fromEntries(['debug', 'info', 'warn', 'error'].map((level) => [level, (...args) => ipcRenderer.send('plugin-window:mira-log', level, args)])),
  shell: {
    beep: () => ipcRenderer.invoke('plugin-window:mira-shell', 'beep'),
    openExternal: (url) => ipcRenderer.invoke('plugin-window:mira-shell', 'openExternal', url),
    openPath: (path) => ipcRenderer.invoke('plugin-window:mira-shell', 'openPath', path),
    showItemInFolder: (path) => ipcRenderer.invoke('plugin-window:mira-shell', 'showItemInFolder', path),
  },
  network: {
    getProxy: async () => {
      const result = await ipcRenderer.invoke('network:get-proxy')
      return result?.data || { enabled: false, url: '' }
    },
  },
  window: {
    show: () => invokeWindow('show'),
    showInactive: () => invokeWindow('showInactive'),
    hide: () => invokeWindow('hide'),
    focus: () => invokeWindow('focus'),
    minimize: () => invokeWindow('minimize'),
    isMinimized: () => invokeWindow('isMinimized'),
    restore: () => invokeWindow('restore'),
    maximize: () => invokeWindow('maximize'),
    unmaximize: () => invokeWindow('unmaximize'),
    isMaximized: () => invokeWindow('isMaximized'),
    setFullScreen: (flag) => invokeWindow('setFullScreen', Boolean(flag)),
    isFullScreen: () => invokeWindow('isFullScreen'),
    setSize: (width, height) => invokeWindow('setSize', width, height),
    getSize: () => invokeWindow('getSize'),
    setBounds: (bounds) => invokeWindow('setBounds', bounds),
    getBounds: () => invokeWindow('getBounds'),
    setResizable: (flag) => invokeWindow('setResizable', Boolean(flag)),
    isResizable: () => invokeWindow('isResizable'),
    setAlwaysOnTop: (flag) => invokeWindow('setAlwaysOnTop', Boolean(flag)),
    isAlwaysOnTop: () => invokeWindow('isAlwaysOnTop'),
    setPosition: (x, y) => invokeWindow('setPosition', x, y),
    getPosition: () => invokeWindow('getPosition'),
    setOpacity: (opacity) => invokeWindow('setOpacity', opacity),
    getOpacity: () => invokeWindow('getOpacity'),
    flashFrame: (flag) => invokeWindow('flashFrame', Boolean(flag)),
  },
  clipboard: {
    clear: () => ipcRenderer.sendSync('plugin-window:mira-clipboard', 'clear'),
    has: (format) => ipcRenderer.sendSync('plugin-window:mira-clipboard', 'has', format),
    writeText: (text) => ipcRenderer.sendSync('plugin-window:mira-clipboard', 'writeText', text),
    readText: () => ipcRenderer.sendSync('plugin-window:mira-clipboard', 'readText'),
    writeHTML: (html) => ipcRenderer.sendSync('plugin-window:mira-clipboard', 'writeHTML', html),
    readHTML: () => ipcRenderer.sendSync('plugin-window:mira-clipboard', 'readHTML'),
    readImage: () => createClipboardImage(ipcRenderer.sendSync('plugin-window:mira-clipboard', 'readImage')),
  },
  item: {
    getSelected: async () => parseSelectedItems(),
    get: async (options = {}) => options.isSelected ? parseSelectedItems() : [],
    addFromURL: (url, options = {}) => ipcRenderer.invoke('plugin-window:mira-item-add-from-url', url, options),
  },
  onPluginCreate: (callback) => on('create', callback),
  onPluginRun: (callback) => on('run', callback),
  onPluginBeforeExit: (callback) => on('beforeExit', callback),
  onPluginShow: (callback) => on('show', callback),
  onPluginHide: (callback) => on('hide', callback),
  onThemeChanged: (callback) => on('theme', callback),
}

ipcRenderer.on('plugin-window:mira-event', (_event, name, value) => {
  if (callbacks[name]) emit(name, value)
})

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(async () => {
    await emit('create', plugin)
    await emit('run')
  }, 0)
}, { once: true })

contextBridge.exposeInMainWorld('mira', mira)
if (typeof contextBridge.executeInMainWorld === 'function') {
  contextBridge.executeInMainWorld({ func: () => { window.eagle = window.mira } })
} else {
  contextBridge.exposeInMainWorld('eagle', mira)
}

console.log('🪟 [plugin-window-preload] 初始化完成')
