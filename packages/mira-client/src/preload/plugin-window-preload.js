/**
 * 插件窗口专用 preload 脚本
 *
 * 加载在 PluginWindowHandlers 创建的独立 BrowserWindow 中（即插件 dist SPA）。
 * 作用：暴露一个最小白名单的 electronAPI，让插件主界面能够
 *   - 再次打开插件窗口（例如自由画板的管理界面里点击工程 → 弹出画布窗口）
 *
 * 与主 preload 的区别：这里只暴露 pluginWindow.{open,close}，不暴露
 * 文件系统 / 拖拽 / 插件管理等其它能力，遵循最小权限原则。
 */
const { ipcRenderer, contextBridge } = require('electron')

console.log('🪟 [plugin-window-preload] 已加载')

contextBridge.exposeInMainWorld('electronAPI', {
  pluginWindow: {
    open: (opts) => ipcRenderer.invoke('plugin-window:open', opts),
    close: (windowId) => ipcRenderer.invoke('plugin-window:close', windowId),
  },
})

console.log('🪟 [plugin-window-preload] 初始化完成')
